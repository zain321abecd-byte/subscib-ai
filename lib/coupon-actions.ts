"use server";

/**
 * Promo-code server actions — shared by the product page ("Have a promo
 * code?"), the cart, and checkout. Coupons are managed in /admin/coupons
 * and stored in the `coupons` table (supabase/15-coupons.sql).
 */

import { getSupabaseServer } from "@/lib/supabase/server";

export type ValidatedCoupon = {
  code: string;
  discountType: "percent" | "fixed";
  value: number;
};

export type CouponResult =
  | { ok: true; coupon: ValidatedCoupon }
  | { ok: false; error: string };

export async function validateCoupon(rawCode: string): Promise<CouponResult> {
  const code = (rawCode || "").trim();
  if (!code) return { ok: false, error: "Enter a promo code." };
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("coupons")
      .select("code, discount_type, value, active, expires_at, max_uses, used_count")
      .ilike("code", code)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[coupons] validate failed", error);
      return { ok: false, error: "Could not check the code. Try again." };
    }
    if (!data || !data.active) return { ok: false, error: "This promo code is not valid." };
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return { ok: false, error: "This promo code has expired." };
    }
    if (data.max_uses != null && data.used_count >= data.max_uses) {
      return { ok: false, error: "This promo code has been fully redeemed." };
    }
    const discountType = data.discount_type === "fixed" ? "fixed" : "percent";
    const value = Number(data.value);
    if (!Number.isFinite(value) || value <= 0) {
      return { ok: false, error: "This promo code is not valid." };
    }
    return { ok: true, coupon: { code: data.code, discountType, value } };
  } catch (e) {
    console.error("[coupons] validate crashed", e);
    return { ok: false, error: "Promo codes are unavailable right now." };
  }
}

/** Best-effort usage bump at order time — never blocks checkout. */
export async function redeemCoupon(code: string): Promise<void> {
  if (!code) return;
  try {
    const supabase = await getSupabaseServer();
    await supabase.rpc("redeem_coupon", { p_code: code });
  } catch (e) {
    console.error("[coupons] redeem failed", e);
  }
}
