import { headers, cookies } from "next/headers";

/** "ASIA" = an Asian country other than PK/IN; "OTHER" = the rest of the
 *  world (UK, US, EU, …), which is where international USD pricing applies. */
export type Region = "PK" | "IN" | "ASIA" | "OTHER";
export type Currency = "PKR" | "USD" | "INR";
export type CurrencyMode = "auto" | "always_pkr" | "always_usd" | "dual";

/** Asian countries beyond PK/IN. Visitors here keep the FX-converted price
 *  rather than the admin's international USD price. */
const ASIA_COUNTRIES = new Set([
  "AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH", "CN", "CY", "GE", "HK", "ID",
  "IR", "IQ", "IL", "JP", "JO", "KZ", "KW", "KG", "LA", "LB", "MO", "MY", "MV",
  "MN", "MM", "NP", "KP", "OM", "PS", "PH", "QA", "SA", "SG", "KR", "LK", "SY",
  "TW", "TJ", "TH", "TL", "TM", "AE", "UZ", "VN", "YE",
]);

function countryToRegion(country: string): Region {
  const code = country.toUpperCase();
  if (code === "PK") return "PK";
  if (code === "IN") return "IN";
  if (ASIA_COUNTRIES.has(code)) return "ASIA";
  return "OTHER";
}

/** True where the admin's fixed international USD price should be used. */
export function usesInternationalPricing(region: Region): boolean {
  return region === "OTHER";
}

/**
 * Resolve the visitor's region.
 *
 * Order of precedence:
 *   1. Explicit `region` cookie (set by the currency switcher / dev override)
 *   2. `x-user-country` header injected by middleware (from Vercel's IP geo)
 *   3. Default → OTHER
 */
export async function getRegion(): Promise<Region> {
  const c = await cookies();
  const cookieRegion = c.get("region")?.value;
  if (cookieRegion === "PK" || cookieRegion === "IN") return cookieRegion;

  const h = await headers();
  const country = (h.get("x-user-country") || "").toUpperCase();
  if (country) return countryToRegion(country);

  // No cookie + no geo header. In production this is a foreign visitor on a
  // non-Vercel host → OTHER. In local dev there is no geo header at all, so
  // default to PK so PKR pricing renders without manual cookie wrangling.
  if (process.env.NODE_ENV !== "production") return "PK";
  return "OTHER";
}

/**
 * Resolve the active currency.
 *
 * Rule: Pakistani visitors → PKR, everyone else → USD.
 * The user's explicit cookie override (set via the currency switcher) wins
 * over the auto-default. INR is still accepted as a manual override, but it
 * is no longer auto-selected — Indian visitors land on USD by default.
 */
export async function resolveCurrency(_mode: CurrencyMode): Promise<Currency> {
  // Currency cookie takes precedence over location defaults.
  const c = await cookies();
  const pref = c.get("currency")?.value;
  if (pref === "PKR" || pref === "USD" || pref === "INR") return pref;

  const region = await getRegion();
  return region === "PK" ? "PKR" : "USD";
}
