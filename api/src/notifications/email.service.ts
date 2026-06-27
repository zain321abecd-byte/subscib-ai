import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { SupabaseService } from "../supabase/supabase.service";

type SendEmailInput = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  emailType?: string;
  relatedOrderId?: string | null;
};

type OrderEmail = {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string | null;
  items: Array<{ name: string; qty: number; price: number; variation?: { summary?: string } }>;
  subtotal_usd: number | string | null;
  subtotal_pkr: number | string | null;
  status: string;
  payment_method: string | null;
};

const BRAND = "SubscribAI";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeEmailHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function layout(title: string, body: string, contactEmail: string) {
  return `<!doctype html>
<html>
<body style="margin:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(title)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:24px 28px;background:#0f172a;color:#ffffff;">
          <div style="font-size:22px;font-weight:800;letter-spacing:.2px;">${BRAND}</div>
          <div style="font-size:13px;color:#cbd5e1;margin-top:4px;">Premium AI subscriptions delivered fast</div>
        </td></tr>
        <tr><td style="padding:28px;">${body}</td></tr>
        <tr><td style="padding:18px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.6;">
          Need help? Reply to this email or contact <a href="mailto:${escapeHtml(contactEmail)}" style="color:#2563eb;">${escapeHtml(contactEmail)}</a>.<br>
          &copy; ${new Date().getFullYear()} ${BRAND}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly supabase: SupabaseService) {}

  private getTransporter() {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;

    if (!host || !user || !pass) {
      const missing = [
        !host && "SMTP_HOST",
        !user && "SMTP_USER",
        !pass && "SMTP_PASS",
      ].filter(Boolean).join(", ");
      this.logger.error(`SMTP not configured — missing: ${missing}`);
      throw new Error(`SMTP email is not configured. Missing: ${missing}.`);
    }

    this.logger.log(
      `Creating SMTP transporter host=${host} port=${port} secure=${secure} user=${user} passLen=${pass.length}`,
    );

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 30_000,
      greetingTimeout: 30_000,
      socketTimeout: 30_000,
    });

    // Verify in the background so we surface config errors on boot instead
    // of on the first real send. Failure is logged but non-fatal.
    this.transporter.verify().then(
      () => this.logger.log(`SMTP transporter verified — ready to send.`),
      (err: unknown) => {
        const e = err as { code?: string; command?: string; response?: string; message?: string };
        this.logger.error(
          `SMTP transporter verify FAILED  code=${e?.code || "?"}  command=${e?.command || "?"}  response="${(e?.response || "").slice(0, 200)}"  message="${(e?.message || "").slice(0, 200)}"`,
        );
      },
    );

    return this.transporter;
  }

  private async settings() {
    const { data } = await this.supabase.admin().from("site_settings").select("key,value").in("key", ["contact_email", "whatsapp_number"]);
    const map = new Map<string, string>();
    for (const row of data ?? []) map.set(row.key, typeof row.value === "string" ? row.value : String(row.value ?? "").replace(/^"|"$/g, ""));
    return {
      contactEmail: map.get("contact_email") || process.env.EMAIL_REPLY_TO || "contact@subscribai.com",
      whatsapp: map.get("whatsapp_number") || "",
      siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").replace(/\/+$/, ""),
    };
  }

  status() {
    const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || "";
    return {
      provider: "smtp",
      configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && from),
      from,
      replyTo: process.env.EMAIL_REPLY_TO || "",
    };
  }

  async sendEmail({ to, subject, text, html, replyTo, emailType = "transactional", relatedOrderId = null }: SendEmailInput) {
    const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!from) {
      this.logger.error("EMAIL_FROM / SMTP_FROM / SMTP_USER all empty — cannot determine 'from' address.");
      throw new Error("EMAIL_FROM, SMTP_FROM, or SMTP_USER must be configured before sending email.");
    }

    let logId: string | null = null;
    try {
      const { data } = await this.supabase.admin().from("email_logs").insert({
        email_type: emailType,
        recipient_email: to,
        subject,
        status: "pending",
        provider: "smtp",
        related_order_id: relatedOrderId,
      }).select("id").maybeSingle();
      logId = data?.id ?? null;
    } catch (logErr) {
      this.logger.warn(`email_logs insert failed (non-fatal): ${(logErr as Error).message}`);
    }

    this.logger.log(
      `sendEmail → to=${to} from="${from}" subject="${subject}" type=${emailType} logId=${logId || "-"}`,
    );

    try {
      const result = await this.getTransporter().sendMail({
        from,
        to,
        subject,
        text: text || stripHtml(html || ""),
        html,
        replyTo: replyTo || process.env.EMAIL_REPLY_TO || undefined,
      });
      this.logger.log(
        `sendEmail OK → to=${to} messageId=${result.messageId || "?"} accepted=${(result.accepted || []).join(",")} rejected=${(result.rejected || []).join(",")} response="${(result.response || "").slice(0, 160)}"`,
      );
      if (logId) {
        await this.supabase.admin().from("email_logs").update({
          status: "sent",
          provider_message_id: String(result.messageId || ""),
          sent_at: new Date().toISOString(),
        }).eq("id", logId);
      }
      return result;
    } catch (err) {
      const e = err as { code?: string; command?: string; response?: string; responseCode?: number; message?: string };
      this.logger.error(
        `sendEmail FAILED → to=${to}  code=${e?.code || "?"}  responseCode=${e?.responseCode ?? "?"}  command=${e?.command || "?"}  response="${(e?.response || "").slice(0, 200)}"  message="${(e?.message || "").slice(0, 200)}"`,
      );
      if (logId) {
        await this.supabase.admin().from("email_logs").update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Email send failed",
        }).eq("id", logId);
      }
      throw err;
    }
  }

  /**
   * Email-verification email sent right after signup. Contains a one-time link
   * that hits the frontend /auth/confirm page, which in turn calls
   * GET /auth/verify?token=... on the backend.
   */
  async sendVerificationEmail({ to, name, token }: { to: string; name?: string | null; token: string }) {
    const s = await this.settings();
    const displayName = name?.trim() || "there";
    const siteUrl = s.siteUrl || "https://subscribai.com";
    const verifyUrl = `${siteUrl}/auth/confirm?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;
    const subject = "Verify your SubscribAI email";

    const html = layout(subject, `
      <h1 style="margin:0 0 12px;font-size:24px;color:#111827;">One quick step, ${escapeHtml(displayName)}</h1>
      <p style="margin:0 0 18px;line-height:1.7;color:#374151;">
        Welcome to ${BRAND}! Please confirm your email so we can keep your account secure and send you order updates.
      </p>
      <p style="margin:0 0 26px;">
        <a href="${escapeHtml(verifyUrl)}" style="display:inline-block;background:#FF7A1A;color:#fff;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:700;letter-spacing:.2px;">
          Verify my email →
        </a>
      </p>
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Or paste this link into your browser:</p>
      <p style="margin:0 0 18px;font-size:12px;color:#6b7280;word-break:break-all;">
        <a href="${escapeHtml(verifyUrl)}" style="color:#2563eb;">${escapeHtml(verifyUrl)}</a>
      </p>
      <p style="margin:0;line-height:1.7;color:#374151;font-size:13px;">
        If you didn't sign up for SubscribAI you can safely ignore this email — the link will expire on its own.
      </p>
    `, s.contactEmail);

    const text = [
      `Welcome to SubscribAI, ${displayName}.`,
      "",
      "Please verify your email by opening this link:",
      verifyUrl,
      "",
      "If you didn't sign up you can ignore this email.",
      "",
      `Need help? ${s.contactEmail}`,
    ].join("\n");

    return this.sendEmail({ to, subject, html, text, emailType: "verification" });
  }

  async sendWelcomeEmail({ to, name }: { to: string; name?: string | null }) {
    const s = await this.settings();
    const displayName = name?.trim() || "there";
    const subject = "Welcome to SubscribAI";
    const html = layout(subject, `
      <h1 style="margin:0 0 12px;font-size:24px;color:#111827;">Welcome, ${escapeHtml(displayName)}.</h1>
      <p style="margin:0 0 14px;line-height:1.7;color:#374151;">Thanks for joining ${BRAND}. We help you get premium AI subscriptions, creator tools, and automation packs without the usual setup friction.</p>
      <p style="margin:0 0 22px;line-height:1.7;color:#374151;">Whenever you are ready, visit the website or message support and we will help you pick the right plan.</p>
      <p style="margin:0;"><a href="${escapeHtml(s.siteUrl || "https://subscribai.com")}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">Visit SubscribAI</a></p>
    `, s.contactEmail);
    const text = `Welcome to SubscribAI, ${displayName}.\n\nThanks for joining. Visit ${s.siteUrl || "SubscribAI"} or contact ${s.contactEmail} for support.`;
    return this.sendEmail({ to, subject, html, text, emailType: "welcome" });
  }

  async sendOrderConfirmationEmail({ order }: { order: OrderEmail }) {
    const existing = await this.supabase.admin()
      .from("email_logs")
      .select("id")
      .eq("email_type", "order_confirmation")
      .eq("related_order_id", order.id)
      .eq("status", "sent")
      .maybeSingle();
    if (existing.data) return { skipped: true };

    const s = await this.settings();
    const items = Array.isArray(order.items) ? order.items : [];
    const total = order.subtotal_pkr ? `Rs ${Number(order.subtotal_pkr).toLocaleString("en-PK")}` : `$${Number(order.subtotal_usd || 0).toFixed(2)}`;
    const subject = `Order Confirmation - #${order.order_number}`;
    const itemRows = items.map((item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
          <strong>${escapeHtml(item.name)}</strong>
          ${item.variation?.summary ? `<div style="font-size:12px;color:#6b7280;">${escapeHtml(item.variation.summary)}</div>` : ""}
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid #e5e7eb;">${Number(item.qty || 1)}</td>
      </tr>`).join("");
    const html = layout(subject, `
      <h1 style="margin:0 0 12px;font-size:24px;color:#111827;">Order received</h1>
      <p style="margin:0 0 18px;line-height:1.7;color:#374151;">Hi ${escapeHtml(order.customer_name || "there")}, we received your order and it is currently <strong>${escapeHtml(order.status)}</strong>.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;">
        <tr><td style="color:#6b7280;">Order number</td><td align="right"><strong>#${escapeHtml(order.order_number)}</strong></td></tr>
        <tr><td style="color:#6b7280;padding-top:8px;">Payment method</td><td align="right" style="padding-top:8px;">${escapeHtml(order.payment_method || "Pending confirmation")}</td></tr>
        <tr><td style="color:#6b7280;padding-top:8px;">Total</td><td align="right" style="padding-top:8px;"><strong>${escapeHtml(total)}</strong></td></tr>
      </table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${itemRows}</table>
      <p style="margin:18px 0 0;line-height:1.7;color:#374151;">If your payment is manual or still processing, our team will confirm it shortly. Support: ${escapeHtml(s.contactEmail)}${s.whatsapp ? ` / WhatsApp ${escapeHtml(s.whatsapp)}` : ""}.</p>
    `, s.contactEmail);
    const text = [
      `Order Confirmation - #${order.order_number}`,
      `Hi ${order.customer_name || "there"}, we received your order.`,
      `Status: ${order.status}`,
      `Payment method: ${order.payment_method || "Pending confirmation"}`,
      `Total: ${total}`,
      "",
      "Items:",
      ...items.map((item) => `- ${item.name} x ${item.qty || 1}${item.variation?.summary ? ` (${item.variation.summary})` : ""}`),
      "",
      `Support: ${s.contactEmail}${s.whatsapp ? ` / WhatsApp ${s.whatsapp}` : ""}`,
    ].join("\n");
    return this.sendEmail({ to: order.customer_email, subject, html, text, emailType: "order_confirmation", relatedOrderId: order.id });
  }

  async sendPromotionEmail({ to, subject, messageHtml, messageText }: { to: string; subject: string; messageHtml: string; messageText?: string }) {
    const s = await this.settings();
    const unsubscribe = `${process.env.PAYFAST_PUBLIC_API_URL || process.env.API_URL || ""}/emails/unsubscribe?email=${encodeURIComponent(to)}`;
    const safeBody = sanitizeEmailHtml(messageHtml || `<p>${escapeHtml(messageText || "")}</p>`);
    const html = layout(subject, `
      ${safeBody}
      <p style="margin:24px 0 0;color:#6b7280;font-size:12px;">You are receiving this because you subscribed to ${BRAND} updates. <a href="${escapeHtml(unsubscribe)}" style="color:#2563eb;">Unsubscribe</a></p>
    `, s.contactEmail);
    const text = `${messageText || stripHtml(safeBody)}\n\nUnsubscribe: ${unsubscribe}`;
    return this.sendEmail({ to, subject, html, text, emailType: "promotion" });
  }

  async sendBulkPromotionEmail(input: { recipients: string[]; subject: string; messageHtml: string; messageText?: string }) {
    const unique = [...new Set(input.recipients.map((e) => e.trim().toLowerCase()).filter(Boolean))];
    const { data } = await this.supabase.admin()
      .from("email_subscribers")
      .select("email")
      .in("email", unique)
      .eq("subscribed", true);
    const allowed = new Set((data ?? []).map((row) => row.email));
    const results = [];
    for (const email of unique) {
      if (!allowed.has(email)) {
        results.push({ email, sent: false, skipped: true, error: "Not subscribed" });
        continue;
      }
      try {
        await this.sendPromotionEmail({ to: email, subject: input.subject, messageHtml: input.messageHtml, messageText: input.messageText });
        results.push({ email, sent: true });
      } catch (err) {
        results.push({ email, sent: false, error: err instanceof Error ? err.message : "Send failed" });
      }
    }
    return { ok: true, total: unique.length, sent: results.filter((r) => r.sent).length, results };
  }
}
