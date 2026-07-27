"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";

type CouponInput = {
  code: string;
  discount_type: "percent" | "fixed";
  value: number;
  active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  note: string | null;
};

function parse(formData: FormData): CouponInput {
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const discountType = str("discount_type") === "fixed" ? "fixed" : "percent";
  const expiresRaw = str("expires_at");
  const maxUsesRaw = str("max_uses");
  return {
    code: str("code").toUpperCase().replace(/\s+/g, ""),
    discount_type: discountType,
    value: Number(str("value")) || 0,
    active: formData.get("active") === "on",
    expires_at: expiresRaw ? new Date(expiresRaw).toISOString() : null,
    max_uses: maxUsesRaw ? Math.max(1, Math.floor(Number(maxUsesRaw))) : null,
    note: str("note") || null,
  };
}

function bust() {
  revalidatePath("/admin/coupons");
}

function fail(msg: string): never {
  redirect(`/admin/coupons?error=${encodeURIComponent(msg)}`);
}

export async function createCoupon(formData: FormData): Promise<void> {
  await requireAdmin("settings:write");
  const c = parse(formData);
  if (!c.code) fail("Code is required.");
  if (c.value <= 0) fail("Discount value must be greater than 0.");
  if (c.discount_type === "percent" && c.value > 100) fail("Percent discount cannot exceed 100.");
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("coupons").insert(c);
  if (error) fail(error.message);
  bust();
  redirect("/admin/coupons?created=1");
}

export async function updateCoupon(formData: FormData): Promise<void> {
  await requireAdmin("settings:write");
  const id = String(formData.get("id") || "");
  if (!id) fail("Missing coupon id.");
  const c = parse(formData);
  if (!c.code) fail("Code is required.");
  if (c.value <= 0) fail("Discount value must be greater than 0.");
  if (c.discount_type === "percent" && c.value > 100) fail("Percent discount cannot exceed 100.");
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("coupons").update(c).eq("id", id);
  if (error) fail(error.message);
  bust();
  redirect("/admin/coupons?updated=1");
}

export async function toggleCoupon(formData: FormData): Promise<void> {
  await requireAdmin("settings:write");
  const id = String(formData.get("id") || "");
  const active = formData.get("next_active") === "1";
  if (!id) fail("Missing coupon id.");
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("coupons").update({ active }).eq("id", id);
  if (error) fail(error.message);
  bust();
  redirect("/admin/coupons");
}

export async function deleteCoupon(formData: FormData): Promise<void> {
  await requireAdmin("settings:write");
  const id = String(formData.get("id") || "");
  if (!id) fail("Missing coupon id.");
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) fail(error.message);
  bust();
  redirect("/admin/coupons?deleted=1");
}
