import { Injectable, Logger } from "@nestjs/common";
import { isE164, waLink } from "./template.util";

/**
 * WhatsApp sending, with three interchangeable providers so the shop can
 * start using the feature before any API access is approved:
 *
 *   cloud   — WhatsApp Cloud API (Meta Graph). Set WHATSAPP_PHONE_NUMBER_ID +
 *             WHATSAPP_ACCESS_TOKEN. Free-form text only reaches a customer
 *             inside the 24-hour customer-service window; outside it Meta
 *             requires a pre-approved message template, which is why a failed
 *             send is logged with Meta's own error text instead of being
 *             swallowed.
 *   custom  — Any third-party WhatsApp gateway that accepts a JSON POST
 *             (WATI, UltraMsg, 360dialog, an in-house bridge…). Configure
 *             WHATSAPP_CUSTOM_URL and the payload keys below.
 *   manual  — No API. The message is rendered and logged as `pending` and the
 *             admin gets a wa.me link to fire it from WhatsApp Web. This is
 *             the default when nothing else is configured, so the feature is
 *             still a big win over typing each message by hand.
 */

export type WhatsappProvider = "cloud" | "custom" | "manual";

export interface WhatsappStatus {
  provider: WhatsappProvider;
  configured: boolean;
  /** Business number / phone-number-id the messages go out from. */
  from: string;
  /** Human-readable reason the provider isn't usable, when configured=false. */
  detail?: string;
}

export interface WhatsappSendResult {
  ok: boolean;
  provider: WhatsappProvider;
  messageId?: string | null;
  /** Set for the manual provider — the admin still has to press send. */
  manualLink?: string;
  error?: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  /** Resolved provider: explicit env wins, otherwise inferred from credentials. */
  provider(): WhatsappProvider {
    const explicit = (process.env.WHATSAPP_PROVIDER || "").trim().toLowerCase();
    if (explicit === "cloud" || explicit === "custom" || explicit === "manual") return explicit;
    if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) return "cloud";
    if (process.env.WHATSAPP_CUSTOM_URL) return "custom";
    return "manual";
  }

  status(): WhatsappStatus {
    const provider = this.provider();
    if (provider === "cloud") {
      const id = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
      const token = process.env.WHATSAPP_ACCESS_TOKEN || "";
      return {
        provider,
        configured: Boolean(id && token),
        from: process.env.WHATSAPP_BUSINESS_NUMBER || id,
        detail: id && token ? undefined : "Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.",
      };
    }
    if (provider === "custom") {
      const url = process.env.WHATSAPP_CUSTOM_URL || "";
      return {
        provider,
        configured: Boolean(url),
        from: process.env.WHATSAPP_BUSINESS_NUMBER || "",
        detail: url ? undefined : "Set WHATSAPP_CUSTOM_URL.",
      };
    }
    return {
      provider: "manual",
      configured: false,
      from: process.env.WHATSAPP_BUSINESS_NUMBER || "",
      detail: "No WhatsApp API configured — messages are prepared for WhatsApp Web instead of sent automatically.",
    };
  }

  /**
   * Send a plain-text WhatsApp message. Never throws: the caller logs the
   * outcome either way, and a failed WhatsApp send must not roll back the
   * delivery record.
   */
  async sendText(input: { to: string; body: string }): Promise<WhatsappSendResult> {
    const provider = this.provider();
    const to = input.to.trim();

    if (!isE164(to)) {
      return { ok: false, provider, error: `Phone number is not valid E.164: ${to}` };
    }
    if (!input.body.trim()) {
      return { ok: false, provider, error: "Message body is empty." };
    }

    if (provider === "manual") {
      return { ok: false, provider, manualLink: waLink(to, input.body) };
    }

    try {
      return provider === "cloud"
        ? await this.sendViaCloud(to, input.body)
        : await this.sendViaCustom(to, input.body);
    } catch (err) {
      const message = err instanceof Error ? err.message : "WhatsApp send failed.";
      this.logger.error(`WhatsApp send failed (${provider}) to ${to}: ${message}`);
      return { ok: false, provider, error: message, manualLink: waLink(to, input.body) };
    }
  }

  /** Meta Graph API: POST /{version}/{phone-number-id}/messages */
  private async sendViaCloud(to: string, body: string): Promise<WhatsappSendResult> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!phoneNumberId || !token) {
      return { ok: false, provider: "cloud", error: "WhatsApp Cloud API is not configured.", manualLink: waLink(to, body) };
    }
    const base = (process.env.WHATSAPP_GRAPH_URL || "https://graph.facebook.com").replace(/\/+$/, "");
    const version = process.env.WHATSAPP_API_VERSION || "v21.0";

    const res = await fetch(`${base}/${version}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body },
      }),
    });

    const payload = await res.json().catch(() => ({}) as any);
    if (!res.ok) {
      // Meta's error shape: { error: { message, type, code, error_subcode } }
      const detail = payload?.error?.message || payload?.message || `HTTP ${res.status}`;
      return { ok: false, provider: "cloud", error: `WhatsApp Cloud API: ${detail}`, manualLink: waLink(to, body) };
    }
    const messageId = payload?.messages?.[0]?.id ?? null;
    return { ok: true, provider: "cloud", messageId };
  }

  /**
   * Generic gateway. The field names are configurable because every provider
   * spells them differently:
   *   WHATSAPP_CUSTOM_TO_FIELD   (default "to")
   *   WHATSAPP_CUSTOM_BODY_FIELD (default "message")
   *   WHATSAPP_CUSTOM_EXTRA      JSON object merged into the payload,
   *                              e.g. {"instance_id":"123","priority":1}
   */
  private async sendViaCustom(to: string, body: string): Promise<WhatsappSendResult> {
    const url = process.env.WHATSAPP_CUSTOM_URL;
    if (!url) {
      return { ok: false, provider: "custom", error: "WHATSAPP_CUSTOM_URL is not set.", manualLink: waLink(to, body) };
    }
    const toField = process.env.WHATSAPP_CUSTOM_TO_FIELD || "to";
    const bodyField = process.env.WHATSAPP_CUSTOM_BODY_FIELD || "message";

    let extra: Record<string, unknown> = {};
    if (process.env.WHATSAPP_CUSTOM_EXTRA) {
      try {
        const parsed = JSON.parse(process.env.WHATSAPP_CUSTOM_EXTRA);
        if (parsed && typeof parsed === "object") extra = parsed as Record<string, unknown>;
      } catch {
        this.logger.warn("WHATSAPP_CUSTOM_EXTRA is not valid JSON — ignoring it.");
      }
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.WHATSAPP_CUSTOM_TOKEN) {
      const header = process.env.WHATSAPP_CUSTOM_TOKEN_HEADER || "Authorization";
      headers[header] = header.toLowerCase() === "authorization"
        ? `Bearer ${process.env.WHATSAPP_CUSTOM_TOKEN}`
        : process.env.WHATSAPP_CUSTOM_TOKEN;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...extra, [toField]: to, [bodyField]: body }),
    });

    const text = await res.text();
    let payload: any = {};
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }

    if (!res.ok) {
      const detail = payload?.error || payload?.message || payload?.raw || `HTTP ${res.status}`;
      return {
        ok: false,
        provider: "custom",
        error: `WhatsApp gateway: ${typeof detail === "string" ? detail.slice(0, 300) : JSON.stringify(detail).slice(0, 300)}`,
        manualLink: waLink(to, body),
      };
    }
    const messageId = payload?.id || payload?.messageId || payload?.message_id || null;
    return { ok: true, provider: "custom", messageId };
  }
}
