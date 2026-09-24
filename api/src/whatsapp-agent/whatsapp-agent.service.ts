import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';

export interface WhatsappAgentUpdate {
  id: string;
  from: string;
  body: string;
}

export interface WhatsappAgentPollResponse {
  messages: WhatsappAgentUpdate[];
  next_offset: number;
}

export interface ConversationTurn {
  role: 'user' | 'model';
  text: string;
}

export interface AgentReminderConfig {
  dailyBriefingEnabled?: boolean;
  renewalsWatchdogEnabled?: boolean;
  stuckOrdersAlertEnabled?: boolean;
  targetPhone?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  whatsappKey: string;
  geminiKey?: string;
  aiProvider?: 'claude' | 'gemini';
  anthropicKey?: string;
  anthropicBaseUrl?: string;
  anthropicModel?: string;
  role: 'admin_assistant' | 'customer_support';
  adminPhones?: string[];
  reminders?: AgentReminderConfig;
  systemPrompt?: string;
  enabled: boolean;
}

export interface AgentRuntimeStatus {
  id: string;
  name: string;
  role: 'admin_assistant' | 'customer_support';
  hasWhatsappKey: boolean;
  maskedWhatsappKey: string;
  whatsappKey?: string;
  hasGeminiKey: boolean;
  maskedGeminiKey: string;
  geminiKey?: string;
  aiProvider?: 'claude' | 'gemini';
  hasAnthropicKey: boolean;
  maskedAnthropicKey: string;
  anthropicKey?: string;
  anthropicBaseUrl?: string;
  anthropicModel?: string;
  adminPhones?: string[];
  adminPhonesStr?: string;
  reminders?: AgentReminderConfig;
  systemPrompt?: string;
  enabled: boolean;
  workerRunning: boolean;
  activeChatsCount: number;
}

function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET || process.env.INTERNAL_API_TOKEN || 'subscribai-agent-secret-salt';
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptSecret(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let enc = cipher.update(text, 'utf8', 'hex');
    enc += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return `enc:${iv.toString('hex')}:${tag}:${enc}`;
  } catch {
    return text;
  }
}

