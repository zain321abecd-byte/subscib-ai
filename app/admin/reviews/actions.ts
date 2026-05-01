"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";

type ReviewInput = {
  name: string;
  initials: string;
  color: string | null;
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

export async function createReview(formData: FormData): Promise<void> {
  const r = parse(formData);
  if (!r.name) fail("Name is required.");
  if (!r.text) fail("Review text is required.");
  if (r.rating < 1 || r.rating > 5) fail("Rating must be 1–5.");
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("reviews").insert(r);
  if (error) fail(error.message);
  bust();
  redirect("/admin/reviews?created=1");
}

export async function updateReview(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  if (!id) fail("Missing review id.");
  const r = parse(formData);
  if (!r.name || !r.text) fail("Name and text are required.");
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("reviews").update(r).eq("id", id);
  if (error) fail(error.message);
  bust();
  redirect("/admin/reviews?updated=1");
}

export async function deleteReview(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  if (!id) fail("Missing review id.");
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) fail(error.message);
  bust();
  redirect("/admin/reviews?deleted=1");
}
