"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  PLAN_DURATIONS,
  PRODUCT_FORM_TYPES,
  isValidSlug,
  slugifyFormName,
  type ProductFormRow,
} from "@/lib/product-forms";

/**
 * Product form management. Service-role writes gated by requireAdmin(), the
 * same pattern as the other admin sections.
 */

export type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export type ProductFormInput = {
  name: string;
  product_type: string;
  product_id?: string | null;
  product_name: string;
  plan_duration: string;
  renewal_note?: string | null;
  price: number | null;
  currency?: string | null;
  intro?: string | null;
  active?: boolean;
  slug?: string | null;
};

function bust() {
  revalidatePath("/admin/product-forms");
  revalidatePath("/admin/sale-requests");
}

function validate(input: ProductFormInput): string | null {
  if (!input.name?.trim()) return "Form name is required.";
  if (!input.product_name?.trim()) return "Product name is required.";
  if (!PRODUCT_FORM_TYPES.some((t) => t.value === input.product_type)) return "Pick a valid product type.";
  if (!PLAN_DURATIONS.some((d) => d.value === input.plan_duration)) return "Pick a valid plan duration.";
  if (input.price != null && (!Number.isFinite(input.price) || input.price < 0)) {
    return "Price must be a non-negative number.";
  }
  if (input.slug && !isValidSlug(input.slug)) {
    return "The link must be lowercase letters, numbers and hyphens only.";
  }
  return null;
}

/** Pick a slug that isn't taken, appending -2, -3 … the way product ids do. */
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const root = slugifyFormName(base) || "form";
  let candidate = root;
  for (let n = 2; n < 100; n++) {
    let query = supabase.from("product_forms").select("id").eq("slug", candidate).limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query;
    if (!data || data.length === 0) return candidate;
    candidate = `${root}-${n}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

function payload(input: ProductFormInput) {
  return {
    name: input.name.trim().slice(0, 160),
    product_type: input.product_type,
    product_id: input.product_id?.trim() || null,
    product_name: input.product_name.trim().slice(0, 200),
    plan_duration: input.plan_duration,
    renewal_note: input.renewal_note?.trim().slice(0, 160) || null,
    price: input.price,
    currency: (input.currency || "PKR").trim().toUpperCase().slice(0, 8),
    intro: input.intro?.trim().slice(0, 600) || null,
    active: input.active !== false,
  };
}

export async function getProductForms(): Promise<ProductFormRow[]> {
  await requireAdmin("products:read");
  const { data, error } = await getSupabaseAdmin()
    .from("product_forms")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as ProductFormRow[];
}

/** Submission counts per form, for the list. */
export async function getFormRequestCounts(): Promise<Record<string, { total: number; pending: number }>> {
  await requireAdmin("products:read");
  const { data, error } = await getSupabaseAdmin().from("sale_requests").select("form_id, status");
  if (error || !data) return {};
  const out: Record<string, { total: number; pending: number }> = {};
  for (const row of data as Array<{ form_id: string | null; status: string }>) {
    if (!row.form_id) continue;
    out[row.form_id] ??= { total: 0, pending: 0 };
    out[row.form_id].total++;
    if (row.status === "pending") out[row.form_id].pending++;
  }
  return out;
}

export async function createProductForm(input: ProductFormInput): Promise<Result<ProductFormRow>> {
  const me = await requireAdmin("products:write");
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const slug = await uniqueSlug(input.slug?.trim() || input.name);

  const { data, error } = await getSupabaseAdmin()
    .from("product_forms")
    .insert({ ...payload(input), slug, created_by: me.userId })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  bust();
  return { ok: true, data: data as ProductFormRow };
}

export async function updateProductForm(id: string, input: ProductFormInput): Promise<Result<ProductFormRow>> {
  await requireAdmin("products:write");
  if (!id) return { ok: false, error: "Missing form id." };
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const patch: Record<string, unknown> = payload(input);
  // Slug is only rewritten when the admin explicitly changed it — existing
  // links that customers already have must keep working.
  if (input.slug?.trim()) {
    patch.slug = await uniqueSlug(input.slug.trim(), id);
  }

  const { data, error } = await getSupabaseAdmin()
    .from("product_forms")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "That form no longer exists." };
  bust();
  return { ok: true, data: data as ProductFormRow };
}

export async function setProductFormActive(id: string, active: boolean): Promise<Result<ProductFormRow>> {
  await requireAdmin("products:write");
  if (!id) return { ok: false, error: "Missing form id." };
  const { data, error } = await getSupabaseAdmin()
    .from("product_forms")
    .update({ active })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "That form no longer exists." };
  bust();
  return { ok: true, data: data as ProductFormRow };
}

/**
 * Issue a fresh link. The old URL stops working immediately — that's the point
 * of the button, for when a link has been shared somewhere it shouldn't be.
 */
export async function regenerateFormLink(id: string): Promise<Result<ProductFormRow>> {
  await requireAdmin("products:write");
  if (!id) return { ok: false, error: "Missing form id." };

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("product_forms").select("name").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "That form no longer exists." };

  const base = slugifyFormName((existing as { name: string }).name) || "form";
  const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;

  const { data, error } = await supabase
    .from("product_forms")
    .update({ slug })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "That form no longer exists." };
  bust();
  return { ok: true, data: data as ProductFormRow };
}

export async function deleteProductForm(id: string): Promise<Result> {
  await requireAdmin("products:delete");
  if (!id) return { ok: false, error: "Missing form id." };
  const { error } = await getSupabaseAdmin().from("product_forms").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  bust();
  return { ok: true };
}
