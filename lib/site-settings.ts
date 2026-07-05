import { unstable_cache } from "next/cache";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { SiteSettingRow } from "@/lib/supabase/types";

/**
 * Single source of truth for every setting the admin can flip from the
 * back-office. Keys are stable strings — never rename an existing key
 * (aliases below handle historical renames). Whenever the admin saves,
 * `revalidateTag("site-settings")` is called and every consumer picks
 * up the new values on the next request without a redeploy.
 */
export const SETTINGS_TAG = "site-settings";

export const SETTINGS_REVALIDATE_PATHS = [
  "/",
  "/shop",
  "/prices",
  "/checkout",
  "/contact",
  "/faq",
  "/blog",
  "/cart",
  "/thank-you",
  "/sitemap.xml",
  "/robots.txt",
];

/**
 * Safe defaults returned when a key isn't present in the DB row set.
 * Every consumer reads via `getSiteSettings()` and destructures — the
 * fallback here guarantees the field is always a string.
 */
const FALLBACKS: Record<string, string> = {
  // ── Business / contact ──────────────────────────────────────────
  whatsapp_number:    "",
  contact_email:      "",
  support_phone:      "",
  business_name:      "SubscribAI",
  business_address:   "",
  footer_text:        "",

  // ── Hero / homepage copy ────────────────────────────────────────
  hero_headline:      "Premium AI subscriptions, paid in your local currency.",
  hero_subtext:       "Activated to your inbox in under 30 minutes.",

  // ── Socials ─────────────────────────────────────────────────────
  social_instagram:   "",
  social_facebook:    "",
  social_tiktok:      "",
  social_youtube:     "",

  // ── Currency / region ───────────────────────────────────────────
  currency_mode:        "auto",       // auto | always_pkr | always_usd | dual
  fx_rate_pkr_per_usd:  "",
  currency_switcher:    "true",
  currency_display:     "local",

  // ── SEO metadata ────────────────────────────────────────────────
  seo_site_title:           "SubscribAI — Premium AI Subscriptions",
  seo_default_description:  "Premium AI subscriptions delivered in minutes. ChatGPT Plus, Claude Pro, Midjourney, Canva, Notion AI, automation packs, and full courses.",
  seo_default_keywords:     "AI subscriptions, ChatGPT Plus, Claude Pro, Midjourney, Canva Pro",
  seo_og_image:             "",
  seo_twitter_handle:       "",
  seo_index_site:           "true",   // "false" → sitewide noindex

  // ── Tracking (canonical key names — see aliases below) ──────────
  google_analytics_id:      "",
  google_tag_manager_id:    "",
  google_site_verification: "",
  meta_pixel_id:            "",
  facebook_pixel_id:        "",
};

/**
 * Historical → canonical key aliases. We used to prefix every SEO/
 * tracking field with "seo_". New settings drop the prefix. Both
 * spellings resolve to the same effective value: whichever is set (a
 * non-empty string) wins, with the canonical key taking precedence
 * when both are present. Aliases are also written back to both keys
 * on save so a future consumer reading either name still works.
 */
const KEY_ALIASES: Record<string, string> = {
  seo_google_analytics:     "google_analytics_id",
  seo_google_verification:  "google_site_verification",
  seo_facebook_pixel:       "meta_pixel_id",
  facebook_pixel_id:        "meta_pixel_id",
};
/** Reverse lookup for save-time mirroring (canonical → all legacy aliases). */
const CANONICAL_TO_ALIASES: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const [alias, canonical] of Object.entries(KEY_ALIASES)) {
    (out[canonical] ??= []).push(alias);
  }
  return out;
})();
export function aliasesFor(canonical: string): string[] {
  return CANONICAL_TO_ALIASES[canonical] ?? [];
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

/**
 * Cookie-free anon Supabase client. site_settings is publicly readable
 * via RLS, so we don't need the visitor's session — and we MUST NOT
 * touch `cookies()` from inside `unstable_cache` (Next throws
 * "Route used `cookies` inside `unstable_cache`" at production runtime;
 * the same call is only a dev-mode warning, which is why local worked
 * and production 500'd).
 */
let anonClient: SupabaseClient | null = null;
function getPublicAnonClient(): SupabaseClient | null {
  if (anonClient) return anonClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  anonClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return anonClient;
}

/**
 * Fetch every row of site_settings and fold aliases into their canonical
 * keys. Cached under a Next tag so `revalidateTag("site-settings")` on
 * admin save invalidates every render path immediately (works across
 * Server Components, generateMetadata, route handlers, etc.).
 */
const fetchAllSettings = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const supabase = getPublicAnonClient();
    if (!supabase) return { ...FALLBACKS };
    try {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error || !data) return { ...FALLBACKS };
      const map: Record<string, string> = { ...FALLBACKS };
      // First pass — write raw values by their literal key.
      for (const row of data as SiteSettingRow[]) {
        const v = asString(row.value).trim();
        if (v) map[row.key] = v;
      }
      // Second pass — copy legacy alias values onto their canonical key
      // when the canonical slot is empty. Canonical always wins if set.
      for (const [alias, canonical] of Object.entries(KEY_ALIASES)) {
        if (!map[canonical] && map[alias]) map[canonical] = map[alias];
      }
      return map;
    } catch {
      return { ...FALLBACKS };
    }
  },
  ["site-settings-all"],
  { tags: [SETTINGS_TAG] },
);

