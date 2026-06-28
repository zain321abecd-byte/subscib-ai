"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";

const VALID_STATUSES = ["pending", "paid", "delivered", "failed", "refunded", "cancelled"] as const;

export async function updateOrderStatus(formData: FormData): Promise<{ ok: false; error: string } | { ok: true }> {
  await requireAdmin("orders:write");
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id) return { ok: false, error: "Missing order id." };
  if (!VALID_STATUSES.includes(status as any)) return { ok: false, error: "Invalid status." };

  const supabase = await getSupabaseServer();
  const update: Record<string, unknown> = { status };
  if (status === "delivered") update.delivered_at = new Date().toISOString();

  const { error } = await supabase.from("orders").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  return { ok: true };
}

export async function updateOrderNotes(formData: FormData): Promise<{ ok: false; error: string } | { ok: true }> {
  await requireAdmin("orders:write");
  const id = String(formData.get("id") || "");
  const notes = String(formData.get("notes") || "");
  if (!id) return { ok: false, error: "Missing order id." };

  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("orders").update({ notes }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/orders/${id}`);
  return { ok: true };
}
