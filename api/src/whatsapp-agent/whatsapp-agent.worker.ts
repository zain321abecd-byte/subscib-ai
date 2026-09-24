import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { WhatsappAgentService } from './whatsapp-agent.service';

interface ConversationTurn {
  role: 'user' | 'model';
  text: string;
}

@Injectable()
export class WhatsappAgentWorker implements OnModuleInit {
  private readonly logger = new Logger(WhatsappAgentWorker.name);
  private isRunning = false;
  private isPolling = false;
  private nextOffset: number | undefined = undefined;
  
  private readonly history = new Map<string, ConversationTurn[]>();

  constructor(private readonly agentService: WhatsappAgentService) {}

  onModuleInit() {
    const enabled = process.env.WHATSAPP_AGENT_ENABLED === 'true';
    if (enabled) {
      this.start();
    } else {
      this.logger.log('WhatsApp Agent is disabled by WHATSAPP_AGENT_ENABLED. Skipping.');
    }
  }

  start() {
    if (this.isRunning) return;
    const waKey = this.agentService.getWhatsappKey();
    if (!waKey) {
      throw new Error('WhatsApp Agent Key is not configured. Please add the key first.');
    }
    this.isRunning = true;
    this.logger.log('WhatsApp Agent worker started.');
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.logger.log('WhatsApp Agent worker stopped.');
  }

  getIsRunning() {
    return this.isRunning;
  }

  getHistory() {
    const hist: Record<string, any[]> = {};
    for (const [key, value] of this.history.entries()) {
      hist[key] = value;
    }
    return hist;
  }

  private appendHistory(phone: string, role: 'user' | 'model', text: string) {
    let turns = this.history.get(phone) || [];
    turns.push({ role, text });
    if (turns.length > 20) {
      turns = turns.slice(turns.length - 20);
    }
    this.history.set(phone, turns);
  }

  @Interval(4000)
  async poll() {
    if (!this.isRunning || this.isPolling) {
      return;
    }
    
    this.isPolling = true;

    try {
      const response = await this.agentService.pollUpdates(this.nextOffset);
      if (!response) {
        this.isPolling = false;
        return;
      }

      this.nextOffset = response.next_offset;

      for (const msg of response.messages) {
        this.logger.log(`Received message from ${msg.from}: ${msg.body}`);
        
        await this.agentService.markRead(msg.id);

        const phone = msg.from;
        const previousTurns = this.history.get(phone) || [];

        const systemPrompt = `You are the SubscribAI customer support assistant on WhatsApp. You help customers with:
- Information about our AI subscription products and pricing
- Order status inquiries
- Account and billing questions
- Technical support for AI tools

Keep responses concise and friendly. Use WhatsApp formatting: *bold*, _italic_, \`code\`.
Never use markdown headers (#) or **double asterisks** — convert those to *single asterisks*.
Maximum response length: 4000 characters.
If you don't know something specific about an order, ask the customer for their order number or email.`;

        const contents = previousTurns.map(t => ({
          role: t.role,
          parts: [{ text: t.text }]
        }));
        
        contents.push({
          role: 'user',
          parts: [{ text: msg.body }]
        });

        const geminiKey = this.agentService.getGeminiKey();
        if (!geminiKey) {
          this.logger.error('GEMINI_API_KEY is not set. Cannot generate reply.');
          continue;
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        
        try {
          const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: systemPrompt }] }
            })
          });

          if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            this.logger.error(`Gemini API error: ${geminiRes.status} ${errText}`);
            continue;
          }

          const geminiData = await geminiRes.json();
          let aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

          aiText = aiText.replace(/\*\*/g, '*');
          aiText = aiText.replace(/#/g, '');
          
          if (aiText.length > 4000) {
            aiText = aiText.substring(0, 3997) + '...';
          }

          await this.agentService.sendReply(phone, aiText, msg.id);

          this.appendHistory(phone, 'user', msg.body);
          this.appendHistory(phone, 'model', aiText);

        } catch (geminiErr: any) {
          this.logger.error(`Exception calling Gemini: ${geminiErr.message}`);
        }
      }
    } catch (error: any) {
      if (error.message === 'RATE_LIMIT') {
        this.logger.warn('Worker pausing for 10s due to rate limit.');
        await new Promise(r => setTimeout(r, 10000));
      } else {
        this.logger.error(`Exception in worker poll: ${error.message}`);
      }
    } finally {
      this.isPolling = false;
    }
  }
}
