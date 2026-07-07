"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { OrderRow } from "@/lib/supabase/types";

type FulfillmentStatus = NonNullable<OrderRow["fulfillment_status"]>;
type Result = { ok: true } | { ok: false; error: string };

const FULFILLMENT_STATUSES: FulfillmentStatus[] = ["pending", "in_progress", "activated", "rejected", "expired"];

function revalidateBundleOrders() {
  revalidatePath("/admin/bundle-orders");
  revalidatePath("/admin");
}

export async function updateBundleOrder(input: { id: string; fulfillmentStatus: FulfillmentStatus; adminNote: string }): Promise<Result> {
  await requireAdmin("orders:write");

  if (!input.id) return { ok: false, error: "Missing order id." };
  if (!FULFILLMENT_STATUSES.includes(input.fulfillmentStatus)) return { ok: false, error: "Invalid bundle order status." };

  const { error } = await getSupabaseAdmin()
    .from("orders")
    .update({
      fulfillment_status: input.fulfillmentStatus,
      notes: input.adminNote.trim() || null,
    })
    .eq("id", input.id)
    .eq("package_tier", "bundle");

  if (error) return { ok: false, error: error.message };
  revalidateBundleOrders();
  return { ok: true };
}
