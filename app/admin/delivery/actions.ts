"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { internalApi } from "@/lib/internal-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  MESSAGE_KINDS,
  normalizePhone,
  type DeliveryMessageRow,
  type DeliveryVariables,
  type MessageKind,
  type MessageTemplateRow,
} from "@/lib/delivery";

/**
 * Server Actions for Subscription Delivery Automation.
 *
 * Every mutation gates on a delivery:* permission and then calls the NestJS
 * backend (which owns the WhatsApp provider config, the templates, and the
 * delivery log) with the shared internal token. Reads that don't need the
 * provider — the delivery log, the product list — go straight to Supabase
 * with the service-role client, the way the other admin screens do.
 */

export type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

function fail(err: unknown, fallback: string): { ok: false; error: string } {
  const message = err instanceof Error ? err.message : fallback;
  return { ok: false, error: message };
}

function bust() {
  revalidatePath("/admin/delivery");
  revalidatePath("/admin/delivery/history");
  revalidatePath("/admin/delivery/templates");
}

// ── status ────────────────────────────────────────────────────────────────

export type DeliveryStatus = {
  whatsapp: { provider: "cloud" | "custom" | "manual"; configured: boolean; from: string; detail?: string };
  email: { provider: string; configured: boolean; from: string; replyTo: string };
  duplicateWindowMinutes: number;
  reminderDaysBefore: number;
  /** false when the Next server couldn't reach / authenticate to the API. */
  reachable: boolean;
  error?: string;
};

export async function getDeliveryStatus(): Promise<DeliveryStatus> {
  await requireAdmin("delivery:read");
  try {
    const s = await internalApi<Omit<DeliveryStatus, "reachable">>("/delivery/status");
    return { ...s, reachable: true };
  } catch (err) {
    return {
      whatsapp: { provider: "manual", configured: false, from: "" },
      email: { provider: "smtp", configured: false, from: "", replyTo: "" },
      duplicateWindowMinutes: 10,
      reminderDaysBefore: 3,
      reachable: false,
      error: err instanceof Error ? err.message : "Could not reach the delivery backend.",
    };
  }
}

// ── templates ─────────────────────────────────────────────────────────────

export async function getTemplates(opts: { includeInactive?: boolean; kind?: MessageKind } = {}): Promise<MessageTemplateRow[]> {
  await requireAdmin("delivery:read");
  const supabase = getSupabaseAdmin();
  let query = supabase.from("message_templates").select("*");
  if (!opts.includeInactive) query = query.eq("active", true);
  if (opts.kind) query = query.eq("kind", opts.kind);
  const { data, error } = await query
    .order("kind", { ascending: true })
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });
  if (error) return [];
  return (data ?? []) as MessageTemplateRow[];
}

export type TemplateInput = {
  name: string;
  kind: MessageKind;
  language: string;
  product_id?: string | null;
  body: string;
  active?: boolean;
  is_default?: boolean;
};

function validateTemplate(input: TemplateInput): string | null {
  if (!input.name?.trim()) return "Template name is required.";
  if (!input.body?.trim()) return "Template body can't be empty.";
  if (input.body.length > 8000) return "Template body is too long (8000 characters max).";
  if (!MESSAGE_KINDS.includes(input.kind)) return "Pick a valid template type.";
  if (!/^[a-z]{2}$/i.test(input.language || "")) return "Language must be a two-letter code (e.g. en, ur).";
  return null;
}

export async function createTemplate(input: TemplateInput): Promise<Result<MessageTemplateRow>> {
  const me = await requireAdmin("delivery:templates");
  const invalid = validateTemplate(input);
  if (invalid) return { ok: false, error: invalid };
  try {
    const row = await internalApi<MessageTemplateRow>("/delivery/templates", {
      method: "POST",
      body: { ...input, product_id: input.product_id || null, actorId: me.userId },
    });
    bust();
    return { ok: true, data: row };
  } catch (err) {
    return fail(err, "Could not create the template.");
  }
}

export async function updateTemplate(id: string, input: TemplateInput): Promise<Result<MessageTemplateRow>> {
  await requireAdmin("delivery:templates");
  if (!id) return { ok: false, error: "Missing template id." };
  const invalid = validateTemplate(input);
  if (invalid) return { ok: false, error: invalid };
  try {
    const row = await internalApi<MessageTemplateRow>(`/delivery/templates/${id}`, {
      method: "PATCH",
      body: { ...input, product_id: input.product_id || null },
    });
    bust();
    return { ok: true, data: row };
  } catch (err) {
    return fail(err, "Could not update the template.");
  }
}

export async function setTemplateActive(id: string, active: boolean): Promise<Result<MessageTemplateRow>> {
  await requireAdmin("delivery:templates");
  if (!id) return { ok: false, error: "Missing template id." };
  try {
    const row = await internalApi<MessageTemplateRow>(`/delivery/templates/${id}`, {
      method: "PATCH",
      body: { active },
    });
    bust();
    return { ok: true, data: row };
  } catch (err) {
    return fail(err, "Could not change the template status.");
  }
}

export async function deleteTemplate(id: string): Promise<Result> {
  await requireAdmin("delivery:templates");
  if (!id) return { ok: false, error: "Missing template id." };
  try {
    await internalApi(`/delivery/templates/${id}`, { method: "DELETE" });
    bust();
    return { ok: true };
  } catch (err) {
    return fail(err, "Could not delete the template.");
  }
}

// ── preview + send ────────────────────────────────────────────────────────

export type PreviewInput = {
  templateId?: string | null;
  bodyOverride?: string | null;
  kind?: MessageKind;
  language?: string;
  productId?: string | null;
  productName?: string | null;
  variables?: DeliveryVariables;
  customerPhone?: string | null;
};

