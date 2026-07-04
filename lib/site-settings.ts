import { unstable_cache } from "next/cache";
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

/**
 * Safe defaults returned when a key isn't present in the DB row set.
 * Every consumer reads via `getSiteSettings()` and destructures — the
 * fallback here guarantees the field is always a string.
 */
const FALLBACKS: Record<string, string> = {
  // ── Business / contact ──────────────────────────────────────────
  whatsapp_number:    "15550132026",
  contact_email:      "contact@subscribai.com",
  support_phone:      "",
  business_name:      "SubscribAI",
  business_address:   "",
  footer_text:        "",

  // ── Hero / homepage copy ────────────────────────────────────────
  hero_headline:      "Premium AI subscriptions,",
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
 * Fetch every row of site_settings and fold aliases into their canonical
 * keys. Cached under a Next tag so `revalidateTag("site-settings")` on
 * admin save invalidates every render path immediately (works across
 * Server Components, generateMetadata, route handlers, etc.).
 */
const fetchAllSettings = unstable_cache(
  async (): Promise<Record<string, string>> => {
    // No Supabase env → serve fallbacks only.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return { ...FALLBACKS };
    }
    try {
      const supabase = await getSupabaseServer();
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

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const settings = await getSiteSettings();
  return settings[key] ?? fallback;
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
const SANITISERS: Record<string, (v: string) => SanitiseResult> = {
  contact_email: (v) => {
    const s = stripUnsafe(v);
    if (!s) return { value: "" };
    return isValidEmail(s) ? { value: s } : { error: "Contact email must be a valid email address." };
  },
  whatsapp_number: (v) => ({ value: normalisePhoneDigits(v) }),
  support_phone:   (v) => ({ value: normalisePhoneDigits(v) }),

  // Pixel + analytics + verification tokens are opaque identifier
  // strings. Strip markup + drop anything with a URL scheme so admins
  // can't smuggle a full script snippet into these fields.
  meta_pixel_id:            (v) => ({ value: stripUnsafe(v).replace(/https?:\/\/\S*/gi, "") }),
  google_analytics_id:      (v) => ({ value: stripUnsafe(v).replace(/https?:\/\/\S*/gi, "") }),
  google_tag_manager_id:    (v) => ({ value: stripUnsafe(v).replace(/https?:\/\/\S*/gi, "") }),
  google_site_verification: (v) => ({ value: stripUnsafe(v) }),
  // Legacy alias fields get the same treatment so old admin pages
  // continue to save valid values.
  seo_facebook_pixel:       (v) => ({ value: stripUnsafe(v).replace(/https?:\/\/\S*/gi, "") }),
  seo_google_analytics:     (v) => ({ value: stripUnsafe(v).replace(/https?:\/\/\S*/gi, "") }),
  seo_google_verification:  (v) => ({ value: stripUnsafe(v) }),

  // Social URLs — must look vaguely like a URL if set.
  social_instagram: (v) => {
    const s = stripUnsafe(v);
    if (!s) return { value: "" };
    return /^https?:\/\//i.test(s) ? { value: s } : { error: "Instagram must be a full URL (https://…)." };
  },
  social_facebook: (v) => {
    const s = stripUnsafe(v);
    if (!s) return { value: "" };
    return /^https?:\/\//i.test(s) ? { value: s } : { error: "Facebook must be a full URL (https://…)." };
  },
  social_tiktok: (v) => {
    const s = stripUnsafe(v);
    if (!s) return { value: "" };
    return /^https?:\/\//i.test(s) ? { value: s } : { error: "TikTok must be a full URL (https://…)." };
  },
  social_youtube: (v) => {
    const s = stripUnsafe(v);
    if (!s) return { value: "" };
    return /^https?:\/\//i.test(s) ? { value: s } : { error: "YouTube must be a full URL (https://…)." };
  },
};

/** Public entry point — normalise + validate a single (key, value) pair. */
export function sanitiseSettingValue(key: string, raw: string): SanitiseResult {
  const fn = SANITISERS[key];
  if (fn) return fn(raw);
  // Free-text field (hero_headline, business_name, footer_text, …).
  return { value: stripUnsafe(raw) };
}

// ── Convenience derived getters used by public components ───────────
/** Cleaned WhatsApp digits ready to drop into `https://wa.me/<here>`. */
export async function getWhatsAppLinkDigits(): Promise<string> {
  const s = await getSiteSettings();
  return normalisePhoneDigits(s.whatsapp_number || FALLBACKS.whatsapp_number);
}
