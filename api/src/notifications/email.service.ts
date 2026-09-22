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

/** Which transport the service will use for the current env. */
type EmailProvider = "resend" | "smtp";

/** Resend API POST /emails payload. */
type ResendPayload = {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
};

function activeProvider(): EmailProvider {
  return process.env.RESEND_API_KEY ? "resend" : "smtp";
}

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

/**
 * Nodemailer/SMTP errors arrive as opaque codes. Translate them into the thing
 * the operator actually has to change, because "Connection timeout" on its own
 * sent us hunting for a week.
 */
export function explainSmtpError(err: unknown): string {
  const e = err as { code?: string; responseCode?: number; response?: string; message?: string };
  const code = (e?.code || "").toUpperCase();
  const host = process.env.SMTP_HOST || "(unset)";
  const port = process.env.SMTP_PORT || "587";

  if (code === "ETIMEDOUT" || code === "ESOCKET" || /timeout/i.test(e?.message || "")) {
    return (
      `Could not reach the mail server at ${host}:${port} — the connection timed out. ` +
      `Either SMTP_HOST is wrong, or that port is blocked outbound. Check the host is the ` +
      `SUBMISSION server (not the inbound MX record) and that the port is 465 (SSL) or 587 (STARTTLS), not 25.`
    );
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return `SMTP_HOST "${host}" does not resolve. Check the hostname for a typo.`;
  }
  if (code === "ECONNREFUSED") {
    return `${host}:${port} refused the connection. The port is probably wrong for this provider.`;
  }
  if (code === "EAUTH" || e?.responseCode === 535) {
    return (
      `The mail server rejected the username or password. SMTP_USER is usually the full email ` +
      `address, and some providers need an app-specific password rather than the account one.`
    );
  }
  if (e?.responseCode === 550 || e?.responseCode === 553) {
    return (
      `The server rejected the sender address. EMAIL_FROM must be a mailbox this account is ` +
      `allowed to send as. Server said: ${(e?.response || "").slice(0, 160)}`
    );
  }
  return e?.message || "Email send failed.";
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
    const provider = activeProvider();
    const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || "";
    const port = Number(process.env.SMTP_PORT || 587);

    if (provider === "resend") {
      return {
        provider: "resend" as const,
        configured: Boolean(process.env.RESEND_API_KEY && from),
        from,
        replyTo: process.env.EMAIL_REPLY_TO || "",
        host: "api.resend.com",
        port: 443,
        secure: true,
        user: "(http-api)",
      };
    }

    return {
      provider: "smtp" as const,
      configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && from),
      from,
      replyTo: process.env.EMAIL_REPLY_TO || "",
      host: process.env.SMTP_HOST || "",
      port,
      secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465,
      user: process.env.SMTP_USER || "",
    };
  }

  /**
   * Open a connection and authenticate without sending anything. This is the
   * check to run when mail "just isn't arriving" — it separates a broken
   * connection from a broken recipient.
   */
  async diagnose(): Promise<{ ok: boolean; detail: string; config: ReturnType<EmailService["status"]> }> {
    const config = this.status();
    if (!config.configured) {
      const provider = activeProvider();
      const detail = provider === "resend"
        ? "Resend is not fully configured — RESEND_API_KEY and a from address (EMAIL_FROM) are required."
        : "SMTP is not fully configured — SMTP_HOST, SMTP_USER, SMTP_PASS and a from address are all required.";
      return { ok: false, detail, config };
    }

    if (activeProvider() === "resend") {
      try {
        const res = await fetch("https://api.resend.com/domains", {
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        });
        if (res.ok) {
          return { ok: true, detail: "Resend HTTP API authenticated successfully (Full access).", config };
        }
        const body = await res.json().catch(() => null) as { name?: string; message?: string } | null;
        if (body?.name === "restricted_api_key") {
          return { ok: true, detail: "Resend HTTP API authenticated successfully (Sending access key).", config };
        }
        return { ok: false, detail: `Resend API error: ${body?.message || res.statusText}`, config };
      } catch (err) {
        return { ok: false, detail: `Resend API unreachable: ${(err as Error).message}`, config };
      }
    }

    try {
      await this.getTransporter().verify();
      return { ok: true, detail: `Connected to ${config.host}:${config.port} and authenticated successfully.`, config };
    } catch (err) {
      this.logger.error(`SMTP diagnose failed: ${(err as Error).message}`);
      return { ok: false, detail: explainSmtpError(err), config };
    }
  }

  private async sendViaResend(input: {
    from: string;
    to: string;
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
  }): Promise<{ messageId: string; response: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    const payload: ResendPayload = {
      from: input.from,
      to: [input.to],
      subject: input.subject,
      ...(input.html ? { html: input.html } : {}),
      ...(input.text ? { text: input.text } : {}),
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => null)) as { id?: string; message?: string; name?: string } | null;

    if (!res.ok) {
      const errMsg = data?.message || `HTTP ${res.status}: Failed to send email via Resend`;
      throw new Error(errMsg);
    }

    return {
      messageId: data?.id || `resend_${Date.now()}`,
      response: "250 Delivered via Resend HTTP API",
    };
  }

  async sendEmail({ to, subject, text, html, replyTo, emailType = "transactional", relatedOrderId = null }: SendEmailInput) {
    const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!from) {
      this.logger.error("EMAIL_FROM / SMTP_FROM / SMTP_USER all empty — cannot determine 'from' address.");
      throw new Error("EMAIL_FROM, SMTP_FROM, or SMTP_USER must be configured before sending email.");
    }

    const provider = activeProvider();

    let logId: string | null = null;
    try {
      const { data } = await this.supabase.admin().from("email_logs").insert({
        email_type: emailType,
        recipient_email: to,
        subject,
        status: "pending",
        provider: provider,
        related_order_id: relatedOrderId,
      }).select("id").maybeSingle();
      logId = data?.id ?? null;
    } catch (logErr) {
      this.logger.warn(`email_logs insert failed (non-fatal): ${(logErr as Error).message}`);
    }

    this.logger.log(
      `sendEmail [${provider}] → to=${to} from="${from}" subject="${subject}" type=${emailType} logId=${logId || "-"}`,
    );

    try {
      let messageId = "";
      let responseText = "";

      if (provider === "resend") {
        const result = await this.sendViaResend({
          from,
          to,
          subject,
          text: text || stripHtml(html || ""),
          html,
          replyTo: replyTo || process.env.EMAIL_REPLY_TO || undefined,
        });
        messageId = result.messageId;
        responseText = result.response;
      } else {
        const result = await this.getTransporter().sendMail({
          from,
          to,
          subject,
          text: text || stripHtml(html || ""),
          html,
          replyTo: replyTo || process.env.EMAIL_REPLY_TO || undefined,
        });
        messageId = String(result.messageId || "");
        responseText = String(result.response || "");
      }

      this.logger.log(
        `sendEmail OK [${provider}] → to=${to} messageId=${messageId} response="${responseText.slice(0, 160)}"`,
      );
      if (logId) {
        await this.supabase.admin().from("email_logs").update({
          status: "sent",
          provider_message_id: messageId,
          sent_at: new Date().toISOString(),
        }).eq("id", logId);
      }
      return { messageId, response: responseText };
    } catch (err) {
      const e = err as { code?: string; command?: string; response?: string; responseCode?: number; message?: string };
      this.logger.error(
        `sendEmail FAILED [${provider}] → to=${to}  code=${e?.code || "?"}  responseCode=${e?.responseCode ?? "?"}  command=${e?.command || "?"}  response="${(e?.response || "").slice(0, 200)}"  message="${(e?.message || "").slice(0, 200)}"`,
      );
      if (logId) {
        await this.supabase.admin().from("email_logs").update({
          status: "failed",
          error_message: explainSmtpError(err).slice(0, 500),
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

  /**
   * Portal team invite email. Contains a one-time link to /admin/accept-invite
   * where the invitee sets their password. Sent from the invites service.
   */
  async sendPortalInviteEmail(input: {
    to: string;
    name?: string | null;
    inviterName?: string | null;
    token: string;
    groupNames: string[];
  }) {
    const s = await this.settings();
    const displayName = input.name?.trim() || "there";
    const siteUrl = s.siteUrl || "https://subscribai.com";
    const acceptUrl = `${siteUrl}/admin/accept-invite?token=${encodeURIComponent(input.token)}&email=${encodeURIComponent(input.to)}`;
    const subject = `You're invited to the ${BRAND} team`;
    const groupsLine = input.groupNames.length
      ? `You'll join the following group${input.groupNames.length === 1 ? "" : "s"}: <strong>${input.groupNames.map(escapeHtml).join(", ")}</strong>.`
      : "Your permissions will be assigned when you accept the invite.";

    const html = layout(subject, `
      <h1 style="margin:0 0 12px;font-size:24px;color:#111827;">You're invited to ${BRAND}</h1>
      <p style="margin:0 0 14px;line-height:1.7;color:#374151;">Hi ${escapeHtml(displayName)}, ${input.inviterName ? `${escapeHtml(input.inviterName)} has` : "a superadmin has"} invited you to join the ${BRAND} admin portal as a teammate.</p>
      <p style="margin:0 0 22px;line-height:1.7;color:#374151;">${groupsLine}</p>
      <p style="margin:0 0 22px;"><a href="${escapeHtml(acceptUrl)}" style="display:inline-block;background:#FF7A1A;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">Accept invitation</a></p>
      <p style="margin:0;line-height:1.7;color:#6b7280;font-size:13px;">If you can't click the button, paste this URL into your browser:<br><span style="color:#111827;">${escapeHtml(acceptUrl)}</span></p>
      <p style="margin:16px 0 0;line-height:1.7;color:#6b7280;font-size:12px;">This invitation is one-time — if you didn't expect it, you can ignore this email.</p>
    `, s.contactEmail);

    const text = [
      `You're invited to the ${BRAND} admin portal.`,
      input.groupNames.length ? `Groups: ${input.groupNames.join(", ")}` : "",
      "",
      `Accept: ${acceptUrl}`,
      "",
      `Contact: ${s.contactEmail}`,
    ].filter(Boolean).join("\n");

    return this.sendEmail({ to: input.to, subject, html, text, emailType: "portal_invite" });
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

  /**
   * Tell the shop a new order landed. Nothing did this before — orders only
   * ever emailed the customer, so the team found out by opening the admin
   * panel.
   *
   * Goes to ADMIN_NOTIFY_EMAIL, falling back to the site's contact address.
   * Reply-to is the customer, so hitting reply reaches the buyer.
   */
  async sendAdminOrderNotification({ order }: { order: OrderEmail }) {
    const s = await this.settings();
    const to = (process.env.ADMIN_NOTIFY_EMAIL || s.contactEmail || "").trim();
    if (!to) {
      this.logger.warn("No ADMIN_NOTIFY_EMAIL or contact_email set — skipping the admin order notification.");
      return null;
    }

    const items = Array.isArray((order as any).items) ? (order as any).items : [];
    const placed = new Date((order as any).created_at || Date.now()).toLocaleString("en-PK");
    const total = (order as any).subtotal_pkr != null
      ? `Rs ${Number((order as any).subtotal_pkr).toLocaleString("en-PK")}`
      : (order as any).subtotal_usd != null
        ? `$${Number((order as any).subtotal_usd).toFixed(2)}`
        : "—";

    const rows = items
      .map((it: any) => `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(String(it?.name ?? "Item"))}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${escapeHtml(String(it?.qty ?? 1))}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">Rs ${Number(it?.price ?? 0).toLocaleString("en-PK")}</td>
        </tr>`)
      .join("");

    const subject = `New order ${order.order_number} — ${total}`;
    const html = layout(subject, `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">New order received</h1>
      <p style="margin:0 0 18px;color:#374151;line-height:1.7;">
        Order <strong>${escapeHtml(order.order_number)}</strong> came in on ${escapeHtml(placed)}.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 18px;">
        <tr><td style="padding:6px 0;color:#6b7280;">Customer</td><td style="padding:6px 0;"><strong>${escapeHtml(order.customer_name || "—")}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;">${escapeHtml(order.customer_email)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Phone</td><td style="padding:6px 0;">${escapeHtml((order as any).customer_phone || "—")}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Status</td><td style="padding:6px 0;">${escapeHtml((order as any).status || "pending")}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Payment</td><td style="padding:6px 0;">${escapeHtml((order as any).payment_method || "—")}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Total</td><td style="padding:6px 0;"><strong>${escapeHtml(total)}</strong></td></tr>
      </table>
      ${rows ? `<table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead><tr>
          <th align="left" style="padding:8px 10px;border-bottom:2px solid #e5e7eb;color:#6b7280;">Product</th>
          <th align="center" style="padding:8px 10px;border-bottom:2px solid #e5e7eb;color:#6b7280;">Qty</th>
          <th align="right" style="padding:8px 10px;border-bottom:2px solid #e5e7eb;color:#6b7280;">Price</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>` : ""}
    `, s.contactEmail);

    const text = [
      `New order ${order.order_number}`,
      `Placed: ${placed}`,
      `Customer: ${order.customer_name || "—"} (${order.customer_email})`,
      `Phone: ${(order as any).customer_phone || "—"}`,
      `Status: ${(order as any).status || "pending"}`,
      `Total: ${total}`,
      "",
      ...items.map((it: any) => `- ${it?.name ?? "Item"} x${it?.qty ?? 1}`),
    ].join("\n");

    return this.sendEmail({
      to,
      subject,
      html,
      text,
      // Replying reaches the customer, which is what you want from an alert.
      replyTo: order.customer_email,
      emailType: "admin_order_alert",
      relatedOrderId: (order as any).id ?? null,
    });
  }

  /**
   * Acknowledge a product-form request to the customer, and alert the team.
   * Returns both outcomes so the caller can log what actually went out.
   */
  async sendRequestFormEmails(input: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    productName: string;
    requestNo: string | null;
    priceLabel?: string | null;
  }) {
    const s = await this.settings();
    const results: { customer: boolean; admin: boolean; error?: string } = { customer: false, admin: false };

    try {
      const subject = `We have received your ${input.productName} request`;
      const html = layout(subject, `
        <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Your request has been received successfully.</h1>
        <p style="margin:0 0 16px;color:#374151;line-height:1.7;">
          Thanks ${escapeHtml(input.customerName)} — we have your request for
          <strong>${escapeHtml(input.productName)}</strong>${input.priceLabel ? ` (${escapeHtml(input.priceLabel)})` : ""}.
          Our team will confirm it shortly and contact you on ${escapeHtml(input.customerPhone)}.
        </p>
        ${input.requestNo ? `<p style="margin:0 0 16px;color:#374151;">Your reference is <strong>${escapeHtml(input.requestNo)}</strong>.</p>` : ""}
        <p style="margin:18px 0 0;color:#6b7280;font-size:14px;">
          Questions? Reply to this email or write to ${escapeHtml(s.contactEmail)}${s.whatsapp ? ` / WhatsApp ${escapeHtml(s.whatsapp)}` : ""}.
        </p>
      `, s.contactEmail);

      await this.sendEmail({
        to: input.customerEmail,
        subject,
        html,
        text: [
          "Your request has been received successfully.",
          "",
          `Product: ${input.productName}`,
          input.requestNo ? `Reference: ${input.requestNo}` : "",
          "",
          `We will contact you on ${input.customerPhone}.`,
          `Support: ${s.contactEmail}`,
        ].filter(Boolean).join("\n"),
        emailType: "request_ack",
      });
      results.customer = true;
    } catch (err) {
      results.error = explainSmtpError(err);
      this.logger.error(`Request acknowledgement to ${input.customerEmail} failed: ${results.error}`);
    }

    const adminTo = (process.env.ADMIN_NOTIFY_EMAIL || s.contactEmail || "").trim();
    if (adminTo) {
      try {
        const subject = `New customer request — ${input.productName}`;
        const html = layout(subject, `
          <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">New customer request received</h1>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;color:#6b7280;">Reference</td><td style="padding:6px 0;"><strong>${escapeHtml(input.requestNo || "—")}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Product</td><td style="padding:6px 0;">${escapeHtml(input.productName)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Customer</td><td style="padding:6px 0;">${escapeHtml(input.customerName)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Phone</td><td style="padding:6px 0;">${escapeHtml(input.customerPhone)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;">${escapeHtml(input.customerEmail)}</td></tr>
          </table>
          <p style="margin:18px 0 0;color:#374151;">Approve or decline it under Sale requests in the admin panel.</p>
        `, s.contactEmail);

        await this.sendEmail({
          to: adminTo,
          subject,
          html,
          text: [
            "New customer request received",
            `Reference: ${input.requestNo || "—"}`,
            `Product: ${input.productName}`,
            `Customer: ${input.customerName}`,
            `Phone: ${input.customerPhone}`,
            `Email: ${input.customerEmail}`,
          ].join("\n"),
          replyTo: input.customerEmail,
          emailType: "admin_request_alert",
        });
        results.admin = true;
      } catch (err) {
        this.logger.error(`Admin request alert failed: ${explainSmtpError(err)}`);
      }
    }

    return results;
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
    // Suppress only addresses that have EXPLICITLY unsubscribed. Everyone else
    // (including addresses with no subscriber record) receives the email — so
    // admins can email customers and custom lists, while we still honour opt-outs.
    const { data } = await this.supabase.admin()
      .from("email_subscribers")
      .select("email")
      .in("email", unique)
      .eq("subscribed", false);
    const suppressed = new Set((data ?? []).map((row) => row.email));
    const results = [];
    for (const email of unique) {
      if (suppressed.has(email)) {
        results.push({ email, sent: false, skipped: true, error: "Unsubscribed" });
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
