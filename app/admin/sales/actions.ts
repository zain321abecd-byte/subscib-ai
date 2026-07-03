"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * Server actions for /admin/sales — customer subscription CRUD +
 * renewal-cycle helpers.
 *
 * Every action starts with `requireAdmin("sales:read"|"sales:write"|
 * "sales:delete")` which validates the portal JWT server-side and
 * throws (or redirects) for anyone without the right permission.
 * Once past the guard we use the service-role Supabase client, which
 * bypasses RLS — that's fine because we've already proven the caller
 * is a portal admin. The row's RLS policy still protects the anon key
 * from ever seeing this data.
 */

export type SaleStatus = "active" | "renewal_due" | "renewed" | "expired" | "cancelled";

export type SaleRow = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  product_id: string | null;
  product_name: string;
  plan_name: string | null;
  sale_price: number | null;
  currency: string;
  sale_date: string;        // yyyy-mm-dd
  expiry_date: string;
  renew_date: string;
  status: SaleStatus;
  payment_method: string | null;
  transaction_id: string | null;
  notes: string | null;
  reminder_message: string | null;
  last_reminder_sent_at: string | null;
  renewed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Payload accepted by the create/update actions. Server validates & normalises. */
export type SaleInput = {
  customer_name: string;
  customer_email?: string | null;
  customer_phone: string;
  product_id?: string | null;
  product_name: string;
  plan_name?: string | null;
  sale_price?: number | null;
  currency?: string | null;
  sale_date: string;
  expiry_date: string;
  renew_date: string;
  status?: SaleStatus;
  payment_method?: string | null;
  transaction_id?: string | null;
  notes?: string | null;
  reminder_message?: string | null;
};

const VALID_STATUSES: readonly SaleStatus[] = ["active", "renewal_due", "renewed", "expired", "cancelled"];
type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

// ── validation helpers ────────────────────────────────────────────────────
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateInput(input: SaleInput): string | null {
  if (!input.customer_name?.trim()) return "Customer name is required.";
  if (!input.customer_phone?.trim()) return "Customer phone is required.";
  if (!input.product_name?.trim()) return "Product name is required.";
  if (!DATE_RE.test(input.sale_date))    return "Sale date must be YYYY-MM-DD.";
  if (!DATE_RE.test(input.expiry_date))  return "Expiry date must be YYYY-MM-DD.";
  if (!DATE_RE.test(input.renew_date))   return "Renew date must be YYYY-MM-DD.";
  if (input.status && !VALID_STATUSES.includes(input.status)) return "Invalid status.";
  if (input.sale_price != null && (isNaN(input.sale_price) || input.sale_price < 0))
    return "Sale price must be a non-negative number.";
  if (input.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customer_email.trim()))
    return "Customer email is not a valid address.";
  return null;
}

function normalise(input: SaleInput) {
  return {
    customer_name:    input.customer_name.trim(),
    customer_email:   input.customer_email?.trim() || null,
    customer_phone:   input.customer_phone.trim(),
    product_id:       input.product_id || null,
    product_name:     input.product_name.trim(),
    plan_name:        input.plan_name?.trim() || null,
    sale_price:       input.sale_price ?? null,
    currency:         (input.currency || "PKR").trim().toUpperCase(),
    sale_date:        input.sale_date,
    expiry_date:      input.expiry_date,
    renew_date:       input.renew_date,
    status:           input.status || "active",
    payment_method:   input.payment_method?.trim() || null,
    transaction_id:   input.transaction_id?.trim() || null,
    notes:            input.notes?.trim() || null,
    reminder_message: input.reminder_message?.trim() || null,
  };
}

function bust() {
  revalidatePath("/admin/sales");
  revalidatePath("/admin");
}

// ── read ──────────────────────────────────────────────────────────────────
export async function getSubscriptionSales(): Promise<Result<SaleRow[]>> {
  await requireAdmin("sales:read");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("subscription_sales")
    .select("*")
    .order("renew_date", { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data as SaleRow[]) || [] };
}

// ── mutations ─────────────────────────────────────────────────────────────
export async function createSubscriptionSale(input: SaleInput): Promise<Result<SaleRow>> {
  await requireAdmin("sales:write");
  const err = validateInput(input);
  if (err) return { ok: false, error: err };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("subscription_sales")
    .insert(normalise(input))
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  bust();
  return { ok: true, data: data as SaleRow };
}

export async function updateSubscriptionSale(id: string, input: SaleInput): Promise<Result<SaleRow>> {
  await requireAdmin("sales:write");
  if (!id) return { ok: false, error: "Missing sale id." };
  const err = validateInput(input);
  if (err) return { ok: false, error: err };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("subscription_sales")
    .update(normalise(input))
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  bust();
  return { ok: true, data: data as SaleRow };
}

export async function deleteSubscriptionSale(id: string): Promise<Result> {
  await requireAdmin("sales:delete");
  if (!id) return { ok: false, error: "Missing sale id." };
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("subscription_sales").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  bust();
  return { ok: true };
}

// ── renewal-flow helpers ──────────────────────────────────────────────────
/**
 * Called by the "Mark reminder sent" button after the admin opens
 * WhatsApp Web. Just stamps the timestamp — no message is actually
 * sent from the server (WhatsApp Web is client-driven).
 */
export async function markReminderSent(id: string): Promise<Result<SaleRow>> {
  await requireAdmin("sales:write");
  if (!id) return { ok: false, error: "Missing sale id." };
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("subscription_sales")
    .update({ last_reminder_sent_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  bust();
  return { ok: true, data: data as SaleRow };
}

/**
 * "Mark as renewed" — flip the current row to `renewed` and optionally
 * spawn a fresh sale row for the next cycle. Passing `next` triggers
 * the second insert; omit it if the admin just wants to close the
 * cycle without creating a follow-up.
 */
export async function markAsRenewed(
  id: string,
  next?: { sale_date: string; expiry_date: string; renew_date: string; sale_price?: number | null },
): Promise<Result<{ closed: SaleRow; opened?: SaleRow }>> {
  await requireAdmin("sales:write");
  if (!id) return { ok: false, error: "Missing sale id." };

  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data: closed, error: closedErr } = await supabase
    .from("subscription_sales")
    .update({ status: "renewed", renewed_at: nowIso })
    .eq("id", id)
    .select("*")
    .single();
  if (closedErr || !closed) return { ok: false, error: closedErr?.message || "Sale not found." };

  let opened: SaleRow | undefined;
  if (next) {
    if (!DATE_RE.test(next.sale_date) || !DATE_RE.test(next.expiry_date) || !DATE_RE.test(next.renew_date)) {
      return { ok: false, error: "New cycle dates must be YYYY-MM-DD." };
    }
    const src = closed as SaleRow;
    const { data: openedRow, error: openedErr } = await supabase
      .from("subscription_sales")
      .insert({
        customer_name:    src.customer_name,
        customer_email:   src.customer_email,
        customer_phone:   src.customer_phone,
        product_id:       src.product_id,
        product_name:     src.product_name,
        plan_name:        src.plan_name,
        sale_price:       next.sale_price ?? src.sale_price,
        currency:         src.currency,
        payment_method:   src.payment_method,
        reminder_message: src.reminder_message,
        sale_date:        next.sale_date,
        expiry_date:      next.expiry_date,
        renew_date:       next.renew_date,
        status:           "active",
      })
      .select("*")
      .single();
    if (openedErr) return { ok: false, error: openedErr.message };
    opened = openedRow as SaleRow;
  }
  bust();
  return { ok: true, data: { closed: closed as SaleRow, opened } };
}
