"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { emailApi } from "@/lib/email-api";

export type Audience = "subscribers" | "customers" | "manual";

type SendResult =
  | { ok: true; sent?: number; total?: number }
  | { ok: false; error: string };

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function uniqueEmails(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((v): v is string => isEmail(v)).map((v) => v.trim().toLowerCase()))];
}

export type EmailStatus = {
  provider: string;
  configured: boolean;
  from: string;
  replyTo: string;
  /** false when the Next server couldn't reach/authenticate to the API. */
  reachable: boolean;
  error?: string;
};

/** Email provider status — read from the backend (the working SMTP config). */
export async function getEmailStatus(): Promise<EmailStatus> {
  await requireAdmin("emails:read");
  try {
    const s = await emailApi<{ provider: string; configured: boolean; from: string; replyTo: string }>(
      "/emails/status",
    );
    return { ...s, reachable: true };
  } catch (err) {
    return {
      provider: "smtp",
      configured: false,
      from: "",
      replyTo: "",
      reachable: false,
      error: err instanceof Error ? err.message : "Could not reach the email backend.",
    };
  }
}

/** Audience sizes for the compose UI. */
export async function getAudienceCounts(): Promise<{ subscribers: number; customers: number }> {
  await requireAdmin("emails:read");
  const supabase = getSupabaseAdmin();

  let subscribers = 0;
  let customers = 0;
  try {
    const { count } = await supabase
      .from("email_subscribers")
      .select("email", { count: "exact", head: true })
      .eq("subscribed", true);
    subscribers = count ?? 0;
  } catch {
    subscribers = 0;
  }
  try {
    const { data } = await supabase.from("orders").select("customer_email");
    customers = uniqueEmails((data ?? []).map((r: any) => r.customer_email)).length;
  } catch {
    customers = 0;
  }
  return { subscribers, customers };
}

/** Send a single test email — routed through the backend EmailService. */
export async function sendTestEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendResult> {
  await requireAdmin("emails:send");
  if (!isEmail(input.to)) return { ok: false, error: "Enter a valid test email address." };
  if (!input.html.trim()) return { ok: false, error: "Email body can't be empty." };
  try {
    await emailApi("/emails/promotions/test", {
      method: "POST",
      body: {
        to: input.to.trim().toLowerCase(),
        subject: input.subject,
        messageHtml: input.html,
        messageText: input.text,
      },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Send failed." };
  }
}

/** Send a promotional email to an audience — routed through the backend. */
export async function sendPromotion(input: {
  audience: Audience;
  manual: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendResult> {
  await requireAdmin("emails:send");
  if (!input.html.trim()) return { ok: false, error: "Email body can't be empty." };

  // For subscribers/customers, let the backend resolve the list (single source
  // of truth). For a manual list, pass the addresses through.
  const body: Record<string, unknown> = {
    subject: input.subject,
    messageHtml: input.html,
    messageText: input.text,
  };
  if (input.audience === "manual") {
    const recipients = uniqueEmails(input.manual.split(/[\s,;]+/));
    if (recipients.length === 0) return { ok: false, error: "No valid recipients in the list." };
    body.recipients = recipients;
  } else {
    body.source = input.audience;
  }

  try {
    const res = await emailApi<{ ok: boolean; total?: number; sent?: number }>("/emails/promotions", {
      method: "POST",
      body,
    });
    return { ok: true, sent: res.sent, total: res.total };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Send failed." };
  }
}