export async function getSiteSettings(): Promise<Record<string, string>> {
  return fetchAllSettings();
}

export async function getSiteSetting(key: string, fallback = ""): Promise<string> {
  const settings = await getSiteSettings();
  return settings[key] ?? fallback;
}

export async function getSetting(key: string, fallback = ""): Promise<string> {
  return getSiteSetting(key, fallback);
}

/**
 * Legacy in-process cache buster — kept as a no-op so existing call
 * sites don't break. Real invalidation now happens through
 * `revalidateTag(SETTINGS_TAG)` in the save action.
 */
export function invalidateSettingsCache(): void { /* kept for API compat */ }

// ── Sanitisers used by the save action ──────────────────────────────
/** Strip anything that looks like markup so the admin can't paste a
 *  raw `<script>` tag into a pixel/verification field. */
export function stripUnsafe(v: string): string {
  return v
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/javascript:/gi, "")
    .trim();
}

function hasUnsafeInput(v: string): boolean {
  return /<script[\s\S]*?<\/script>/i.test(v) || /<[^>]+>/i.test(v) || /javascript:/i.test(v);
}

/** Normalise a phone / WhatsApp number: keep digits only. */
export function normalisePhoneDigits(v: string): string {
  return v.replace(/[^\d]/g, "");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v);
}

/**
 * Per-key validators + transformers. Missing keys pass through with
 * only the `stripUnsafe()` treatment applied.
 *
 * Signature: input string → either the cleaned value, or an Error
 * message string to reject the save.
 */
type SanitiseResult = { value: string } | { error: string };
function cleanPlainSetting(v: string, label: string, pattern: RegExp, maxLength: number): SanitiseResult {
  if (hasUnsafeInput(v)) return { error: `${label} must be an ID/token only, not HTML or script code.` };
  const s = stripUnsafe(v).trim();
  if (!s) return { value: "" };
  if (s.length > maxLength || !pattern.test(s)) {
    return { error: `${label} must be a plain ID/token only.` };
  }
  return { value: s };
}

