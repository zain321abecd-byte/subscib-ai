"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { CustomerReceivableRow, VendorPayableRow } from "@/lib/account-book";

/**
 * Account Book writes. Service-role client gated by requireAdmin(), matching
 * the rest of the admin. `status` is never sent — a database trigger derives it
 * from the amounts so it can't drift from the numbers.
 */

export type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

function bust() {
  revalidatePath("/admin/account-book");
  revalidatePath("/admin/account-book/payables");
  revalidatePath("/admin/account-book/receivables");
}

function money(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
}

function text(value: unknown, max: number): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s ? s.slice(0, max) : null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function date(value: unknown): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return DATE_RE.test(s) ? s : null;
}

// ── reads ─────────────────────────────────────────────────────────────────

export async function getPayables(): Promise<VendorPayableRow[]> {
  await requireAdmin("accounts:read");
  const { data, error } = await getSupabaseAdmin()
    .from("vendor_payables")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as VendorPayableRow[];
}

export async function getReceivables(): Promise<CustomerReceivableRow[]> {
  await requireAdmin("accounts:read");
  const { data, error } = await getSupabaseAdmin()
    .from("customer_receivables")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as CustomerReceivableRow[];
}

// ── payables ──────────────────────────────────────────────────────────────

export type PayableInput = {
  vendor_name: string;
  vendor_contact?: string | null;
  description?: string | null;
  amount: number;
  paid_amount?: number;
  currency?: string | null;
  due_date?: string | null;
  notes?: string | null;
};

function payablePayload(input: PayableInput) {
  return {
    vendor_name: (input.vendor_name || "").trim().slice(0, 160),
    vendor_contact: text(input.vendor_contact, 120),
    description: text(input.description, 400),
    amount: money(input.amount),
    paid_amount: money(input.paid_amount),
    currency: (input.currency || "PKR").trim().toUpperCase().slice(0, 8),
    due_date: date(input.due_date),
    notes: text(input.notes, 600),
  };
}

export async function savePayable(input: PayableInput, id?: string): Promise<Result<VendorPayableRow>> {
  const me = await requireAdmin("accounts:write");
  if (!input.vendor_name?.trim()) return { ok: false, error: "Vendor name is required." };
  if (money(input.amount) <= 0) return { ok: false, error: "Amount must be greater than zero." };
  if (money(input.paid_amount) > money(input.amount)) {
    return { ok: false, error: "Paid amount can't be more than the total." };
  }

  const supabase = getSupabaseAdmin();
  const payload = payablePayload(input);

  const query = id
    ? supabase.from("vendor_payables").update(payload).eq("id", id).select("*").maybeSingle()
    : supabase.from("vendor_payables").insert({ ...payload, created_by: me.userId }).select("*").single();

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "That entry no longer exists." };
  bust();
  return { ok: true, data: data as VendorPayableRow };
}

/** Record a payment against a payable. Adds to what's already paid. */
export async function recordVendorPayment(id: string, amount: number): Promise<Result<VendorPayableRow>> {
  await requireAdmin("accounts:write");
  if (!id) return { ok: false, error: "Missing entry id." };
  const add = money(amount);
  if (add <= 0) return { ok: false, error: "Enter a payment amount greater than zero." };

  const supabase = getSupabaseAdmin();
  const { data: row } = await supabase.from("vendor_payables").select("amount, paid_amount").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "That entry no longer exists." };

  const current = row as { amount: number; paid_amount: number };
  const next = Math.min(money(current.paid_amount) + add, money(current.amount));

  const { data, error } = await supabase
    .from("vendor_payables")
    .update({ paid_amount: next })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "That entry no longer exists." };
  bust();
  return { ok: true, data: data as VendorPayableRow };
}

export async function deletePayable(id: string): Promise<Result> {
  await requireAdmin("accounts:write");
  if (!id) return { ok: false, error: "Missing entry id." };
  const { error } = await getSupabaseAdmin().from("vendor_payables").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  bust();
  return { ok: true };
}

// ── receivables ───────────────────────────────────────────────────────────

export type ReceivableInput = {
  customer_name: string;
  customer_phone?: string | null;
  product_name?: string | null;
  invoice_no?: string | null;
  amount: number;
  received_amount?: number;
  currency?: string | null;
  due_date?: string | null;
  notes?: string | null;
};

function receivablePayload(input: ReceivableInput) {
  return {
    customer_name: (input.customer_name || "").trim().slice(0, 160),
    customer_phone: text(input.customer_phone, 40),
    product_name: text(input.product_name, 200),
    invoice_no: text(input.invoice_no, 60),
    amount: money(input.amount),
    received_amount: money(input.received_amount),
    currency: (input.currency || "PKR").trim().toUpperCase().slice(0, 8),
    due_date: date(input.due_date),
    notes: text(input.notes, 600),
  };
}

export async function saveReceivable(input: ReceivableInput, id?: string): Promise<Result<CustomerReceivableRow>> {
  const me = await requireAdmin("accounts:write");
  if (!input.customer_name?.trim()) return { ok: false, error: "Customer name is required." };
  if (money(input.amount) <= 0) return { ok: false, error: "Total amount must be greater than zero." };
  if (money(input.received_amount) > money(input.amount)) {
    return { ok: false, error: "Received amount can't be more than the total." };
  }

  const supabase = getSupabaseAdmin();
  const payload = receivablePayload(input);

  const query = id
    ? supabase.from("customer_receivables").update(payload).eq("id", id).select("*").maybeSingle()
    : supabase.from("customer_receivables").insert({ ...payload, created_by: me.userId }).select("*").single();

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "That entry no longer exists." };
  bust();
  return { ok: true, data: data as CustomerReceivableRow };
}

/** Record money received from a customer. Adds to what's already received. */
export async function recordCustomerPayment(id: string, amount: number): Promise<Result<CustomerReceivableRow>> {
  await requireAdmin("accounts:write");
  if (!id) return { ok: false, error: "Missing entry id." };
  const add = money(amount);
  if (add <= 0) return { ok: false, error: "Enter a payment amount greater than zero." };

  const supabase = getSupabaseAdmin();
  const { data: row } = await supabase
    .from("customer_receivables")
    .select("amount, received_amount")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, error: "That entry no longer exists." };

  const current = row as { amount: number; received_amount: number };
  const next = Math.min(money(current.received_amount) + add, money(current.amount));

  const { data, error } = await supabase
    .from("customer_receivables")
    .update({ received_amount: next })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "That entry no longer exists." };
  bust();
  return { ok: true, data: data as CustomerReceivableRow };
}

export async function deleteReceivable(id: string): Promise<Result> {
  await requireAdmin("accounts:write");
  if (!id) return { ok: false, error: "Missing entry id." };
  const { error } = await getSupabaseAdmin().from("customer_receivables").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  bust();
  return { ok: true };
}
