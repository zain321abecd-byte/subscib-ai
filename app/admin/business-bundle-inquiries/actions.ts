"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { BusinessBundleInquiryStatus } from "@/lib/supabase/types";

type Result = { ok: true } | { ok: false; error: string };

const STATUSES: BusinessBundleInquiryStatus[] = ["new", "contacted", "resolved", "rejected"];

export async function updateBusinessBundleInquiry(input: {
  id: string;
  status: BusinessBundleInquiryStatus;
  adminNote: string;
}): Promise<Result> {
  await requireAdmin("orders:write");

  if (!input.id) return { ok: false, error: "Missing inquiry id." };
  if (!STATUSES.includes(input.status)) return { ok: false, error: "Invalid inquiry status." };

  const { error } = await getSupabaseAdmin()
    .from("business_bundle_inquiries")
    .update({
      status: input.status,
      admin_note: input.adminNote.trim() || null,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/business-bundle-inquiries");
  revalidatePath("/admin");
  return { ok: true };
}
