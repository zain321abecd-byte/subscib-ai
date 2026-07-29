"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdmin, hasServiceRole } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

type ReviewInput = {
  name: string;
  initials: string;
  color: string | null;
  photo_url: string | null;
  rating: number;
  text: string;
  product_id: string | null;
  product_name: string | null;
  approved: boolean;
  sort_order: number;
};

function parse(formData: FormData): ReviewInput {
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const num = (k: string) => Number(formData.get(k) ?? 0);
  return {
    name: str("name"),
    initials: str("initials").slice(0, 4),
    color: str("color") || null,
    photo_url: str("photo_url") || null,
    rating: num("rating") || 5,
    text: str("text"),
    product_id: str("product_id") || null,
    product_name: str("product_name") || null,
    approved: formData.get("approved") === "on",
    sort_order: num("sort_order"),
  };
}

function bust() {
  // Reviews show on the homepage AND on every product detail page.
  // Bust the whole layout so all routes re-fetch.
  revalidatePath("/", "layout");
  revalidatePath("/admin/reviews");
}

function fail(msg: string): never {
  redirect(`/admin/reviews?error=${encodeURIComponent(msg)}`);
}

/**
 * Admin writes need the service-role client.
 *
 * RLS on `reviews` gates writes behind `is_admin()`, which resolves
 * `auth.uid()` from a Supabase Auth session. The admin portal authenticates
 * with its own JWT cookie (`subscribai-portal-token`, validated against the
 * backend `/portal/me`) and never creates a Supabase session — so `auth.uid()`
 * is null, `is_admin()` is false, and every insert/update/delete was rejected
 * by the policy's WITH CHECK. That is why saved reviews never appeared.
 *
 * `requireAdmin(...)` has already authorised the caller before we get here, so
 * bypassing RLS with the service role is the intended path (the schema's own
 * comments describe admin writes going through service-role server actions).
 */
function adminDb() {
  if (!hasServiceRole()) {
    fail(
      "SUPABASE_SERVICE_ROLE_KEY is not set on the server, so row-level security blocks admin writes. Add it in Vercel → Settings → Environment Variables (Production) and redeploy."
    );
  }
  return getSupabaseAdmin();
}

export async function createReview(formData: FormData): Promise<void> {
  await requireAdmin("reviews:moderate");
  const r = parse(formData);
  if (!r.name) fail("Name is required.");
  if (!r.text) fail("Review text is required.");
  if (r.rating < 1 || r.rating > 5) fail("Rating must be 1–5.");
  const supabase = adminDb();
  const { error } = await supabase.from("reviews").insert(r);
  if (error) fail(error.message);
  bust();
  redirect("/admin/reviews?created=1");
}

export async function updateReview(formData: FormData): Promise<void> {
  await requireAdmin("reviews:moderate");
  const id = String(formData.get("id") || "");
  if (!id) fail("Missing review id.");
  const r = parse(formData);
  if (!r.name || !r.text) fail("Name and text are required.");
  const supabase = adminDb();
  const { error } = await supabase.from("reviews").update(r).eq("id", id);
  if (error) fail(error.message);
  bust();
  redirect("/admin/reviews?updated=1");
}

export async function deleteReview(formData: FormData): Promise<void> {
  await requireAdmin("reviews:delete");
  const id = String(formData.get("id") || "");
  if (!id) fail("Missing review id.");
  const supabase = adminDb();
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) fail(error.message);
  bust();
  redirect("/admin/reviews?deleted=1");
}
