"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { invalidateSettingsCache } from "@/lib/site-settings";

function fail(msg: string): never {
  redirect(`/admin/settings?error=${encodeURIComponent(msg)}`);
}

export async function saveSettings(formData: FormData): Promise<void> {
  const supabase = await getSupabaseServer();

  // Each form field is `setting:<key>`. Persist them as JSON values.
  const updates: { key: string; value: unknown }[] = [];
  for (const [name, raw] of formData.entries()) {
    if (!name.startsWith("setting:")) continue;
    const key = name.slice("setting:".length);
    const value = String(raw);
    updates.push({ key, value });
  }

  if (updates.length === 0) fail("Nothing to save.");

  // Upsert each key. We expect the row to already exist (seeded), but upsert
  // covers the new-key case too.
  const { error } = await supabase
    .from("site_settings")
    .upsert(updates, { onConflict: "key" });
  if (error) fail(error.message);

  // Bust the in-memory settings cache used by Footer/WhatsAppFab/hero, then
  // bust Next's layout-level cache so every public route re-fetches.
  invalidateSettingsCache();
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}
