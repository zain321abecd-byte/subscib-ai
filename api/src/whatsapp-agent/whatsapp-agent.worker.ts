import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { WhatsappAgentService, AgentConfig } from './whatsapp-agent.service';
import { WhatsappAgentToolsService } from './whatsapp-agent-tools.service';

@Injectable()
export class WhatsappAgentWorker {
  private readonly logger = new Logger(WhatsappAgentWorker.name);
  private isPolling = false;

  constructor(
    private readonly agentService: WhatsappAgentService,
    private readonly toolsService: WhatsappAgentToolsService,
  ) {}

  @Interval(4000)
  async poll() {
    if (this.isPolling) return;
    this.isPolling = true;

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
- Send emails directly to customers, teammates, or yourself (send_email)

ALWAYS use the provided tools whenever asked for data or when instructed to add/update anything or send an email.
Keep responses concise, professional, and friendly.
Use WhatsApp formatting: *bold*, _italic_, \`code\`. Never use markdown # headings or **double asterisks**.
${agent.systemPrompt ? `\nSpecial Instructions: ${agent.systemPrompt}` : ''}`
            : `You are the SubscribAI Customer Support Assistant on WhatsApp.
Help customers with information on AI subscription products, prices, order inquiries, and technical support.
You can look up products with list_products and check orders with list_orders.
Keep responses friendly, helpful, and concise. Use WhatsApp formatting: *bold*, _italic_, \`code\`.
${agent.systemPrompt ? `\nSpecial Instructions: ${agent.systemPrompt}` : ''}`;

        // 3. Prepare Gemini Contents & Tools
        const contents: any[] = previousTurns.map((t) => ({
          role: t.role,
          parts: [{ text: t.text }],
        }));
        contents.push({
          role: 'user',
          parts: [{ text: msg.body }],
        });

        const geminiKey = this.agentService.getGeminiKeyForAgent(agent);
        if (!geminiKey) {
          this.logger.error(`No Gemini API key available for agent "${agent.name}".`);
          await this.sendFallback(agent, phone, msg.body, msg.id);
          continue;
        }

        const toolsConfig = [this.toolsService.getToolDeclarations()];
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`;

        // 4. Multi-turn Tool Calling Execution Loop
        let finalAiText = '';
        let iteration = 0;
        const maxIterations = 4;

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
            });

            if (!geminiRes.ok) {
              const errText = await geminiRes.text();
              this.logger.error(`Gemini API error for "${agent.name}": ${geminiRes.status} ${errText}`);
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

              // Feed function call and result back into contents
              contents.push(content);
              contents.push({
                role: 'user',
                parts: [
                  {
                    functionResponse: {
                      name: call.name,
                      response: { output: toolResult },
                    },
                  },
                ],
              });
              // Continue loop to let Gemini generate answer with tool result
              continue;
            }

            // Normal text answer returned
            const textPart = content.parts.find((p: any) => p.text);
            if (textPart && textPart.text) {
              finalAiText = textPart.text;
            }
            break;
          }
        } catch (gemErr: any) {
          this.logger.error(`Exception during Gemini loop for "${agent.name}": ${gemErr.message}`);
        }

        // 5. Fallback if AI returned empty
        if (!finalAiText.trim()) {
          finalAiText = `Hello! *SubscribAI Assistant* here. We received your message: "${msg.body.slice(0, 50)}". How can we assist you with our AI subscription services today?`;
        }

        // 6. Format for WhatsApp
        finalAiText = finalAiText.replace(/^#+\s*(.*)$/gm, '*$1*');
        finalAiText = finalAiText.replace(/\*\*(.*?)\*\*/g, '*$1*');
        finalAiText = finalAiText.replace(/#/g, '');

        if (finalAiText.length > 4000) {
          finalAiText = finalAiText.substring(0, 3997) + '...';
        }

        // 7. Send Reply & Append to History
        try {
          await this.agentService.sendAgentReply(agent, phone, finalAiText, msg.id);
          this.agentService.appendHistory(agent.id, phone, 'user', msg.body);
          this.agentService.appendHistory(agent.id, phone, 'model', finalAiText);
        } catch (sendErr: any) {
          this.logger.error(`Failed to send reply to ${phone} from "${agent.name}": ${sendErr.message}`);
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

  private async sendFallback(agent: AgentConfig, phone: string, text: string, replyToId: string) {
    const fallback = `Hello! *SubscribAI Assistant* (${agent.name}) received: "${text.slice(0, 50)}". An agent will assist you shortly.`;
    await this.agentService.sendAgentReply(agent, phone, fallback, replyToId);
  }
}
