/**
 * Small helpers for building customer-facing contact URLs from the
 * dynamic site_settings. Keeping the URL construction in one place
 * means an admin change to WhatsApp number / contact email flows
 * through every page without touching call sites.
 *
 * Server-only — every consumer already runs in a Server Component or
 * is fine to `await` since these are cheap in-memory reads after the
 * first fetch (cached under the "site-settings" tag).
 */
import { getSiteSettings, normalisePhoneDigits } from "@/lib/site-settings";

export type ContactLinks = {
  /** Cleaned digits, ready for `https://wa.me/<digits>`. */
  whatsappDigits: string;
  /** Full `https://wa.me/…` URL, always populated (falls back to default number). */
  whatsappUrl: string;
  /** Configured contact email address. */
  email: string;
  /** Full `mailto:` URL. */
  mailtoUrl: string;
};

/**
 * Build every contact URL in one round-trip. Cheaper than N calls to
 * getSiteSettings() (which is cached, but callers still pay the
 * lookup cost) — grab this once per page render and forward the
 * pieces you need.
 */
export async function getContactLinks(): Promise<ContactLinks> {
  const s = await getSiteSettings();
  const whatsappDigits = normalisePhoneDigits(s.whatsapp_number || "");
  const email = s.contact_email || "";
  return {
    whatsappDigits,
    whatsappUrl: whatsappDigits ? `https://wa.me/${whatsappDigits}` : "https://wa.me/",
    email,
    mailtoUrl: email ? `mailto:${email}` : "",
  };
}