export type PreviewResult = {
  body: string;
  missing: string[];
  unknown: string[];
  templateId: string | null;
  templateName: string | null;
  language: string;
  phone: string | null;
  phoneValid: boolean;
  manualLink: string | null;
};

/** Authoritative render — exactly what the customer would receive. */
export async function previewDeliveryMessage(input: PreviewInput): Promise<Result<PreviewResult>> {
  await requireAdmin("delivery:read");
  try {
    const data = await internalApi<PreviewResult>("/delivery/preview", { method: "POST", body: input });
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Could not render the preview.");
  }
}

export type SendInput = {
  templateId?: string | null;
  bodyOverride?: string | null;
  kind?: MessageKind;
  language?: string;
  productId?: string | null;
  productName: string;
  customerPhone: string;
  customerName?: string | null;
  customerEmail?: string | null;
  alsoEmail?: boolean;
  variables?: DeliveryVariables;
  orderId?: string | null;
  saleId?: string | null;
  /** Set after the admin confirms an "already sent this" warning. */
  force?: boolean;
};

export type SendResult = {
  ok: boolean;
  duplicate: boolean;
  status?: "pending" | "sent" | "failed";
  channel?: "whatsapp" | "manual" | "email";
  provider?: string;
  /** wa.me link — the fallback when no API is configured or a send failed. */
  manualLink?: string | null;
  error?: string | null;
  message?: string;
  body?: string;
  missing?: string[];
  unknown?: string[];
  log?: DeliveryMessageRow;
  emailLog?: DeliveryMessageRow | null;
};

/**
 * Render + send the delivery message, then log it. The phone number is
 * validated here (libphonenumber-js, Pakistan as the default region) as well
 * as on the backend — a number that can't be dialled never reaches a provider.
 */
export async function sendDeliveryMessage(input: SendInput): Promise<Result<SendResult>> {
  const me = await requireAdmin("delivery:send");

  const phone = normalizePhone(input.customerPhone);
  if (!phone) {
    return { ok: false, error: "That WhatsApp number doesn't look valid. Use 03001234567 or +923001234567." };
  }
  if (!input.productName?.trim()) return { ok: false, error: "Select the subscription being delivered." };
  if (input.alsoEmail && !input.customerEmail?.trim()) {
    return { ok: false, error: "Add the customer's email address, or turn off the email copy." };
  }

  try {
    const data = await internalApi<SendResult>("/delivery/send", {
      method: "POST",
      body: {
        ...input,
        customerPhone: phone,
        actor: { id: me.userId, email: me.email },
      },
    });
    bust();
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Could not send the message.");
  }
}

/** Re-send a logged message verbatim. Always bypasses the duplicate guard. */
export async function resendDeliveryMessage(id: string): Promise<Result<SendResult>> {
  const me = await requireAdmin("delivery:send");
  if (!id) return { ok: false, error: "Missing message id." };
  try {
    const data = await internalApi<SendResult>(`/delivery/messages/${id}/resend`, {
      method: "POST",
      body: { force: true, actor: { id: me.userId, email: me.email } },
    });
    bust();
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Could not resend the message.");
  }
}

// ── history ───────────────────────────────────────────────────────────────

export async function getDeliveryHistory(filter: {
  limit?: number;
  status?: string;
  kind?: string;
  channel?: string;
  orderId?: string;
} = {}): Promise<DeliveryMessageRow[]> {
  await requireAdmin("delivery:read");
  const supabase = getSupabaseAdmin();
  let query = supabase.from("delivery_messages").select("*");
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.kind) query = query.eq("kind", filter.kind);
  if (filter.channel) query = query.eq("channel", filter.channel);
  if (filter.orderId) query = query.eq("order_id", filter.orderId);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(filter.limit ?? 200, 1), 500));
  if (error) return [];
  return (data ?? []) as DeliveryMessageRow[];
}

// ── order prefill ─────────────────────────────────────────────────────────

export type OrderPrefill = {
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  status: string;
  productId: string | null;
  productName: string | null;
  planName: string | null;
  /** Every purchased line, so the admin can pick which one they're delivering. */
  items: Array<{ id: string; name: string; planName: string | null }>;
};

/**
 * Load an order so the composer opens pre-filled — the "Send delivery
 * message" button on the order page links here with ?order=<id>.
 */
export async function getOrderPrefill(orderIdOrNumber: string): Promise<OrderPrefill | null> {
  await requireAdmin("delivery:read");
  if (!orderIdOrNumber) return null;

  const supabase = getSupabaseAdmin();
  const isUuid = /^[0-9a-f-]{36}$/i.test(orderIdOrNumber);
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_email, customer_phone, status, items, package_tier")
    .eq(isUuid ? "id" : "order_number", orderIdOrNumber)
    .maybeSingle();
  if (error || !data) return null;

  const items = Array.isArray(data.items) ? data.items : [];
  const mapped = items.map((it: any) => ({
    id: String(it?.id ?? ""),
    name: String(it?.name ?? "Subscription"),
    planName: [it?.variation?.plan, it?.variation?.accountLabel || it?.variation?.accountType, it?.variation?.duration]
      .filter(Boolean)
      .join(" · ") || null,
  }));
  const first = mapped[0];

  return {
    orderId: data.id,
    orderNumber: data.order_number,
    customerName: data.customer_name ?? null,
    customerEmail: data.customer_email ?? null,
    customerPhone: data.customer_phone ?? null,
    status: data.status,
    productId: first?.id || null,
    productName: first?.name || null,
    planName: first?.planName || (data.package_tier ? String(data.package_tier) : null),
    items: mapped,
  };
}
