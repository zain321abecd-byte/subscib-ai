import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { WhatsappAgentService, AgentConfig } from './whatsapp-agent.service';
import { WhatsappAgentToolsService } from './whatsapp-agent-tools.service';

@Injectable()
export class WhatsappAgentWorker {
  private readonly logger = new Logger(WhatsappAgentWorker.name);
  private isPolling = false;
  private lastPollStart = 0;

  constructor(
    private readonly agentService: WhatsappAgentService,
    private readonly toolsService: WhatsappAgentToolsService,
  ) {}

  @Interval(4000)
  async poll() {
    const now = Date.now();
    if (this.isPolling) {
      if (now - this.lastPollStart > 30000) {
        this.logger.warn('Previous worker poll timed out (>30s). Force-resetting isPolling lock.');
        this.isPolling = false;
      } else {
        return;
      }
    }
    this.isPolling = true;
    this.lastPollStart = now;

    try {
      const runningAgents = this.agentService.getRunningAgents();
      if (runningAgents.length === 0) return;

      for (const agent of runningAgents) {
        await this.pollAgent(agent);
      }
    } catch (err: any) {
      this.logger.error(`Exception in global worker poll: ${err.message}`);
    } finally {
      this.isPolling = false;
    }
  }

  private async pollAgent(agent: AgentConfig) {
    try {
      const response = await this.agentService.pollAgentUpdates(agent);
      if (!response || !response.messages || response.messages.length === 0) {
        return;
      }

      for (const msg of response.messages) {
        this.logger.log(`[Agent: ${agent.name}] Inbound from ${msg.from}: ${msg.body}`);

        // 1. Send Read Receipt & Typing indicator
        await this.agentService.markAgentRead(agent, msg.id);

        const phone = msg.from;

        // Auto-record active user ID and link with agent
        this.agentService.recordLastActiveUser(agent.id, phone);

        // 2. Security / Whitelist Check for Admin Assistant
        if (agent.role === 'admin_assistant' && !this.agentService.isAdminPhone(agent, phone)) {
          this.logger.warn(`Unauthorized access attempt to admin agent "${agent.name}" from ${phone}`);
          await this.agentService.sendAgentReply(
            agent,
            phone,
            `⛔ *Access Denied*\nYour WhatsApp participant ID (${phone}) is not authorized for Admin Assistant operations. Please add \`${phone}\` to your Admin Phone Whitelist in SubscribAI Admin > WhatsApp Agent > Security & Whitelist.`,
            msg.id,
          );
          continue;
        }

        // 3. Check for Two-Step Confirmation / Cancellation Commands (ACT-XXXX)
        const trimmedText = (msg.body || '').trim();
        const confirmMatch =
          trimmedText.match(/^(?:confirm|yes)\s+(ACT-[A-Z0-9]+)$/i) ||
          trimmedText.match(/^(ACT-[A-Z0-9]+)$/i);
        const cancelMatch = trimmedText.match(/^(?:cancel|no|abort)\s+(ACT-[A-Z0-9]+)$/i);

        if (confirmMatch) {
          const actionId = confirmMatch[1].toUpperCase();
          this.logger.log(`[Agent: ${agent.name}] User ${phone} confirmed action: ${actionId}`);
          const result = await this.toolsService.confirmAction(actionId, phone);
          let replyText = '';
          if (result.success) {
            const detail =
              typeof result.result === 'object' && result.result?.message
                ? result.result.message
                : typeof result.result === 'string'
                  ? result.result
                  : JSON.stringify(result.result);
            replyText = `✅ *Action Confirmed & Executed!*\n\n${detail}`;
          } else {
            replyText = `⚠️ *Action Failed or Expired:*\n${result.error || 'Unknown error'}`;
          }
          await this.agentService.sendAgentReply(agent, phone, replyText, msg.id);
          this.agentService.appendHistory(agent.id, phone, 'user', msg.body);
          this.agentService.appendHistory(agent.id, phone, 'model', replyText);
          continue;
        }

        if (cancelMatch) {
          const actionId = cancelMatch[1].toUpperCase();
          this.logger.log(`[Agent: ${agent.name}] User ${phone} cancelled action: ${actionId}`);
          const cancelled = this.toolsService.cancelAction(actionId, phone);
          const replyText = cancelled
            ? `🚫 *Action Cancelled*\nAction \`${actionId}\` has been discarded.`
            : `⚠️ Action \`${actionId}\` was not found or was already expired.`;
          await this.agentService.sendAgentReply(agent, phone, replyText, msg.id);
          this.agentService.appendHistory(agent.id, phone, 'user', msg.body);
          this.agentService.appendHistory(agent.id, phone, 'model', replyText);
          continue;
        }

        const previousTurns = this.agentService.getHistoryTurns(agent.id, phone);

        // 4. Build Assistant System Prompt with Full Business Tools
        const systemPrompt =
          agent.role === 'admin_assistant'
            ? `You are the SubscribAI Executive AI Assistant on WhatsApp.
You have FULL ACCESS to live store database tools to help the admin automate and manage the entire business:

📊 SALES & REVENUE:
- get_sales_summary: Check sales & revenue stats (periods: today, yesterday, this_week, this_month, all_time)
- list_sales: List or search customer sales records
- record_sale: Add/record a new customer subscription sale
- delete_sale: Soft-delete a sale (moves to audit ledger, requires two-step confirmation)
- list_deleted_sales: View soft-deleted sales audit trail
- restore_sale: Restore a deleted sale back to active ledger (requires confirmation)

📦 ORDERS & FULFILLMENT:
- get_orders_summary: Order count and status breakdown
- list_orders: Search recent web orders by number (#1002), customer, email, status
- update_order_status: Mark order as paid, delivered, or cancelled

🛍️ PRODUCTS & INVENTORY:
- list_products: Check products, pricing, stock availability
- update_product: Update product price or mark in/out of stock

🔔 RENEWALS & CUSTOMERS:
- get_upcoming_renewals: Subscriptions expiring soon (default 7 days)
- search_customer: Customer 360 lookup across sales & orders by name/phone/email

📚 ACCOUNT BOOK (PAYABLES & RECEIVABLES):
- get_account_book_summary: Total payables (owed to vendors) vs receivables (owed by customers) and net balance
- list_payables: List vendor bills / payables
- record_payable: Add a new bill you owe to a vendor/supplier
- update_payable_payment: Record payment made to vendor (requires confirmation)
- list_receivables: List invoices / customer receivables
- record_receivable: Record money a customer owes you
- update_receivable_payment: Record payment collected from customer (requires confirmation)

🎟️ COUPONS & PROMOS:
- list_coupons: View all active/inactive discount codes and usage
- create_coupon: Create new percent or fixed discount code (requires confirmation)
- toggle_coupon: Activate or deactivate a coupon (requires confirmation)

🏢 SUPPLIER STOCK:
- list_stock_items: View supplier inventory, licenses, and accounts
- get_expiring_stock: Supplier stock expiring within N days

📄 REPORTS & EXPORTS:
- generate_report: Generate executive reports (sales_report, renewals_report, account_book_report, inventory_report, profit_loss_report) and email them as formatted documents with CSV attachment!
- export_customers_csv: Export customer database to CSV with instant download link and email attachment
- send_email: Send emails directly to customers or teammates

CRITICAL INSTRUCTIONS:
1. ALWAYS execute tools immediately when requested. When asked for reports or exports, generate them directly!
2. When performing destructive actions (delete sale, coupon creation, recording payments), explain the pending confirmation ID (e.g. ACT-XXXX) to the user and prompt them to reply "CONFIRM ACT-XXXX".
3. Keep responses concise, professional, structured, and friendly.
4. Format for WhatsApp: *bold*, _italic_, \`code\`. Never use markdown # headers or **double asterisks**.
${agent.systemPrompt ? `\nSpecial Instructions: ${agent.systemPrompt}` : ''}`
            : `You are the SubscribAI Customer Support Assistant on WhatsApp.
Help customers with information on AI subscription products, prices, order inquiries, and technical support.
You can look up products with list_products and check orders with list_orders.
Keep responses friendly, helpful, and concise. Use WhatsApp formatting: *bold*, _italic_, \`code\`.
${agent.systemPrompt ? `\nSpecial Instructions: ${agent.systemPrompt}` : ''}`;

        // 5. Sanitize and prepare contents with strict user/model alternation
        const sanitizedContents: any[] = [];
        for (const turn of previousTurns) {
          if (!turn.text || !turn.text.trim()) continue;
          const last = sanitizedContents[sanitizedContents.length - 1];
          if (last && last.role === turn.role) {
            last.parts[0].text += '\n' + turn.text.trim();
          } else {
            sanitizedContents.push({
              role: turn.role,
              parts: [{ text: turn.text.trim() }],
            });
          }
        }
        while (sanitizedContents.length > 0 && sanitizedContents[0].role !== 'user') {
          sanitizedContents.shift();
        }
        const lastSanitized = sanitizedContents[sanitizedContents.length - 1];
        if (lastSanitized && lastSanitized.role === 'user') {
          lastSanitized.parts[0].text += '\n' + (msg.body || '').trim();
        } else {
          sanitizedContents.push({
            role: 'user',
            parts: [{ text: (msg.body || '').trim() }],
          });
        }

        const anthropicConfig = this.agentService.getAnthropicConfigForAgent(agent);
        const geminiKey = this.agentService.getGeminiKeyForAgent(agent);

        if (!anthropicConfig.key && !geminiKey) {
          const keyErr = `No AI API key configured for agent "${agent.name}". Please open SubscribAI Admin > WhatsApp Agent > Edit Agent and set your Claude (MWAPI) or Gemini API key.`;
          this.logger.error(keyErr);
          await this.sendFallback(agent, phone, msg.body, msg.id, keyErr);
          continue;
        }

        let finalAiText = '';
        let lastErrCode: number | null = null;
        let lastErrMessage = '';
        let lastException = '';

        // 6. Try Claude Engine first if selected or if Claude key is present
        const preferClaude = anthropicConfig.provider === 'claude' && Boolean(anthropicConfig.key);

        if (preferClaude) {
          try {
            this.logger.log(`[Agent: ${agent.name}] Calling Claude engine (${anthropicConfig.model}) via ${anthropicConfig.baseUrl}...`);
            const claudeRes = await this.executeClaudeLoop(
              agent,
              systemPrompt,
              previousTurns,
              msg.body,
              anthropicConfig,
              phone,
            );

            if (claudeRes.text && claudeRes.text.trim()) {
              finalAiText = claudeRes.text.trim();
              this.logger.log(`[Agent: ${agent.name}] Claude responded successfully (${finalAiText.length} chars).`);
            } else if (claudeRes.status) {
              lastErrCode = claudeRes.status;
              lastErrMessage = claudeRes.error || '';
              this.logger.warn(`Claude engine returned status ${claudeRes.status} for "${agent.name}".`);
            }
          } catch (claudeErr: any) {
            lastException = claudeErr.message || String(claudeErr);
            this.logger.error(`Exception in Claude engine for "${agent.name}": ${claudeErr.message}`);
          }
        }

        // 7. Fallback to Gemini if Claude was skipped or failed and Gemini key is configured
        if (!finalAiText.trim() && geminiKey) {
          this.logger.log(`[Agent: ${agent.name}] Invoking Gemini engine fallback...`);
          const toolsConfig = [this.toolsService.getToolDeclarations()];
          const CANDIDATE_MODELS = ['gemini-3.6-flash'];

          for (const modelName of CANDIDATE_MODELS) {
            const contents = JSON.parse(JSON.stringify(sanitizedContents));
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
            let iteration = 0;
            const maxIterations = 5;
            let modelSucceeded = false;

            try {
              while (iteration < maxIterations) {
                iteration++;
                const geminiRes = await fetch(geminiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents,
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    tools: toolsConfig,
                  }),
                  signal: AbortSignal.timeout(20000),
                });

                if (!geminiRes.ok) {
                  lastErrCode = geminiRes.status;
                  const errText = await geminiRes.text();
                  try {
                    const parsed = JSON.parse(errText);
                    lastErrMessage = parsed.error?.message || errText;
                  } catch {
                    lastErrMessage = errText;
                  }
                  this.logger.warn(`Gemini [${modelName}] error ${geminiRes.status} for "${agent.name}": ${lastErrMessage}`);
                  break;
                }

                const geminiData = await geminiRes.json();
                const candidate = geminiData.candidates?.[0];
                const content = candidate?.content;
                if (!content || !content.parts) break;

                const functionCallPart = content.parts.find((p: any) => p.functionCall);
                if (functionCallPart && functionCallPart.functionCall) {
                  const call = functionCallPart.functionCall;
                  this.logger.log(`Agent "${agent.name}" calling tool: ${call.name}`);

                  const toolResult = await this.toolsService.executeTool(
                    call.name,
                    call.args || {},
                    { agentId: agent.id, phone },
                  );

                  // Preserve thoughtSignature and id if provided by model
                  const modelTurnParts: any = {
                    functionCall: {
                      name: call.name,
                      args: call.args || {},
                      ...(call.id ? { id: call.id } : {}),
                    },
                  };
                  if (functionCallPart.thoughtSignature) {
                    modelTurnParts.thoughtSignature = functionCallPart.thoughtSignature;
                  }

                  contents.push({
                    role: 'model',
                    parts: [modelTurnParts],
                  });

                  const funcRespPart: any = {
                    functionResponse: {
                      name: call.name,
                      ...(call.id ? { id: call.id } : {}),
                      response: { output: toolResult },
                    },
                  };
                  if (functionCallPart.thoughtSignature) {
                    funcRespPart.thoughtSignature = functionCallPart.thoughtSignature;
                  }

                  contents.push({
                    role: 'user',
                    parts: [funcRespPart],
                  });
                  continue;
                }

                // Extract text parts (excluding thinking/thought tags)
                const textParts = content.parts.filter((p: any) => p.text && !p.thought);
                if (textParts.length > 0) {
                  finalAiText = textParts.map((p: any) => p.text).join('\n');
                } else {
                  const anyText = content.parts.find((p: any) => p.text);
                  if (anyText) finalAiText = anyText.text;
                }

                if (finalAiText.trim()) {
                  modelSucceeded = true;
                  break;
                }
              }
            } catch (modelErr: any) {
              lastException = modelErr.message || String(modelErr);
              this.logger.error(`Exception calling Gemini model ${modelName} for "${agent.name}": ${modelErr.message}`);
            }

            if (modelSucceeded && finalAiText.trim()) {
              break;
            }
          }
        }

