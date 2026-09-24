import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
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
        const previousTurns = this.agentService.getHistoryTurns(agent.id, phone);

        // 2. Build Assistant System Prompt
        const systemPrompt =
          agent.role === 'admin_assistant'
            ? `You are the SubscribAI Executive AI Assistant on WhatsApp.
You have FULL ACCESS to live store database tools to help the admin run the business:
- Check sales statistics & revenue (get_sales_summary)
- List or search customer sales records (list_sales)
- Add/record new subscription sales (record_sale)
- Check order stats and breakdown (get_orders_summary)
- Search & list recent orders (list_orders)
- Update order statuses to paid/delivered/cancelled (update_order_status)
- Check products and inventory pricing (list_products)
- Update product prices or in-stock status (update_product)
- Check upcoming customer subscription renewals (get_upcoming_renewals)
- Look up customer history across orders & sales (search_customer)
- Export customer & sales database to a CSV file (export_customers_csv) - generates a direct download link and emails the .csv attachment!
- Send emails directly to customers, teammates, or yourself (send_email)

ALWAYS use the provided tools whenever asked for data, when instructed to add/update anything, send an email, or export a CSV.
When the user asks for a CSV (e.g. "send me a csv of all customers"): IMMEDIATELY call export_customers_csv. Never say you cannot attach files or ask for confirmation—execute it and provide the direct download link and email status!
Keep responses concise, professional, and friendly.
Use WhatsApp formatting: *bold*, _italic_, \`code\`. Never use markdown # headings or **double asterisks**.
${agent.systemPrompt ? `\nSpecial Instructions: ${agent.systemPrompt}` : ''}`
            : `You are the SubscribAI Customer Support Assistant on WhatsApp.
Help customers with information on AI subscription products, prices, order inquiries, and technical support.
You can look up products with list_products and check orders with list_orders.
Keep responses friendly, helpful, and concise. Use WhatsApp formatting: *bold*, _italic_, \`code\`.
${agent.systemPrompt ? `\nSpecial Instructions: ${agent.systemPrompt}` : ''}`;

        // 3. Sanitize and prepare contents with strict user/model alternation
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

        const geminiKey = this.agentService.getGeminiKeyForAgent(agent);
        if (!geminiKey) {
          const keyErr = `Gemini API key is not configured for agent "${agent.name}". Please open SubscribAI Admin > WhatsApp Agent > Edit Agent and set your Gemini API key.`;
          this.logger.error(keyErr);
          await this.sendFallback(agent, phone, msg.body, msg.id, keyErr);
          continue;
        }

        const toolsConfig = [this.toolsService.getToolDeclarations()];
        // gemini-3.6-flash is the active, supported model
        const CANDIDATE_MODELS = ['gemini-3.6-flash'];

        let finalAiText = '';
        let lastErrCode: number | null = null;
        let lastErrMessage = '';
        let lastException = '';

        // 4. Execution Loop
        for (const modelName of CANDIDATE_MODELS) {
          const contents = JSON.parse(JSON.stringify(sanitizedContents));
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
          let iteration = 0;
          const maxIterations = 4;
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

                const toolResult = await this.toolsService.executeTool(call.name, call.args || {});

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
            this.logger.error(`Exception calling model ${modelName} for "${agent.name}": ${modelErr.message}`);
          }

          if (modelSucceeded && finalAiText.trim()) {
            break;
          }
        }

        // 5. If AI returned empty, return relevant and informative error directly to WhatsApp
        if (!finalAiText.trim()) {
          if (lastErrCode === 429) {
            const firstLine = (lastErrMessage || 'Quota exceeded.').split('\n')[0];
            finalAiText = `⚠️ *SubscribAI Assistant Notice: Quota Exceeded (429)*\n${firstLine}\n\n*How to resolve:*\n• Please retry your request in 1 minute.\n• Or enter a Gemini API key with billing enabled in SubscribAI Admin > *WhatsApp Agent* > *Edit Agent*.`;
          } else if (lastErrCode) {
            finalAiText = `⚠️ *AI Service Error (${lastErrCode})*:\n${(lastErrMessage || 'Service unavailable').slice(0, 300)}\n\nPlease verify your API key in Admin > WhatsApp Agent.`;
          } else if (lastException) {
            finalAiText = `⚠️ *Assistant System Notice*:\nTemporary delay: ${lastException.slice(0, 200)}. Please try asking again.`;
          } else {
            finalAiText = `Hello! *SubscribAI Assistant* (${agent.name}) received: "${(msg.body || '').slice(0, 60)}". Please try asking again in a moment.`;
          }
        }

        // 6. Format for WhatsApp
        finalAiText = finalAiText.replace(/^#+\s*(.*)$/gm, '*$1*');
        finalAiText = finalAiText.replace(/\*\*(.*?)\*\*/g, '*$1*');
        finalAiText = finalAiText.replace(/#/g, '');

        if (finalAiText.length > 4000) {
          finalAiText = finalAiText.substring(0, 3997) + '...';
        }

        // 7. Send Reply & Append to History (Guaranteed Delivery)
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

  private async sendFallback(agent: AgentConfig, phone: string, text: string, replyToId: string, customError?: string) {
    const fallback = customError
      ? `⚠️ *SubscribAI Assistant (${agent.name}) Notice*:\n${customError}`
      : `Hello! *SubscribAI Assistant* (${agent.name}) received: "${text.slice(0, 50)}". An agent will assist you shortly.`;
    await this.agentService.sendAgentReply(agent, phone, fallback, replyToId);
  }
}
