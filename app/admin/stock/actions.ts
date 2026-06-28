"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  parseStockFormData,
  stockMutationStatus,
  toStockInsert,
  validateStockInput,
} from "@/lib/stock";
import { requireAdmin } from "@/lib/admin-auth";

function revalidateStock() {
  revalidatePath("/admin");
  revalidatePath("/admin/stock");
}

export async function createStockItem(formData: FormData): Promise<{ ok: false; error: string } | never> {
  await requireAdmin("stock:write");
  const input = parseStockFormData(formData);
  const error = validateStockInput(input);
  if (error) return { ok: false, error };

  const supabase = await getSupabaseServer();
  const { data, error: dbError } = await supabase
    .from("stock_items")
    .insert(toStockInsert(input))
    .select("id")
    .single();

  if (dbError) return { ok: false, error: dbError.message };

  revalidateStock();
  redirect(`/admin/stock?created=${encodeURIComponent(data.id)}`);
}

export async function updateStockItem(formData: FormData): Promise<{ ok: false; error: string } | never> {
  await requireAdmin("stock:write");
  const id = String(formData.get("__id") || "").trim();
  if (!id) return { ok: false, error: "Missing stock item id." };

  const input = parseStockFormData(formData);
  const error = validateStockInput(input);
  if (error) return { ok: false, error };

  const supabase = await getSupabaseServer();
  const { error: dbError } = await supabase
    .from("stock_items")
    .update(toStockInsert(input))
    .eq("id", id);

  if (dbError) return { ok: false, error: dbError.message };

  revalidateStock();
  redirect(`/admin/stock?updated=${encodeURIComponent(id)}`);
}

export async function deleteStockItem(formData: FormData) {
  await requireAdmin("stock:write");
  const id = String(formData.get("id") || "").trim();
  if (!id) redirect(`/admin/stock?error=${encodeURIComponent("Missing stock item id.")}`);

  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("stock_items").delete().eq("id", id);
  if (error) redirect(`/admin/stock?error=${encodeURIComponent(error.message)}`);

  revalidateStock();
  redirect(`/admin/stock?deleted=${encodeURIComponent(id)}`);
}

export async function renewStockItem(formData: FormData): Promise<{ ok: false; error: string } | never> {
  await requireAdmin("stock:write");
  const id = String(formData.get("id") || "").trim();
  const expiryDate = String(formData.get("expiry_date") || "").trim();
  const quantityRaw = String(formData.get("quantity") || "").trim();
  const reminderRaw = String(formData.get("reminder_days_before_expiry") || "").trim();

  if (!id) return { ok: false, error: "Missing stock item id." };
  if (!expiryDate) return { ok: false, error: "New expiry date is required." };
  if (quantityRaw && (!Number.isFinite(Number(quantityRaw)) || Number(quantityRaw) <= 0)) {
    return { ok: false, error: "Quantity must be a positive number." };
  }

  const reminderDaysBeforeExpiry = Number.isFinite(Number(reminderRaw)) ? Math.max(0, Math.floor(Number(reminderRaw))) : 7;
  const patch: Record<string, unknown> = {
    expiry_date: expiryDate,
    reminder_days_before_expiry: reminderDaysBeforeExpiry,
    status: stockMutationStatus(expiryDate, reminderDaysBeforeExpiry),
    renewed_at: new Date().toISOString(),
    last_reminder_sent_at: null,
    last_expired_reminder_sent_at: null,
  };
  if (quantityRaw) patch.quantity = Number(quantityRaw);

  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("stock_items").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateStock();
  redirect(`/admin/stock?renewed=${encodeURIComponent(id)}`);
}
