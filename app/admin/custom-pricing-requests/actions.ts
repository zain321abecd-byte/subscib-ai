"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { CustomPricingRequestStatus } from "@/lib/supabase/types";

type Result = { ok: true } | { ok: false; error: string };

const STATUSES: CustomPricingRequestStatus[] = ["new", "contacted", "in_progress", "converted", "rejected"];

export async function updateCustomPricingRequest(input: {
  id: string;
  status: CustomPricingRequestStatus;
  adminNote: string;
}): Promise<Result> {
  await requireAdmin("orders:write");

  if (!input.id) return { ok: false, error: "Missing request id." };
  if (!STATUSES.includes(input.status)) return { ok: false, error: "Invalid request status." };

  const { error } = await getSupabaseAdmin()
    .from("custom_pricing_requests")
    .update({
      status: input.status,
      admin_note: input.adminNote.trim() || null,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/custom-pricing-requests");
  revalidatePath("/admin");
  return { ok: true };
}
