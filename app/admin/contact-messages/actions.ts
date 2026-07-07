"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ContactMessageStatus } from "@/lib/supabase/types";

type Result = { ok: true } | { ok: false; error: string };

const VALID_STATUSES: ContactMessageStatus[] = ["unread", "read", "resolved"];

export async function updateContactMessageStatus(id: string, status: ContactMessageStatus): Promise<Result> {
  await requireAdmin();

  if (!id) return { ok: false, error: "Missing contact message id." };
  if (!VALID_STATUSES.includes(status)) return { ok: false, error: "Invalid contact message status." };

  const { error } = await getSupabaseAdmin()
    .from("contact_messages")
    .update({ status })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/contact-messages");
  return { ok: true };
}
