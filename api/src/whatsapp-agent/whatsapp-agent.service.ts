import { Injectable, Logger } from '@nestjs/common';

export interface WhatsappAgentUpdate {
  id: string;
  from: string;
  body: string;
}

export interface WhatsappAgentPollResponse {
  messages: WhatsappAgentUpdate[];
  next_offset: number;
}

@Injectable()
export class WhatsappAgentService {
  private readonly logger = new Logger(WhatsappAgentService.name);
  private readonly baseUrl = 'https://api.whatsapp.com/agent/v1';

  private getHeaders(): Record<string, string> {
    const key = process.env.WHATSAPP_AGENT_KEY;
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
    const key = process.env.WHATSAPP_AGENT_KEY;
    return {
      configured: !!key,
      enabled: process.env.WHATSAPP_AGENT_ENABLED === 'true',
    };
  }
}
