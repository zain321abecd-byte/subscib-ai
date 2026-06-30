"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isEmail, sendBulk, sendOne } from "@/lib/email-server";

export type Audience = "subscribers" | "customers" | "manual";

type SendResult =
  | { ok: true; sent?: number; failed?: number; total?: number }
  | { ok: false; error: string };

function clampSubject(s: unknown): string {
  return String(s || "SubscribAI update").slice(0, 180);
}

function parseEmailList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter(isEmail).map((e) => e.trim().toLowerCase());
  if (typeof raw !== "string") return [];
  return raw
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(isEmail);
}

function uniqueEmails(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((v): v is string => isEmail(v)).map((v) => v.trim().toLowerCase()))];
}

/** Resolve the recipient list for the chosen audience. */
async function resolveRecipients(audience: Audience, manual: string): Promise<string[]> {
  if (audience === "manual") return parseEmailList(manual);

  const supabase = getSupabaseAdmin();

  if (audience === "customers") {
    const { data } = await supabase.from("orders").select("customer_email");
    return uniqueEmails((data ?? []).map((r: any) => r.customer_email));
  }

  // subscribers — table may not exist in every environment; fail soft.
  try {
    const { data, error } = await supabase
      .from("email_subscribers")
      .select("email")
      .eq("subscribed", true);
    if (error) return [];
    return uniqueEmails((data ?? []).map((r: any) => r.email));
  } catch {
    return [];
  }
}

/** Counts for each audience, for the compose UI. */
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

/** Send a single test email to one address. */
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
    await sendOne({
      to: input.to.trim().toLowerCase(),
      subject: clampSubject(input.subject),
      html: input.html,
      text: input.text,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Send failed." };
  }
}

/** Send a promotional email to the chosen audience. */
export async function sendPromotion(input: {
  audience: Audience;
  manual: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendResult> {
  await requireAdmin("emails:send");
  if (!input.html.trim()) return { ok: false, error: "Email body can't be empty." };

  const recipients = await resolveRecipients(input.audience, input.manual);
  if (recipients.length === 0) {
    return { ok: false, error: "No valid recipients found for that audience." };
  }

  try {
    const res = await sendBulk(recipients, clampSubject(input.subject), input.html, input.text);
    return { ok: true, ...res };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Send failed." };
  }
}
