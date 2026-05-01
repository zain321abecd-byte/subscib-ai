"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

type FreebieInput = {
  id: string;
  title: string;
  description: string;
  icon_class: string | null;
  file_url: string | null;
  whatsapp_msg: string | null;
  sort_order: number;
  active: boolean;
};

function parse(formData: FormData, idFromHidden?: string): FreebieInput {
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const num = (k: string) => Number(formData.get(k) ?? 0);
  return {
    id: (idFromHidden ?? str("id")).toLowerCase(),
    title: str("title"),
    description: str("description"),
    icon_class: str("icon_class") || null,
    file_url: str("file_url") || null,
    whatsapp_msg: str("whatsapp_msg") || null,
    sort_order: num("sort_order"),
    active: formData.get("active") === "on",
  };
}

function bust() {
  revalidatePath("/freebies");
  revalidatePath("/admin/freebies");
}

function fail(msg: string): never {
  redirect(`/admin/freebies?error=${encodeURIComponent(msg)}`);
}

export async function createFreebie(formData: FormData): Promise<void> {
  const f = parse(formData);
  if (!SLUG_RE.test(f.id)) fail("Slug must be lowercase letters, numbers, or dashes.");
  if (!f.title) fail("Title is required.");
  if (!f.description) fail("Description is required.");
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("freebies").insert(f);
  if (error) fail(error.message);
  bust();
  redirect("/admin/freebies?created=1");
}

export async function updateFreebie(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "").trim();
  const original = String(formData.get("__original_id") || id);
  const f = parse(formData, id);
  if (!f.title || !f.description) fail("Title and description are required.");
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("freebies").update(f).eq("id", original);
  if (error) fail(error.message);
  bust();
  redirect("/admin/freebies?updated=1");
}

export async function deleteFreebie(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  if (!id) fail("Missing id.");
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("freebies").delete().eq("id", id);
  if (error) fail(error.message);
  bust();
  redirect("/admin/freebies?deleted=1");
}
