"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
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
  gallery: string[];
  related_product_ids: string[];
  in_stock: boolean;
  featured: boolean;
  show_in_related: boolean;
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
    gallery,
    related_product_ids,
    in_stock: formData.get("in_stock") === "on",
    featured: formData.get("featured") === "on",
    // Default to true unless the checkbox is explicitly omitted (it's `_off`
    // marker absent → checkbox unchecked).
    show_in_related: formData.get("show_in_related") === "on",
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

export async function createProduct(formData: FormData): Promise<{ ok: false; error: string } | never> {
  const p = parseForm(formData);
  const err = validate(p);
  if (err) return { ok: false, error: err };

  const supabase = await getSupabaseServer();

  // Auto-generate the URL id from the name. If "ChatGPT Plus" already exists,
  // we'll get "chatgpt-plus-2" automatically.
  const id = await ensureUniqueSlug(supabase, "products", "id", slugify(p.name));

  const { error } = await supabase.from("products").insert({ id, ...p });
  if (error) return { ok: false, error: error.message };

  bustCaches(id);
  redirect(`/admin/products?created=${encodeURIComponent(id)}`);
}

export async function updateProduct(formData: FormData): Promise<{ ok: false; error: string } | never> {
  const p = parseForm(formData);
  const originalId = String(formData.get("__original_id") || "").trim();
  if (!originalId) return { ok: false, error: "Missing original id." };
  const err = validate(p);
  if (err) return { ok: false, error: err };

  // Slug is sticky on edits — keep the existing URL stable so external links
  // don't break when admins tweak the product name.
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("products").update(p).eq("id", originalId);
  if (error) return { ok: false, error: error.message };

  bustCaches(originalId);
  redirect(`/admin/products?updated=${encodeURIComponent(originalId)}`);
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "").trim();
  if (!id) redirect(`/admin/products?error=${encodeURIComponent("Missing id.")}`);
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  bustCaches(id);
  redirect(`/admin/products?deleted=${encodeURIComponent(id)}`);
}
