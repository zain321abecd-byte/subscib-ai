"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { aliasesFor, sanitiseSettingValue, SETTINGS_TAG } from "@/lib/site-settings";

/** Paths that read from site_settings — invalidated after every save. */
const REVALIDATE_PATHS = ["/", "/shop", "/checkout", "/contact", "/blog"];

function fail(msg: string, returnTo: string): never {
  redirect(`${returnTo}?error=${encodeURIComponent(msg)}`);
}

/**
 * Save any subset of site settings. The form names every field as
 * `setting:<key>` and may include a hidden `__return_to` to control
 * which page we redirect back to after a successful save.
 *
 * Behaviour:
 *   • Every value is sanitised (script-tag stripping, phone digit
 *     normalisation, email + URL validation) via `sanitiseSettingValue`.
 *   • On validation failure the redirect carries an ?error= querystring
 *     so the section page can surface it.
 *   • Canonical keys are also mirrored to their legacy aliases (e.g.
 *     `meta_pixel_id` → `seo_facebook_pixel`) so older render paths
 *     that still read the old name keep working.
 *   • `revalidateTag(SETTINGS_TAG)` invalidates the tagged cache used
 *     by getSiteSettings() — every consumer picks up the new value on
 *     the next request without a redeploy.
 *   • `revalidatePath(…)` on the layout + on every setting-dependent
 *     path forces static + ISR pages to rebuild too.
 *
 * Boolean toggles use the hidden+checkbox pattern in the form itself:
 * an unchecked toggle posts "false" via the preceding hidden input,
 * a checked one posts "on" (normalised to "true") which wins because
 * we dedupe-by-last-seen.
 */
export async function saveSettings(formData: FormData): Promise<void> {
  await requireAdmin("settings:write");
  const returnTo = String(formData.get("__return_to") || "/admin/settings");

  // 1 · Collect + dedupe (last-value-wins for hidden/checkbox pairs).
  const collected = new Map<string, string>();
  for (const [name, raw] of formData.entries()) {
    if (!name.startsWith("setting:")) continue;
    const key = name.slice("setting:".length);
    let value = String(raw);
    if (value === "on") value = "true";
    collected.set(key, value);
  }
  if (collected.size === 0) fail("Nothing to save.", returnTo);

  // 2 · Sanitise + validate. Bail on the first hard-invalid field.
  const cleaned: Array<{ key: string; value: string }> = [];
  for (const [key, raw] of collected) {
    const result = sanitiseSettingValue(key, raw);
    if ("error" in result) fail(result.error, returnTo);
    cleaned.push({ key, value: result.value });
    // Mirror to any historical alias so legacy consumers stay in sync.
    for (const alias of aliasesFor(key)) {
      cleaned.push({ key: alias, value: result.value });
    }
  }

  // 3 · Upsert. Errors bubble up as ?error= on the redirect.
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("site_settings").upsert(cleaned, { onConflict: "key" });
  if (error) fail(error.message, returnTo);

  // 4 · Invalidate every cache surface. Tag first (cheap, works across
  //    every unstable_cache reader), then path revalidation for pages
  //    that opt into it.
  revalidateTag(SETTINGS_TAG);
  revalidatePath("/", "layout");
  for (const p of REVALIDATE_PATHS) {
    try { revalidatePath(p); } catch { /* path may not exist yet — ignore */ }
  }

  redirect(`${returnTo}?saved=1`);
}