        // 8. Error handling fallback to WhatsApp
        if (!finalAiText.trim()) {
          if (lastErrCode === 429) {
            const firstLine = (lastErrMessage || 'Quota exceeded.').split('\n')[0];
            finalAiText = `⚠️ *SubscribAI Assistant Notice: Quota Exceeded (429)*\n${firstLine}\n\n*How to resolve:*\n• Claude AI Gateway is recommended! Go to SubscribAI Admin > *WhatsApp Agent* > *Edit Agent* and enable Claude (MWAPI).\n• Or retry in 1 minute.`;
          } else if (lastErrCode) {
            finalAiText = `⚠️ *AI Service Error (${lastErrCode})*:\n${(lastErrMessage || 'Service unavailable').slice(0, 300)}\n\nPlease verify your API key in Admin > WhatsApp Agent.`;
          } else if (lastException) {
            finalAiText = `⚠️ *Assistant System Notice*:\nTemporary delay: ${lastException.slice(0, 200)}. Please try asking again.`;
          } else {
            finalAiText = `Hello! *SubscribAI Assistant* (${agent.name}) received: "${(msg.body || '').slice(0, 60)}". Please try asking again in a moment.`;
          }
        }

        // 9. Format for WhatsApp
        finalAiText = finalAiText.replace(/^#+\s*(.*)$/gm, '*$1*');
        finalAiText = finalAiText.replace(/\*\*(.*?)\*\*/g, '*$1*');
        finalAiText = finalAiText.replace(/#/g, '');

        if (finalAiText.length > 4000) {
          finalAiText = finalAiText.substring(0, 3997) + '...';
        }

        // 10. Send Reply & Append to History
        try {
          this.logger.log(`[Agent: ${agent.name}] Delivering reply to ${phone} (len=${finalAiText.length})...`);
          await this.agentService.sendAgentReply(agent, phone, finalAiText, msg.id);
          this.agentService.appendHistory(agent.id, phone, 'user', msg.body);
          this.agentService.appendHistory(agent.id, phone, 'model', finalAiText);
          this.logger.log(`[Agent: ${agent.name}] Successfully delivered reply to ${phone}.`);
        } catch (sendErr: any) {
          this.logger.error(`Failed to send reply with context to ${phone} from "${agent.name}": ${sendErr.message}. Trying direct send...`);
          try {
            await this.agentService.sendAgentReply(agent, phone, finalAiText);
            this.agentService.appendHistory(agent.id, phone, 'user', msg.body);
            this.agentService.appendHistory(agent.id, phone, 'model', finalAiText);
            this.logger.log(`[Agent: ${agent.name}] Direct fallback reply delivered to ${phone}.`);
          } catch (retryErr: any) {
            this.logger.error(`Direct fallback reply to ${phone} also failed: ${retryErr.message}`);
          }
        }
      }
    } catch (err: any) {
      if (err.message === 'RATE_LIMIT') {
        this.logger.warn(`Worker pausing for 10s on agent "${agent.name}" due to rate limit.`);
        await new Promise((r) => setTimeout(r, 10000));
      } else {
        this.logger.error(`Exception polling agent "${agent.name}": ${err.message}`);
      }
    }
  }

  private async executeClaudeLoop(
    agent: AgentConfig,
    systemPrompt: string,
    previousTurns: Array<{ role: 'user' | 'model'; text: string }>,
    userMsgBody: string,
    anthropicConfig: { key: string; baseUrl: string; model: string },
    userPhone?: string,
  ): Promise<{ text: string; error?: string; status?: number }> {
    const claudeMessages: any[] = [];

    for (const turn of previousTurns) {
      if (!turn.text || !turn.text.trim()) continue;
      const role = turn.role === 'model' ? 'assistant' : 'user';
      const last = claudeMessages[claudeMessages.length - 1];
      if (last && last.role === role) {
        last.content += '\n' + turn.text.trim();
      } else {
        claudeMessages.push({
          role,
          content: turn.text.trim(),
        });
      }
    }

    while (claudeMessages.length > 0 && claudeMessages[0].role !== 'user') {
      claudeMessages.shift();
    }

    const lastMsg = claudeMessages[claudeMessages.length - 1];
    if (lastMsg && lastMsg.role === 'user') {
      lastMsg.content += '\n' + (userMsgBody || '').trim();
    } else {
      claudeMessages.push({
        role: 'user',
        content: (userMsgBody || '').trim(),
      });
    }

    const tools = this.toolsService.getClaudeTools();
    const endpoint = `${anthropicConfig.baseUrl}/messages`;
    let iteration = 0;
    const maxIterations = 5;

    while (iteration < maxIterations) {
      iteration++;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': anthropicConfig.key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: anthropicConfig.model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: claudeMessages,
          tools,
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (!res.ok) {
        const errText = await res.text();
        this.logger.warn(`Claude [${anthropicConfig.model}] error ${res.status}: ${errText}`);
        return { text: '', error: errText, status: res.status };
      }

      const data = await res.json();
      const contentBlocks: any[] = Array.isArray(data.content) ? data.content : [];

      const toolUseBlocks = contentBlocks.filter((b: any) => b.type === 'tool_use');

      if (toolUseBlocks.length > 0) {
        claudeMessages.push({
          role: 'assistant',
          content: contentBlocks,
        });

        const toolResultBlocks: any[] = [];
        for (const toolUse of toolUseBlocks) {
          this.logger.log(`Claude Agent "${agent.name}" executing tool: ${toolUse.name}`);
          const result = await this.toolsService.executeTool(
            toolUse.name,
            toolUse.input || {},
            { agentId: agent.id, phone: userPhone },
          );
          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: typeof result === 'string' ? result : JSON.stringify(result),
          });
        }

        claudeMessages.push({
          role: 'user',
          content: toolResultBlocks,
        });

        continue;
      }

      const textBlocks = contentBlocks.filter((b: any) => b.type === 'text' && b.text);
      const finalText = textBlocks.map((b: any) => b.text).join('\n').trim();
      return { text: finalText };
    }

    return { text: '' };
  }

  private async sendFallback(agent: AgentConfig, phone: string, text: string, replyToId: string, customError?: string) {
    const fallback = customError
      ? `⚠️ *SubscribAI Assistant (${agent.name}) Notice*:\n${customError}`
      : `Hello! *SubscribAI Assistant* (${agent.name}) received: "${text.slice(0, 50)}". An agent will assist you shortly.`;
    await this.agentService.sendAgentReply(agent, phone, fallback, replyToId);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── PROACTIVE CRON REMINDERS (Milestone 4) ────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  @Cron('0 9 * * *') // Daily at 9:00 AM
  async runDailyBriefingCron() {
    const agents = this.agentService
      .getRunningAgents()
      .filter((a) => a.role === 'admin_assistant' && a.reminders?.dailyBriefingEnabled !== false);

    for (const agent of agents) {
      const target = agent.reminders?.targetPhone || agent.lastActiveUserId || agent.adminPhones?.[0];
      if (!target) continue;

      try {
        this.logger.log(`[Cron: 9 AM] Sending daily briefing to ${target} via "${agent.name}"`);
        const includeSales = agent.reminders?.dailyBriefingIncludeSales !== false;
        const includeOrders = agent.reminders?.dailyBriefingIncludeOrders !== false;
        const includeRenewals = agent.reminders?.dailyBriefingIncludeRenewals !== false;
        const includeStock = Boolean(agent.reminders?.dailyBriefingIncludeStock);

        let body = `☀️ *SubscribAI Morning Executive Briefing*\n\n`;

        if (includeSales) {
          const yesterday = await this.toolsService.executeTool('get_sales_summary', { period: 'yesterday' });
          body += `📅 *Yesterday's Sales & Revenue:*\n` +
            `• Volume: PKR ${(yesterday.totalRevenuePkr || 0).toLocaleString()} | $${yesterday.totalRevenueUsd || 0}\n` +
            `• Subscriptions: ${yesterday.totalSalesCount || 0} active sales\n\n`;
        }

        if (includeOrders) {
          const orders = await this.toolsService.executeTool('get_orders_summary', {});
          body += `📦 *Store Orders Status Breakdown:*\n` +
            `• Pending Fulfillment: *${orders.statusBreakdown?.pending || 0}*\n` +
            `• Paid / In Process: ${orders.statusBreakdown?.paid || 0}\n` +
            `• Completed & Delivered: ${orders.statusBreakdown?.delivered || 0}\n\n`;
        }

        if (includeRenewals) {
          const renewals = await this.toolsService.executeTool('get_upcoming_renewals', { days_ahead: 1 });
          body += `🔔 *Renewals Due Today:* ${renewals.count || 0}\n\n`;
        }

        if (includeStock) {
          const expiringStock = await this.toolsService.executeTool('get_expiring_stock', { days_ahead: 14 });
          body += `🏢 *Supplier Stock Expiring Soon (<14d):* ${expiringStock.count || 0}\n\n`;
        }

        body += `_💡 Reply "send sales report", "check renewals", or any executive command!_`;

        await this.agentService.sendAgentReply(agent, target, body);
      } catch (err: any) {
        this.logger.error(`Error in daily briefing cron for "${agent.name}": ${err.message}`);
      }
    }
  }

  @Cron('0 11 * * *') // Daily at 11:00 AM
  async runRenewalWatchdogCron(isManual = false) {
    const agents = this.agentService
      .getRunningAgents()
      .filter((a) => a.role === 'admin_assistant' && a.reminders?.renewalsWatchdogEnabled !== false);

    for (const agent of agents) {
      const target = agent.reminders?.renewalsPhone || agent.reminders?.targetPhone || agent.lastActiveUserId || agent.adminPhones?.[0];
      if (!target) continue;

      try {
        const daysAhead = agent.reminders?.renewalsDaysAhead || 2;
        const renewals = await this.toolsService.executeTool('get_upcoming_renewals', { days_ahead: daysAhead });

        if (!renewals.count || renewals.count === 0) {
          if (isManual) {
            const text =
              `🔔 *SubscribAI Renewal Watchdog*\n\n` +
              `✅ *All Clear!* No customer subscriptions are expiring within the next ${daysAhead} day${daysAhead > 1 ? 's' : ''}.\n\n` +
              `_Reply "check renewals" or "generate renewals report" anytime._`;
            await this.agentService.sendAgentReply(agent, target, text);
          }
          continue;
        }

        this.logger.log(`[Cron: 11 AM] Sending renewal watchdog (${renewals.count} renewals) to ${target}`);
        const listSnippet = (renewals.expiringSubscriptions || [])
          .slice(0, 6)
          .map((r: any) => `• *${r.customer_name}* (${r.product_name}) — Exp: ${r.expiry_date} [📱 ${r.customer_phone}]`)
          .join('\n');

        const text =
          `🔔 *SubscribAI Renewal Watchdog (Next ${daysAhead} Day${daysAhead > 1 ? 's' : ''})*\n\n` +
          `*${renewals.count} customer subscription(s)* expiring within ${daysAhead * 24} hours:\n\n` +
          `${listSnippet}\n\n` +
          `_Reply "generate renewals report" or ask me to message customers directly._`;

        await this.agentService.sendAgentReply(agent, target, text);
      } catch (err: any) {
        this.logger.error(`Error in renewal watchdog cron for "${agent.name}": ${err.message}`);
      }
    }
  }

  @Cron('0 */4 * * *') // Every 4 hours
  async runStuckOrdersAlertCron(isManual = false) {
    const agents = this.agentService
      .getRunningAgents()
      .filter((a) => a.role === 'admin_assistant' && a.reminders?.stuckOrdersAlertEnabled !== false);

    for (const agent of agents) {
      const target = agent.reminders?.stuckOrdersPhone || agent.reminders?.targetPhone || agent.lastActiveUserId || agent.adminPhones?.[0];
      if (!target) continue;

      try {
        const stuckHours = agent.reminders?.stuckOrdersHours || 4;
        const ordersRes = await this.toolsService.executeTool('list_orders', { status: 'pending', limit: 20 });
        const pendingOrders = ordersRes.orders || [];
        const thresholdMs = Date.now() - stuckHours * 60 * 60 * 1000;
        const stuck = pendingOrders.filter((o: any) => new Date(o.created_at).getTime() < thresholdMs);

        if (stuck.length === 0) {
          if (isManual) {
            const text =
              `📦 *SubscribAI Stuck Orders Check*\n\n` +
              `✅ *All Clear!* No orders have been pending for > ${stuckHours} hour${stuckHours > 1 ? 's' : ''}. Fulfillment is 100% on schedule!`;
            await this.agentService.sendAgentReply(agent, target, text);
          }
          continue;
        }

        this.logger.log(`[Cron: ${stuckHours}h] Sending stuck orders alert (${stuck.length} stuck) to ${target}`);
        const listSnippet = stuck
          .slice(0, 5)
          .map((o: any) => `• Order #${o.order_number} (${o.customer_name || 'Guest'}) — PKR ${o.subtotal_pkr || 0}`)
          .join('\n');

        const text =
          `⚠️ *SubscribAI Stuck Orders Alert*\n\n` +
          `*${stuck.length} order(s)* have been pending for > ${stuckHours} hour${stuckHours > 1 ? 's' : ''}:\n\n` +
          `${listSnippet}\n\n` +
          `_Reply "update order #NUMBER to paid/delivered" to update fulfillment status._`;

        await this.agentService.sendAgentReply(agent, target, text);
      } catch (err: any) {
        this.logger.error(`Error in stuck orders alert cron: ${err.message}`);
      }
    }
  }
}
