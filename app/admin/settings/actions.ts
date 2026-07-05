"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { updateSiteSettings } from "@/lib/site-settings";

function fail(msg: string, returnTo: string): never {
  redirect(`${returnTo}?error=${encodeURIComponent(msg)}`);
}

/**
 * Save any subset of site settings. The form names every field as
 * `setting:<key>` and may include a hidden `__return_to` to control
 * which page we redirect back to after a successful save.
 *
 * Behaviour:
 *   • Every value is sanitised (script/html rejection, phone digit
 *     normalisation, email + URL validation) via `sanitiseSettingValue`.
 *   • On validation failure the redirect carries an ?error= querystring
 *     so the section page can surface it.
 *   • Canonical keys are also mirrored to their legacy aliases (e.g.
 *     `meta_pixel_id` → `seo_facebook_pixel`) so older render paths
 *     that still read the old name keep working.
 *   • updateSiteSettings() upserts missing keys, mirrors legacy aliases,
 *     invalidates the `site-settings` tag, and revalidates public pages
 *     so changes appear on refresh without a redeploy.
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

  try {
    await updateSiteSettings(Object.fromEntries(collected));
  } catch (error) {
    fail(error instanceof Error ? error.message : "Unable to save settings.", returnTo);
  }

  redirect(`${returnTo}?saved=1`);
}
