import { getSupabaseServer } from "@/lib/supabase/server";
import type { SiteSettingRow } from "@/lib/supabase/types";

const FALLBACKS: Record<string, string> = {
  whatsapp_number:  "15550132026",
  contact_email:    "contact@subscribai.com",
  hero_headline:    "Premium AI subscriptions, paid in PKR",
  hero_subtext:     "Activated to your inbox in under 30 minutes.",
  social_instagram: "",
  social_facebook:  "",
  social_tiktok:    "",
  social_youtube:   "",

  // Currency / region:
  // currency_mode: how prices display by default
  //   "auto"        — Pakistani users see PKR, everyone else USD
  //   "always_pkr"  — force PKR for everyone (with USD as small ≈ note)
  //   "always_usd"  — force USD for everyone (no PKR shown)
  //   "dual"        — show both side-by-side everywhere (legacy)
  currency_mode:        "auto",
  // Optional manual override for the FX rate. If 0/empty, the live rate from
  // /api/fx-rate (open.er-api.com) is used.
  fx_rate_pkr_per_usd:  "",
  // Whether to show the USD ↔ PKR switcher in the header.
  currency_switcher:    "true",

  // SEO + tracking. All optional — leave blank to skip.
  seo_site_title:           "SubscribAI — Premium AI Subscriptions",
  seo_default_description:  "Premium AI subscriptions delivered in minutes. ChatGPT Plus, Claude Pro, Midjourney, Canva, Notion AI, automation packs, and full courses.",
  seo_default_keywords:     "AI subscriptions, ChatGPT Plus, Claude Pro, Midjourney, Canva Pro",
  seo_og_image:             "",                  // Cloudinary URL — used as default OG/Twitter image
  seo_twitter_handle:       "",                  // e.g. "@subscribai"
  seo_google_verification:  "",                  // GSC verification token (just the value, no <meta> tag)
  seo_google_analytics:     "",                  // e.g. "G-XXXXXXXXXX"
  seo_facebook_pixel:       "",                  // e.g. "1234567890"
  seo_index_site:           "true",              // "false" → site-wide noindex (great for staging)
};

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

let cache: { fetchedAt: number; map: Record<string, string> } | null = null;
const TTL_MS = 60_000;

export function invalidateSettingsCache() {
  cache = null;
}

export async function getSiteSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache.map;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    cache = { fetchedAt: Date.now(), map: { ...FALLBACKS } };
    return cache.map;
  }

  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.from("site_settings").select("*");
    if (error || !data) {
      cache = { fetchedAt: Date.now(), map: { ...FALLBACKS } };
      return cache.map;
    }
    const map: Record<string, string> = { ...FALLBACKS };
    for (const row of data as SiteSettingRow[]) {
      const v = asString(row.value).trim();
      if (v) map[row.key] = v;
    }
    cache = { fetchedAt: Date.now(), map };
    return cache.map;
  } catch {
    cache = { fetchedAt: Date.now(), map: { ...FALLBACKS } };
    return cache.map;
  }
}

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const settings = await getSiteSettings();
  return settings[key] ?? fallback;
}
