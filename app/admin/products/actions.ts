"use server";

import { normaliseImageRatio } from "@/lib/image-ratio";
import { parseCrop, serializeCrop } from "@/lib/image-crop";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { ensureUniqueSlug, slugify } from "@/lib/slug";

export type ProductFormData = {
  name: string;
  description: string;
  price: number;
  category: "ai-subscriptions" | "design-tools" | "productivity" | "automation" | "courses";
  brand: string | null;
  tag: string | null;
  icon_class: string | null;
  media_class: "media-green" | "media-blue" | "media-pink" | "media-orange";
  image_url: string | null;
  display_source: string | null;
  gallery: string[];
  related_product_ids: string[];
  features: string[];
  private_price: number | null;
  private_description: string | null;
  shared_label: string | null;
  private_label: string | null;
  variation_config: unknown | null;
  in_stock: boolean;
  featured: boolean;
  show_on_homepage: boolean;
  show_in_related: boolean;
  hide_shared_plan: boolean;
  image_fit: string;
  image_ratio: string;
  image_crop: string | null;
  sort_order: number;
};

function parseForm(formData: FormData): ProductFormData {
  const num = (v: FormDataEntryValue | null) => (v == null ? 0 : Number(v));
  const str = (v: FormDataEntryValue | null) => (v == null ? "" : String(v).trim());

  function parseStringArray(raw: string): string[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((u): u is string => typeof u === "string" && u.length > 0)
        : [];
    } catch {
      return [];
    }
  }
  const gallery = parseStringArray(str(formData.get("gallery")));
  const related_product_ids = parseStringArray(str(formData.get("related_product_ids")));
  const features = parseStringArray(str(formData.get("features")));
  function parseVariationConfig(raw: string): unknown | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  return {
    name: str(formData.get("name")),
    description: str(formData.get("description")),
    price: num(formData.get("price")),
    category: str(formData.get("category")) as ProductFormData["category"],
    brand: str(formData.get("brand")) || null,
    tag: str(formData.get("tag")) || null,
    icon_class: str(formData.get("icon_class")) || null,
    media_class: (str(formData.get("media_class")) || "media-blue") as ProductFormData["media_class"],
    image_url: str(formData.get("image_url")) || null,
    display_source: (() => {
      const v = str(formData.get("display_source"));
      return v === "image" || v === "brand" ? v : null;
    })(),
    gallery,
    related_product_ids,
    features,
    private_price: (() => {
      const v = str(formData.get("private_price"));
      const n = Number(v);
      return v === "" || !Number.isFinite(n) || n <= 0 ? null : n;
    })(),
    private_description: str(formData.get("private_description")) || null,
    shared_label: str(formData.get("shared_label")) || null,
    private_label: str(formData.get("private_label")) || null,
    variation_config: parseVariationConfig(str(formData.get("variation_config"))),
    in_stock: formData.get("in_stock") === "on",
    featured: formData.get("featured") === "on",
    show_on_homepage: formData.get("show_on_homepage") === "on",
    // Default to true unless the checkbox is explicitly omitted (it's `_off`
    // marker absent → checkbox unchecked).
    show_in_related: formData.get("show_in_related") === "on",
    hide_shared_plan: formData.get("hide_shared_plan") === "on",
    // Only "contain" and "cover" are valid here; "contain" is the historical
    // default and stays the fallback.
    image_fit: str(formData.get("image_fit")) === "cover" ? "cover" : "contain",
    image_ratio: normaliseImageRatio(str(formData.get("image_ratio"))),
    image_crop: serializeCrop(parseCrop(str(formData.get("image_crop")))) || null,
    sort_order: num(formData.get("sort_order")),
  };
}

function validate(p: ProductFormData): string | null {
  if (!p.name) return "Name is required.";
  if (!Number.isFinite(p.price) || p.price < 0) return "Price must be a non-negative number.";
  if (!p.category) return "Category is required.";
  return null;
}

function bustCaches(id: string) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/product/${id}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/products");
}

function missingVariationColumn(error: any): boolean {
  const msg = String(error?.message || "");
  return msg.includes("variation_config") && /column|schema|cache/i.test(msg);
}

function withoutVariationConfig(p: ProductFormData) {
  const { variation_config, ...rest } = p;
  return rest;
}

