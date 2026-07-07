"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };

const PRICE_TYPES = ["fixed", "custom"] as const;

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseFeatures(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}

export async function updatePricingPlan(formData: FormData): Promise<Result> {
  await requireAdmin("settings:write");

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const slug = slugify(String(formData.get("slug") || name));
  const description = String(formData.get("description") || "").trim();
  const monthlyPrice = Number(formData.get("monthly_price") || 0);
  const yearlyPrice = Number(formData.get("yearly_price") || 0);
  const currency = String(formData.get("currency") || "PKR").trim().toUpperCase();
  const features = parseFeatures(String(formData.get("features") || ""));
  const badgeText = String(formData.get("badge_text") || "").trim() || null;
  const buttonText = String(formData.get("button_text") || "").trim() || null;
  const isPopular = formData.get("is_popular") === "on";
  const isActive = formData.get("is_active") === "on";
  const priceType = String(formData.get("price_type") || "fixed");
  const sortOrder = Number(formData.get("sort_order") || 0);

  if (!id) return { ok: false, error: "Missing plan id." };
  if (!name) return { ok: false, error: "Plan name is required." };
  if (!slug) return { ok: false, error: "Slug is required." };
  if (!currency) return { ok: false, error: "Currency is required." };
  if (!PRICE_TYPES.includes(priceType as any)) return { ok: false, error: "Invalid price type." };
  if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) return { ok: false, error: "Monthly price must be zero or greater." };
  if (!Number.isFinite(yearlyPrice) || yearlyPrice < 0) return { ok: false, error: "Yearly price must be zero or greater." };
  if (!Number.isFinite(sortOrder)) return { ok: false, error: "Sort order must be a number." };

  const { error } = await getSupabaseAdmin()
    .from("pricing_plans")
    .update({
      name,
      slug,
      description,
      monthly_price: monthlyPrice,
      yearly_price: yearlyPrice,
      currency,
      features,
      badge_text: badgeText,
      button_text: buttonText,
      is_popular: isPopular,
      is_active: isActive,
      price_type: priceType,
      sort_order: sortOrder,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/pricing-plans");
  revalidatePath("/prices");
  return { ok: true };
}
