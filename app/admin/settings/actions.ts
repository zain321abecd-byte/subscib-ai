"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidateSettingsCache } from "@/lib/site-settings";

function fail(msg: string, returnTo: string): never {
  redirect(`${returnTo}?error=${encodeURIComponent(msg)}`);
}

/**
 * Save any subset of site settings. The form names every field as
 * `setting:<key>` and may include a hidden `__return_to` to control which
 * page we redirect back to.
 *
 * Boolean toggles are submitted with the hidden+checkbox pattern in the form
 * itself — that means an unchecked toggle still posts a "false" value via the
 * preceding hidden input, and a checked one posts "true" (or "on") which wins
 * because we dedupe-by-last in this action.
 */
export async function saveSettings(formData: FormData): Promise<void> {
  await requireAdmin("settings:write");
  const returnTo = String(formData.get("__return_to") || "/admin/settings");

  const supabase = await getSupabaseServer();

  // Dedupe by key — last value wins. This makes the hidden+checkbox pattern
  // for booleans work cleanly without server-side knowledge of which keys
  // are bools.
  const collected = new Map<string, string>();
  for (const [name, raw] of formData.entries()) {
    if (!name.startsWith("setting:")) continue;
    const key = name.slice("setting:".length);
    let value = String(raw);
    // Normalise checkbox "on" → "true" for consistency with hidden inputs.
    if (value === "on") value = "true";
    collected.set(key, value);
  }

  if (collected.size === 0) fail("Nothing to save.", returnTo);

  const updates = [...collected.entries()].map(([key, value]) => ({ key, value }));

  const { error } = await supabase
    .from("site_settings")
    .upsert(updates, { onConflict: "key" });
  if (error) fail(error.message, returnTo);

  invalidateSettingsCache();
  revalidatePath("/", "layout");
  redirect(`${returnTo}?saved=1`);
}