type ReviewInput = {
  id?: string;
  name: string;
  initials: string;
  color: string;
  rating: number;
  text: string;
  approved: boolean;
};

function parseReviews(formData: FormData): ReviewInput[] {
  const raw = String(formData.get("product_reviews") || "");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((r: any) => ({
        id: typeof r.id === "string" ? r.id : undefined,
        name: String(r.name || "").trim(),
        initials: String(r.initials || "").trim().slice(0, 4),
        color: String(r.color || "var(--brand-soft)"),
        rating: Math.max(1, Math.min(5, Number(r.rating) || 5)),
        text: String(r.text || "").trim(),
        approved: r.approved !== false,
      }))
      .filter((r) => r.name && r.text);
  } catch {
    return [];
  }
}

// Sync reviews for a product: insert new ones, update changed ones, and
// delete any rows the admin removed. All scoped to product_id.
async function syncProductReviews(
  supabase: any,
  productId: string,
  productName: string,
  reviews: ReviewInput[],
) {
  // Pull existing review ids for this product so we know what to delete.
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("product_id", productId);
  const existingIds: string[] = (existing ?? []).map((r: any) => r.id);
  const submittedIds = new Set(reviews.map((r) => r.id).filter(Boolean) as string[]);

  // Delete reviews that were removed in the form.
  const toDelete = existingIds.filter((id) => !submittedIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("reviews").delete().in("id", toDelete);
  }

  // Upsert the rest.
  for (const r of reviews) {
    const row = {
      ...(r.id ? { id: r.id } : {}),
      name: r.name,
      initials: r.initials,
      color: r.color,
      rating: r.rating,
      text: r.text,
      approved: r.approved,
      product_id: productId,
      product_name: productName,
    };
    if (r.id) {
      await supabase.from("reviews").update(row).eq("id", r.id);
    } else {
      await supabase.from("reviews").insert(row);
    }
  }
}

export async function createProduct(formData: FormData): Promise<{ ok: false; error: string } | never> {
  await requireAdmin("products:write");
  const p = parseForm(formData);
  const err = validate(p);
  if (err) return { ok: false, error: err };

  const supabase = await getSupabaseServer();

  // Auto-generate the URL id from the name. If "ChatGPT Plus" already exists,
  // we'll get "chatgpt-plus-2" automatically.
  const id = await ensureUniqueSlug(supabase, "products", "id", slugify(p.name));

  let { error } = await supabase.from("products").insert({ id, ...p });
  if (error && missingVariationColumn(error)) {
    ({ error } = await supabase.from("products").insert({ id, ...withoutVariationConfig(p) }));
  }
  if (error) return { ok: false, error: error.message };

  // Reviews (best-effort — don't block the product save if this fails).
  try {
    await syncProductReviews(supabase, id, p.name, parseReviews(formData));
  } catch (e) {
    console.error("[createProduct] reviews sync failed", e);
  }

  bustCaches(id);
  redirect(`/admin/products?created=${encodeURIComponent(id)}`);
}

export async function updateProduct(formData: FormData): Promise<{ ok: false; error: string } | never> {
  await requireAdmin("products:write");
  const p = parseForm(formData);
  const originalId = String(formData.get("__original_id") || "").trim();
  if (!originalId) return { ok: false, error: "Missing original id." };
  const err = validate(p);
  if (err) return { ok: false, error: err };

  // Slug is sticky on edits — keep the existing URL stable so external links
  // don't break when admins tweak the product name.
  const supabase = await getSupabaseServer();
  let { error } = await supabase.from("products").update(p).eq("id", originalId);
  if (error && missingVariationColumn(error)) {
    ({ error } = await supabase.from("products").update(withoutVariationConfig(p)).eq("id", originalId));
  }
  if (error) return { ok: false, error: error.message };

  try {
    await syncProductReviews(supabase, originalId, p.name, parseReviews(formData));
  } catch (e) {
    console.error("[updateProduct] reviews sync failed", e);
  }

  bustCaches(originalId);
  redirect(`/admin/products?updated=${encodeURIComponent(originalId)}`);
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin("products:delete");
  const id = String(formData.get("id") || "").trim();
  if (!id) redirect(`/admin/products?error=${encodeURIComponent("Missing id.")}`);
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  bustCaches(id);
  redirect(`/admin/products?deleted=${encodeURIComponent(id)}`);
}
