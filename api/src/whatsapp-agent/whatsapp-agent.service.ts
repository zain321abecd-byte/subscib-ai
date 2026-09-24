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

  private whatsappAgentKey: string | null = null;
  private geminiApiKey: string | null = null;

  constructor(private readonly supabase: SupabaseService) {}

  async onModuleInit() {
    await this.loadPersistedKeys();
  }

  private async loadPersistedKeys() {
    try {
      const { data, error } = await this.supabase
        .admin()
        .from('site_settings')
        .select('key, value')
        .in('key', ['_sec_whatsapp_agent_key', '_sec_gemini_api_key']);

      if (!error && data) {
        for (const row of data) {
          if (row.key === '_sec_whatsapp_agent_key' && row.value) {
            const dec = decryptSecret(row.value);
            if (dec) {
              this.whatsappAgentKey = dec;
              process.env.WHATSAPP_AGENT_KEY = dec;
            }
          }
          if (row.key === '_sec_gemini_api_key' && row.value) {
            const dec = decryptSecret(row.value);
            if (dec) {
              this.geminiApiKey = dec;
              process.env.GEMINI_API_KEY = dec;
            }
          }
        }
        if (this.whatsappAgentKey) {
          this.logger.log('WhatsApp Agent key loaded from persistent settings.');
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not load persisted agent keys: ${err.message}`);
    }
  }

  getWhatsappKey(): string {
    return (this.whatsappAgentKey || process.env.WHATSAPP_AGENT_KEY || '').trim();
  }

  getGeminiKey(): string {
    return (this.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
  }

  async setKeys(input: { whatsappAgentKey?: string; geminiApiKey?: string }) {
    if (input.whatsappAgentKey !== undefined) {
      const clean = (input.whatsappAgentKey || '').trim();
      this.whatsappAgentKey = clean || null;
      if (clean) process.env.WHATSAPP_AGENT_KEY = clean;
      else delete process.env.WHATSAPP_AGENT_KEY;

      await this.supabase
        .admin()
        .from('site_settings')
        .upsert(
          {
            key: '_sec_whatsapp_agent_key',
            value: clean ? encryptSecret(clean) : '',
          },
          { onConflict: 'key' },
        );
    }

    if (input.geminiApiKey !== undefined) {
      const clean = (input.geminiApiKey || '').trim();
      this.geminiApiKey = clean || null;
      if (clean) process.env.GEMINI_API_KEY = clean;
      else delete process.env.GEMINI_API_KEY;

      await this.supabase
        .admin()
        .from('site_settings')
        .upsert(
          {
            key: '_sec_gemini_api_key',
            value: clean ? encryptSecret(clean) : '',
          },
          { onConflict: 'key' },
        );
    }

    this.logger.log('WhatsApp Agent credentials updated from admin request.');
  }

  private getHeaders(): Record<string, string> {
    const key = this.getWhatsappKey();
    if (!key) {
      throw new Error('WHATSAPP_AGENT_KEY is not set');
    }
    return {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    };
  }

  async pollUpdates(offset?: number): Promise<WhatsappAgentPollResponse | null> {
    try {
      const url = new URL(`${this.baseUrl}/updates`);
      url.searchParams.set('limit', '50');
      url.searchParams.set('timeout', '15');
      if (offset !== undefined) {
        url.searchParams.set('offset', offset.toString());
      }

      const response = await fetch(url.toString(), {
        headers: this.getHeaders(),
      });

      if (response.status === 204) {
        return null; // no updates
      }
      
      if (response.status === 409) {
        this.logger.warn('Another poller is currently running (409).');
        return null;
      }
      
      if (response.status === 429) {
        this.logger.warn('Rate limited while polling updates (429).');
        throw new Error('RATE_LIMIT');
      }

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`Error polling updates: ${response.status} ${text}`);
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

      return {
        messages,
        next_offset: data.next_offset || (offset ?? 0),
      };
    } catch (error: any) {
      if (error.message !== 'RATE_LIMIT') {
        this.logger.error(`Exception in pollUpdates: ${error.message}`);
      }
      throw error;
    }
  }

  async sendReply(to: string, body: string, replyToId: string): Promise<void> {
    let finalBody = body;
    if (finalBody.length > 4096) {
      finalBody = finalBody.substring(0, 4093) + '...';
    }

    let retry = 0;
    while (retry < 3) {
      try {
        const response = await fetch(`${this.baseUrl}/messages`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: finalBody },
            context: { message_id: replyToId },
          }),
        });

        if (response.status === 429) {
          this.logger.warn(`Rate limited sending reply to ${to}. Retrying in 2s...`);
          await new Promise((r) => setTimeout(r, 2000 * (retry + 1)));
          retry++;
          continue;
        }

        if (!response.ok) {
          const text = await response.text();
          this.logger.error(`Error sending reply: ${response.status} ${text}`);
          throw new Error(`Reply failed with status ${response.status}`);
        }

        this.logger.log(`Successfully sent reply to ${to}`);
        return;
      } catch (error: any) {
        this.logger.error(`Exception in sendReply: ${error.message}`);
        throw error;
      }
    }
    this.logger.error(`Failed to send reply to ${to} after retries.`);
  }

  async markRead(messageId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/statuses`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
          typing_indicator: { type: 'text' },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`Error marking message ${messageId} read: ${response.status} ${text}`);
      }
    } catch (error: any) {
      this.logger.error(`Exception in markRead: ${error.message}`);
    }
  }

  status() {
    const waKey = this.getWhatsappKey();
    const gemKey = this.getGeminiKey();
    return {
      configured: Boolean(waKey),
      hasWhatsappKey: Boolean(waKey),
      maskedWhatsappKey: waKey ? maskKey(waKey) : null,
      hasGeminiKey: Boolean(gemKey),
      maskedGeminiKey: gemKey ? maskKey(gemKey) : null,
      enabled: process.env.WHATSAPP_AGENT_ENABLED === 'true',
    };
  }
}
