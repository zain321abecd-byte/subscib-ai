import { headers, cookies } from "next/headers";

export type Region = "PK" | "OTHER";
export type Currency = "PKR" | "USD";
export type CurrencyMode = "auto" | "always_pkr" | "always_usd" | "dual";

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
  if (cookieRegion === "PK" || cookieRegion === "OTHER") return cookieRegion;

  const h = await headers();
  const country = (h.get("x-user-country") || "").toUpperCase();
  if (country) return country === "PK" ? "PK" : "OTHER";

  // No cookie + no geo header. In production this is a foreign visitor on a
  // non-Vercel host → OTHER. In local dev there is no geo header at all, so
  // default to PK so PKR pricing renders without manual cookie wrangling.
  if (process.env.NODE_ENV !== "production") return "PK";
  return "OTHER";
}

/**
 * Resolve the active currency given the admin's currency_mode + region +
 * the user's manual cookie override.
 */
export async function resolveCurrency(mode: CurrencyMode): Promise<Currency> {
  if (mode === "always_pkr") return "PKR";
  if (mode === "always_usd") return "USD";

  // Currency cookie takes precedence over region default in auto mode.
  const c = await cookies();
  const pref = c.get("currency")?.value;
  if (pref === "PKR" || pref === "USD") return pref;

  // Mode "dual" implicitly defaults to USD as the "primary" but renders both.
  if (mode === "dual") return "USD";

  // mode === "auto"
  const region = await getRegion();
  return region === "PK" ? "PKR" : "USD";
}
