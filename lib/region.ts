import { headers, cookies } from "next/headers";

export type Region = "PK" | "OTHER";
export type Currency = "PKR" | "USD";
export type CurrencyMode = "auto" | "always_pkr" | "always_usd" | "dual";

// Resolve the visitor's region from the country header injected by middleware.
export async function getRegion(): Promise<Region> {
  const h = await headers();
  const country = (h.get("x-user-country") || "").toUpperCase();
  return country === "PK" ? "PK" : "OTHER";
}

// Resolve the active currency given the admin's currency_mode + region +
// the user's manual cookie override.
export async function resolveCurrency(mode: CurrencyMode): Promise<Currency> {
  if (mode === "always_pkr") return "PKR";
  if (mode === "always_usd") return "USD";

  // Cookie override wins.
  const c = await cookies();
  const pref = c.get("currency")?.value;
  if (pref === "PKR" || pref === "USD") return pref;

  // Mode "dual" implicitly defaults to USD as the "primary" but renders both.
  if (mode === "dual") return "USD";

  // mode === "auto"
  const region = await getRegion();
  return region === "PK" ? "PKR" : "USD";
}