function decryptSecret(payload: string): string {
  try {
    if (!payload || !payload.startsWith('enc:')) return payload;
    const parts = payload.split(':');
    if (parts.length !== 4) return payload;
    const [, ivHex, tagHex, encHex] = parts;
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let dec = decipher.update(encHex, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch {
    return payload;
  }
}

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

@Injectable()
export class WhatsappAgentService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappAgentService.name);
  private readonly baseUrl = 'https://api.whatsapp.com/agent/v1';

  private globalGeminiKey: string | null = null;
  private agents = new Map<string, AgentConfig>();
  private runningAgents = new Set<string>();
  private nextOffsets = new Map<string, number>();
  private agentHistories = new Map<string, Map<string, ConversationTurn[]>>();

  constructor(private readonly supabase: SupabaseService) {}

  async onModuleInit() {
    await this.loadPersistedAgents();
  }

  private async loadPersistedAgents() {
    try {
      const { data, error } = await this.supabase
        .admin()
        .from('site_settings')
        .select('key, value')
        .in('key', [
          '_sec_whatsapp_agent_key',
          '_sec_gemini_api_key',
          '_sec_whatsapp_agents_list',
        ]);

      let legacyWaKey = (process.env.WHATSAPP_AGENT_KEY || '').trim();
      let legacyGemKey = (process.env.GEMINI_API_KEY || '').trim();

      if (!error && data) {
        for (const row of data) {
          if (row.key === '_sec_whatsapp_agent_key' && row.value) {
            const dec = decryptSecret(row.value);
            if (dec) legacyWaKey = dec;
          }
          if (row.key === '_sec_gemini_api_key' && row.value) {
            const dec = decryptSecret(row.value);
            if (dec) {
              legacyGemKey = dec;
              this.globalGeminiKey = dec;
              process.env.GEMINI_API_KEY = dec;
            }
          }
          if (row.key === '_sec_whatsapp_agents_list' && row.value) {
            const dec = decryptSecret(row.value);
            try {
              const parsed: AgentConfig[] = JSON.parse(dec);
              if (Array.isArray(parsed)) {
                for (const ag of parsed) {
                  this.agents.set(ag.id, ag);
                  if (ag.enabled) {
                    this.runningAgents.add(ag.id);
                  }
                }
              }
            } catch {
              this.logger.warn('Could not parse _sec_whatsapp_agents_list JSON');
            }
          }
        }
      }

      // If no agents were in the list, but we have a legacy key, migrate it into a default agent
      if (this.agents.size === 0 && legacyWaKey) {
        const defaultAgent: AgentConfig = {
          id: 'default',
          name: 'Primary Business Assistant',
          whatsappKey: legacyWaKey,
          geminiKey: legacyGemKey,
          role: 'admin_assistant',
          systemPrompt: '',
          enabled: true,
        };
        this.agents.set('default', defaultAgent);
        this.runningAgents.add('default');
        await this.persistAgents();
      }

      this.logger.log(`Loaded ${this.agents.size} WhatsApp agent(s). Running: ${this.runningAgents.size}`);
    } catch (err: any) {
      this.logger.warn(`Could not load persisted agents: ${err.message}`);
    }
  }

  private async persistAgents() {
    try {
      const list = Array.from(this.agents.values());
      const encrypted = encryptSecret(JSON.stringify(list));
      await this.supabase
        .admin()
        .from('site_settings')
        .upsert(
          { key: '_sec_whatsapp_agents_list', value: encrypted },
          { onConflict: 'key' },
        );
    } catch (err: any) {
      this.logger.error(`Failed to persist agents: ${err.message}`);
    }
  }

  // ── Multi-Agent Management ──────────────────────────────────────────────

  listAgents(): AgentRuntimeStatus[] {
    return Array.from(this.agents.values()).map((ag) => {
      const histMap = this.agentHistories.get(ag.id);
      const activeChatsCount = histMap ? histMap.size : 0;
      const gemKey = ag.geminiKey || this.globalGeminiKey || process.env.GEMINI_API_KEY || '';
      const anthKey = ag.anthropicKey || process.env.ANTHROPIC_API_KEY || '';
      const anthBaseUrl = ag.anthropicBaseUrl || process.env.ANTHROPIC_BASE_URL || 'https://api.mwapi.dev/v1';
      const anthModel = ag.anthropicModel || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
      const aiProvider = ag.aiProvider || (anthKey ? 'claude' : 'gemini');
      const adminPhones = ag.adminPhones || [];

      return {
        id: ag.id,
        name: ag.name,
        role: ag.role,
        hasWhatsappKey: Boolean(ag.whatsappKey),
        maskedWhatsappKey: maskKey(ag.whatsappKey),
        whatsappKey: ag.whatsappKey,
        hasGeminiKey: Boolean(gemKey),
        maskedGeminiKey: maskKey(gemKey),
        geminiKey: gemKey,
        aiProvider,
        hasAnthropicKey: Boolean(anthKey),
        maskedAnthropicKey: maskKey(anthKey),
        anthropicKey: anthKey,
        anthropicBaseUrl: anthBaseUrl,
        anthropicModel: anthModel,
        adminPhones,
        adminPhonesStr: adminPhones.join(', '),
        reminders: ag.reminders || {
          dailyBriefingEnabled: true,
          renewalsWatchdogEnabled: true,
          stuckOrdersAlertEnabled: true,
        },
        systemPrompt: ag.systemPrompt,
        enabled: ag.enabled,
        workerRunning: this.runningAgents.has(ag.id),
        activeChatsCount,
      };
    });
  }

  getAgent(id: string): AgentConfig | undefined {
    return this.agents.get(id);
  }

  isAdminPhone(agent: AgentConfig, phone: string): boolean {
    if (agent.role !== 'admin_assistant') return false;
    if (!agent.adminPhones || agent.adminPhones.length === 0) {
      // If whitelist is not configured, permit all for backwards compatibility
      return true;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return agent.adminPhones.some((p) => {
      const cleanAdmin = p.replace(/[^0-9]/g, '');
      return cleanAdmin.length >= 7 && (cleanPhone.endsWith(cleanAdmin) || cleanAdmin.endsWith(cleanPhone));
    });
  }

  async saveAgent(input: {
    id?: string;
    name: string;
    whatsappKey: string;
    geminiKey?: string;
    aiProvider?: 'claude' | 'gemini';
    anthropicKey?: string;
    anthropicBaseUrl?: string;
    anthropicModel?: string;
    role?: 'admin_assistant' | 'customer_support';
    adminPhones?: string[] | string;
    reminders?: AgentReminderConfig;
    systemPrompt?: string;
    enabled?: boolean;
  }): Promise<AgentRuntimeStatus> {
    const id = input.id || `agent_${Date.now()}`;
    const existing = this.agents.get(id);

    const whatsappKey = input.whatsappKey?.trim() || existing?.whatsappKey || '';
    if (!whatsappKey) {
      throw new Error('WhatsApp Agent API Key is required.');
    }

    const geminiKey = input.geminiKey !== undefined ? input.geminiKey.trim() : existing?.geminiKey;
    if (geminiKey) {
      this.globalGeminiKey = geminiKey;
      process.env.GEMINI_API_KEY = geminiKey;
    }

    const anthropicKey = input.anthropicKey !== undefined ? input.anthropicKey.trim() : existing?.anthropicKey;
    const anthropicBaseUrl = input.anthropicBaseUrl !== undefined ? input.anthropicBaseUrl.trim() : existing?.anthropicBaseUrl;
    const anthropicModel = input.anthropicModel !== undefined ? input.anthropicModel.trim() : existing?.anthropicModel;
    const aiProvider = input.aiProvider || existing?.aiProvider || (anthropicKey || process.env.ANTHROPIC_API_KEY ? 'claude' : 'gemini');

    let adminPhones: string[] | undefined = existing?.adminPhones;
    if (input.adminPhones !== undefined) {
      if (Array.isArray(input.adminPhones)) {
        adminPhones = input.adminPhones.map((p) => p.trim()).filter(Boolean);
      } else if (typeof input.adminPhones === 'string') {
        adminPhones = input.adminPhones
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
      }
    }

    const reminders: AgentReminderConfig = {
      ...(existing?.reminders || {
        dailyBriefingEnabled: true,
        renewalsWatchdogEnabled: true,
        stuckOrdersAlertEnabled: true,
      }),
      ...(input.reminders || {}),
    };

    const config: AgentConfig = {
      id,
      name: input.name?.trim() || existing?.name || 'WhatsApp Assistant',
      whatsappKey,
      geminiKey: geminiKey || undefined,
      aiProvider,
      anthropicKey: anthropicKey || undefined,
      anthropicBaseUrl: anthropicBaseUrl || undefined,
      anthropicModel: anthropicModel || undefined,
      role: input.role || existing?.role || 'admin_assistant',
      adminPhones,
      reminders,
      systemPrompt: input.systemPrompt !== undefined ? input.systemPrompt : existing?.systemPrompt,
      enabled: input.enabled !== undefined ? input.enabled : (existing ? existing.enabled : true),
    };

    this.agents.set(id, config);
    if (config.enabled) {
      this.runningAgents.add(id);
    } else {
      this.runningAgents.delete(id);
    }

    await this.persistAgents();

    // Also update legacy key if it is the default agent
    if (id === 'default' || this.agents.size === 1) {
      process.env.WHATSAPP_AGENT_KEY = whatsappKey;
      await this.supabase.admin().from('site_settings').upsert({
        key: '_sec_whatsapp_agent_key',
        value: encryptSecret(whatsappKey),
      }, { onConflict: 'key' });
    }

    this.logger.log(`Saved agent "${config.name}" (${config.id}) [AI: ${config.aiProvider}]. Running: ${this.runningAgents.has(id)}`);

    const histMap = this.agentHistories.get(id);
    const resolvedGemKey = config.geminiKey || this.globalGeminiKey || process.env.GEMINI_API_KEY || '';
    const resolvedAnthKey = config.anthropicKey || process.env.ANTHROPIC_API_KEY || '';

    return {
      id: config.id,
      name: config.name,
      role: config.role,
      hasWhatsappKey: true,
      maskedWhatsappKey: maskKey(config.whatsappKey),
      whatsappKey: config.whatsappKey,
      hasGeminiKey: Boolean(resolvedGemKey),
      maskedGeminiKey: maskKey(resolvedGemKey),
      geminiKey: resolvedGemKey,
      aiProvider: config.aiProvider,
      hasAnthropicKey: Boolean(resolvedAnthKey),
      maskedAnthropicKey: maskKey(resolvedAnthKey),
      anthropicKey: resolvedAnthKey,
      anthropicBaseUrl: config.anthropicBaseUrl || process.env.ANTHROPIC_BASE_URL || 'https://api.mwapi.dev/v1',
      anthropicModel: config.anthropicModel || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      adminPhones: config.adminPhones || [],
      adminPhonesStr: (config.adminPhones || []).join(', '),
      reminders: config.reminders,
      systemPrompt: config.systemPrompt,
      enabled: config.enabled,
      workerRunning: this.runningAgents.has(id),
      activeChatsCount: histMap ? histMap.size : 0,
    };
  }

  async deleteAgent(id: string): Promise<boolean> {
    if (!this.agents.has(id)) return false;
    this.runningAgents.delete(id);
    this.agents.delete(id);
    this.agentHistories.delete(id);
    this.nextOffsets.delete(id);
    await this.persistAgents();
    this.logger.log(`Deleted agent ${id}.`);
    return true;
  }

  startAgent(id: string): boolean {
    const ag = this.agents.get(id);
    if (!ag) throw new Error(`Agent ${id} does not exist.`);
    if (!ag.whatsappKey) throw new Error(`Agent ${ag.name} has no WhatsApp API key.`);
    ag.enabled = true;
    this.runningAgents.add(id);
    this.persistAgents().catch(() => null);
    this.logger.log(`Agent ${ag.name} (${id}) started.`);
    return true;
  }

  stopAgent(id: string): boolean {
    const ag = this.agents.get(id);
    if (!ag) throw new Error(`Agent ${id} does not exist.`);
    ag.enabled = false;
    this.runningAgents.delete(id);
    this.persistAgents().catch(() => null);
    this.logger.log(`Agent ${ag.name} (${id}) stopped.`);
    return true;
  }

  getRunningAgents(): AgentConfig[] {
    return Array.from(this.runningAgents)
      .map((id) => this.agents.get(id))
      .filter((ag): ag is AgentConfig => Boolean(ag));
  }

  // ── Conversation History ──────────────────────────────────────────────────

  getAgentHistory(agentId: string): Record<string, ConversationTurn[]> {
    const map = this.agentHistories.get(agentId);
    if (!map) return {};
    const res: Record<string, ConversationTurn[]> = {};
    for (const [phone, turns] of map.entries()) {
      res[phone] = turns;
    }
    return res;
  }

  getHistoryTurns(agentId: string, phone: string): ConversationTurn[] {
    let map = this.agentHistories.get(agentId);
    if (!map) {
      map = new Map();
      this.agentHistories.set(agentId, map);
    }
    return map.get(phone) || [];
  }

  appendHistory(agentId: string, phone: string, role: 'user' | 'model', text: string) {
    let map = this.agentHistories.get(agentId);
    if (!map) {
      map = new Map();
      this.agentHistories.set(agentId, map);
    }
    let turns = map.get(phone) || [];
    turns.push({ role, text });
    if (turns.length > 20) {
      turns = turns.slice(turns.length - 20);
    }
    map.set(phone, turns);
  }

  // ── API Calls for specific Agent ──────────────────────────────────────────

  getGeminiKeyForAgent(agent: AgentConfig): string {
    return (agent.geminiKey || this.globalGeminiKey || process.env.GEMINI_API_KEY || '').trim();
  }

  getAnthropicConfigForAgent(agent: AgentConfig): {
    provider: 'claude' | 'gemini';
    key: string;
    baseUrl: string;
    model: string;
  } {
    const key = (agent.anthropicKey || process.env.ANTHROPIC_API_KEY || '').trim();
    const baseUrl = (agent.anthropicBaseUrl || process.env.ANTHROPIC_BASE_URL || 'https://api.mwapi.dev/v1').trim().replace(/\/+$/, '');
    const model = (agent.anthropicModel || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6').trim();
    const provider = agent.aiProvider || (key ? 'claude' : 'gemini');
    return { provider, key, baseUrl, model };
  }

  async pollAgentUpdates(agent: AgentConfig): Promise<WhatsappAgentPollResponse | null> {
    const offset = this.nextOffsets.get(agent.id);
    try {
      const url = new URL(`${this.baseUrl}/updates`);
      url.searchParams.set('limit', '50');
      url.searchParams.set('timeout', '15');
      if (offset !== undefined) {
        url.searchParams.set('offset', offset.toString());
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${agent.whatsappKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(20000),
      });

      if (response.status === 204) return null;
      if (response.status === 409) {
        this.logger.warn(`Another poller running for agent "${agent.name}" (409).`);
        return null;
      }
      if (response.status === 429) {
        this.logger.warn(`Rate limit for agent "${agent.name}" (429).`);
        throw new Error('RATE_LIMIT');
      }
      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`Error polling updates for "${agent.name}": ${response.status} ${text}`);
        throw new Error(`Poll failed with status ${response.status}`);
      }

      const data = await response.json();
      const messages: WhatsappAgentUpdate[] = [];
      const entries = Array.isArray(data.entry) ? data.entry : [];
      for (const entry of entries) {
        const changes = Array.isArray(entry.changes) ? entry.changes : [];
        for (const change of changes) {
          const msgs = Array.isArray(change?.value?.messages) ? change.value.messages : [];
          for (const msg of msgs) {
            if (msg.type === 'text' && msg.text?.body) {
              messages.push({
                id: msg.id,
                from: msg.from,
                body: msg.text.body,
              });
            }
          }
        }
      }

      const newOffset = data.next_offset || offset;
      if (newOffset !== undefined) {
        this.nextOffsets.set(agent.id, newOffset);
      }

      return { messages, next_offset: newOffset || 0 };
    } catch (err: any) {
      if (err.message !== 'RATE_LIMIT') {
        this.logger.error(`Exception polling agent "${agent.name}": ${err.message}`);
      }
      throw err;
    }
  }

  async sendAgentReply(agent: AgentConfig, to: string, body: string, replyToId?: string): Promise<void> {
    let finalBody = body;
    if (finalBody.length > 4096) {
      finalBody = finalBody.substring(0, 4093) + '...';
    }

    let retry = 0;
    while (retry < 3) {
      try {
        const payload: any = {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: finalBody },
        };
        // Attach context on first attempt only; if WhatsApp fails due to expired context, retry sends clean
        if (replyToId && retry === 0) {
          payload.context = { message_id: replyToId };
        }

        const response = await fetch(`${this.baseUrl}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${agent.whatsappKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        });

        if (response.status === 429) {
          await new Promise((r) => setTimeout(r, 2000 * (retry + 1)));
          retry++;
          continue;
        }

        if (!response.ok) {
          const text = await response.text();
          this.logger.error(`Error sending reply from "${agent.name}": ${response.status} ${text}`);
          retry++;
          if (retry < 3) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          throw new Error(`Reply failed with status ${response.status}`);
        }

        this.logger.log(`Successfully sent reply from "${agent.name}" to ${to}`);
        return;
      } catch (err: any) {
        if (retry >= 2) {
          this.logger.error(`Exception in sendAgentReply ("${agent.name}"): ${err.message}`);
          throw err;
        }
        retry++;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  async markAgentRead(agent: AgentConfig, messageId: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/statuses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${agent.whatsappKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
          typing_indicator: { type: 'text' },
        }),
      });
    } catch (err: any) {
      this.logger.error(`Exception in markAgentRead: ${err.message}`);
    }
  }

  // ── Backwards Compatibility Helpers ─────────────────────────────────────

  status() {
    const list = this.listAgents();
    const primary = list[0];
    const anyRunning = this.runningAgents.size > 0;

    return {
      configured: list.length > 0 && Boolean(primary?.hasWhatsappKey),
      hasWhatsappKey: Boolean(primary?.hasWhatsappKey),
      maskedWhatsappKey: primary?.maskedWhatsappKey || null,
      hasGeminiKey: Boolean(primary?.hasGeminiKey),
      maskedGeminiKey: primary?.maskedGeminiKey || null,
      enabled: anyRunning,
      workerRunning: anyRunning,
      totalAgents: list.length,
      runningAgentsCount: this.runningAgents.size,
      agents: list,
    };
  }

  async setKeys(input: { whatsappAgentKey?: string; geminiApiKey?: string }) {
    if (input.whatsappAgentKey) {
      await this.saveAgent({
        id: 'default',
        name: 'Primary Business Assistant',
        whatsappKey: input.whatsappAgentKey,
        geminiKey: input.geminiApiKey,
        enabled: true,
      });
    } else if (input.geminiApiKey) {
      this.globalGeminiKey = input.geminiApiKey;
      process.env.GEMINI_API_KEY = input.geminiApiKey;
      await this.supabase.admin().from('site_settings').upsert({
        key: '_sec_gemini_api_key',
        value: encryptSecret(input.geminiApiKey),
      }, { onConflict: 'key' });
    }
  }
}
