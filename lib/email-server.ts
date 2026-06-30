import * as nodemailer from "nodemailer";

/**
 * Server-only SMTP sender for the admin "Emails" page. Mirrors the NestJS
 * EmailService transport so behaviour is identical — reads the same SMTP_*
 * env vars. Used by the promotional-email Server Actions.
 *
 * NOTE: requires SMTP_HOST / SMTP_USER / SMTP_PASS (and EMAIL_FROM or SMTP_FROM)
 * to be set in the Next.js server environment.
 */

let transporter: nodemailer.Transporter | null = null;

export function emailStatus() {
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || "";
  return {
    provider: "smtp" as const,
    configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && from),
    from,
    replyTo: process.env.EMAIL_REPLY_TO || "",
  };
}

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;

  if (!host || !user || !pass) {
    const missing = [!host && "SMTP_HOST", !user && "SMTP_USER", !pass && "SMTP_PASS"]
      .filter(Boolean)
      .join(", ");
    throw new Error(`SMTP email is not configured. Missing: ${missing}.`);
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 30_000,
  });
  return transporter;
}

function fromAddress(): string {
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) throw new Error("EMAIL_FROM, SMTP_FROM, or SMTP_USER must be configured before sending email.");
  return from;
}

export function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function sendOne(input: { to: string; subject: string; html: string; text?: string }): Promise<void> {
  const t = getTransporter();
  await t.sendMail({
    from: fromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text || stripHtml(input.html) || input.subject,
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
  });
}

/**
 * Send the same message to many recipients, one email each (so addresses are
 * never exposed to one another). Runs in small batches to be gentle on SMTP.
 */
export async function sendBulk(
  recipients: string[],
  subject: string,
  html: string,
  text?: string,
): Promise<{ sent: number; failed: number; total: number }> {
  const list = [...new Set(recipients.map((r) => r.trim().toLowerCase()).filter(isEmail))];
  let sent = 0;
  let failed = 0;
  const BATCH = 5;
  for (let i = 0; i < list.length; i += BATCH) {
    const batch = list.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((to) => sendOne({ to, subject, html, text })),
    );
    for (const r of results) r.status === "fulfilled" ? sent++ : failed++;
  }
  return { sent, failed, total: list.length };
}