const SANITISERS: Record<string, (v: string) => SanitiseResult> = {
  contact_email: (v) => {
    if (hasUnsafeInput(v)) return { error: "Contact email cannot contain HTML or script code." };
    const s = stripUnsafe(v);
    if (!s) return { value: "" };
    return isValidEmail(s) ? { value: s } : { error: "Contact email must be a valid email address." };
  },
  whatsapp_number: (v) => {
    if (hasUnsafeInput(v)) return { error: "WhatsApp number cannot contain HTML or script code." };
    return { value: normalisePhoneDigits(v) };
  },
  support_phone: (v) => {
    if (hasUnsafeInput(v)) return { error: "Support phone cannot contain HTML or script code." };
    return { value: normalisePhoneDigits(v) };
  },

  // Pixel + analytics + verification tokens are opaque identifier
  // strings. Reject markup/scripts instead of trying to execute or store them.
  meta_pixel_id:            (v) => cleanPlainSetting(v, "Meta Pixel ID", /^[A-Za-z0-9_-]+$/, 80),
  facebook_pixel_id:        (v) => cleanPlainSetting(v, "Facebook Pixel ID", /^[A-Za-z0-9_-]+$/, 80),
  google_analytics_id:      (v) => cleanPlainSetting(v, "Google Analytics ID", /^[A-Za-z0-9_-]+$/, 40),
  google_tag_manager_id:    (v) => cleanPlainSetting(v, "Google Tag Manager ID", /^[A-Za-z0-9_-]+$/, 40),
  google_site_verification: (v) => cleanPlainSetting(v, "Google verification token", /^[A-Za-z0-9._:-]+$/, 180),
  // Legacy alias fields get the same treatment so old admin pages
  // continue to save valid values.
  seo_facebook_pixel:       (v) => cleanPlainSetting(v, "Meta Pixel ID", /^[A-Za-z0-9_-]+$/, 80),
  seo_google_analytics:     (v) => cleanPlainSetting(v, "Google Analytics ID", /^[A-Za-z0-9_-]+$/, 40),
  seo_google_verification:  (v) => cleanPlainSetting(v, "Google verification token", /^[A-Za-z0-9._:-]+$/, 180),

  // Social URLs — must look vaguely like a URL if set.
  social_instagram: (v) => {
    if (hasUnsafeInput(v)) return { error: "Instagram URL cannot contain HTML or script code." };
    const s = stripUnsafe(v);
    if (!s) return { value: "" };
    return isSafeHttpUrl(s) ? { value: s } : { error: "Instagram must be a full URL (https://...)." };
  },
  social_facebook: (v) => {
    if (hasUnsafeInput(v)) return { error: "Facebook URL cannot contain HTML or script code." };
    const s = stripUnsafe(v);
    if (!s) return { value: "" };
    return isSafeHttpUrl(s) ? { value: s } : { error: "Facebook must be a full URL (https://...)." };
  },
  social_tiktok: (v) => {
    if (hasUnsafeInput(v)) return { error: "TikTok URL cannot contain HTML or script code." };
    const s = stripUnsafe(v);
    if (!s) return { value: "" };
    return isSafeHttpUrl(s) ? { value: s } : { error: "TikTok must be a full URL (https://...)." };
  },
  social_youtube: (v) => {
    if (hasUnsafeInput(v)) return { error: "YouTube URL cannot contain HTML or script code." };
    const s = stripUnsafe(v);
    if (!s) return { value: "" };
    return isSafeHttpUrl(s) ? { value: s } : { error: "YouTube must be a full URL (https://...)." };
  },
};

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Public entry point — normalise + validate a single (key, value) pair. */
export function sanitiseSettingValue(key: string, raw: string): SanitiseResult {
  const fn = SANITISERS[key];
  if (fn) return fn(raw);
  // Free-text field (hero_headline, business_name, footer_text, …).
  if (hasUnsafeInput(raw)) return { error: `${key} cannot contain HTML or script code.` };
  return { value: stripUnsafe(raw) };
}

function revalidateSettingsSurfaces(): void {
  revalidateTag(SETTINGS_TAG);
  revalidatePath("/", "layout");
  for (const path of SETTINGS_REVALIDATE_PATHS) {
    try {
      revalidatePath(path);
    } catch {
      // Some paths may not exist in older branches; settings saves should still work.
    }
  }
}

export async function updateSiteSettings(settingsObject: Record<string, string>): Promise<void> {
  const cleaned: Array<{ key: string; value: string }> = [];
  for (const [key, raw] of Object.entries(settingsObject)) {
    const result = sanitiseSettingValue(key, raw);
    if ("error" in result) throw new Error(result.error);
    cleaned.push({ key, value: result.value });
    for (const alias of aliasesFor(key)) {
      cleaned.push({ key: alias, value: result.value });
    }
  }

  if (cleaned.length === 0) return;
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("site_settings").upsert(cleaned, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidateSettingsSurfaces();
}

export async function updateSiteSetting(key: string, value: string): Promise<void> {
  await updateSiteSettings({ [key]: value });
}

// ── Convenience derived getters used by public components ───────────
/** Cleaned WhatsApp digits ready to drop into `https://wa.me/<here>`. */
export async function getWhatsAppLinkDigits(): Promise<string> {
  const s = await getSiteSettings();
  return normalisePhoneDigits(s.whatsapp_number || FALLBACKS.whatsapp_number);
}
