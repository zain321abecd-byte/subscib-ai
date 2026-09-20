"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { emailApi } from "@/lib/email-api";

/**
 * Email delivery log. Reads come straight from email_logs with the service
 * role; retry goes through the backend so the SMTP transport stays in one
 * place.
 */

export type EmailLogStatus = "pending" | "sent" | "failed";

export interface EmailLogRow {
  id: string;
  email_type: string;
  recipient_email: string;
  subject: string | null;
  status: EmailLogStatus;
  provider: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  related_order_id: string | null;
  sent_at: string | null;
  created_at: string;
}

export type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export async function getEmailLogs(limit = 300): Promise<EmailLogRow[]> {
  await requireAdmin("emails:read");
  const { data, error } = await getSupabaseAdmin()
    .from("email_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 1000));
  if (error) return [];
  return (data ?? []) as EmailLogRow[];
}

/** Live SMTP check — connects and authenticates without sending anything. */
export type SmtpDiagnosis = {
  ok: boolean;
  detail: string;
  config: {
    provider: string;
    configured: boolean;
    from: string;
    replyTo: string;
    host: string;
    port: number;
    secure: boolean;
    user: string;
  };
  reachable: boolean;
};

export async function diagnoseSmtp(): Promise<SmtpDiagnosis> {
  await requireAdmin("emails:read");
  try {
    const res = await emailApi<Omit<SmtpDiagnosis, "reachable">>("/emails/diagnose");
    return { ...res, reachable: true };
  } catch (err) {
    return {
      ok: false,
      reachable: false,
      detail:
        err instanceof Error
          ? `Could not reach the mail backend: ${err.message}`
          : "Could not reach the mail backend.",
      config: { provider: "smtp", configured: false, from: "", replyTo: "", host: "", port: 0, secure: false, user: "" },
    };
  }
}

/**
 * Resend a failed email. The log row keeps the recipient and subject but not
 * the body, so this re-sends a short notice rather than pretending to
 * reproduce the original — honest about what it can actually do.
 */
export async function retryFailedEmail(id: string): Promise<Result> {
  await requireAdmin("emails:send");
  if (!id) return { ok: false, error: "Missing log id." };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("email_logs").select("*").eq("id", id).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "That log entry no longer exists." };

  const row = data as EmailLogRow;
  if (row.status === "sent") return { ok: false, error: "That email already went out." };

  try {
    await emailApi("/emails/promotions/test", {
      method: "POST",
      body: {
        to: row.recipient_email,
        subject: row.subject || "Message from SubscribAI",
        messageHtml:
          `<p>This is a retry of an earlier message that failed to reach you` +
          `${row.subject ? ` (“${row.subject}”)` : ""}.</p>` +
          `<p>If you were expecting order or subscription details and they haven't arrived, reply to this email and we'll resend them.</p>`,
      },
    });
    revalidatePath("/admin/email/logs");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Retry failed." };
  }
}
