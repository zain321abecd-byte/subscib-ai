import { headers, cookies } from "next/headers";

export type Region = "PK" | "IN" | "OTHER";
export type Currency = "PKR" | "USD" | "INR";
export type CurrencyMode = "auto" | "always_pkr" | "always_usd" | "dual";

function countryToRegion(country: string): Region {
  const code = country.toUpperCase();
  if (code === "PK") return "PK";
  if (code === "IN") return "IN";
  return "OTHER";
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
