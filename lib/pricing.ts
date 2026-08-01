/**
 * Product pricing helpers.
 *
 * Products in this project have three sources of truth for price:
 *   • `product.price`         — canonical/base PKR price (fallback).
 *   • `product.privatePrice`  — optional second-tier "Private" price
 *                               (legacy two-tier model, still used by
 *                               a few older rows).
 *   • `product.variationConfig` — flexible JSONB shape with plans /
 *                               durations / account-types × prices.
 *
 * Cards and listings should show the *starting* (cheapest) price, with
 * a "From " prefix when more than one distinct price exists. The
 * product detail page still uses the *selected* variation price once
 * the shopper picks a plan — that's driven by state inside PackageBuy
 * and never touches these helpers.
 *
 * Every helper here is defensive:
 *   • variation_config can be null, an object, or an array.
 *   • Prices can be number, numeric string ("1399"), or missing.
 *   • Anything that doesn't reduce to a finite non-negative number is
 *     dropped — NaN / undefined / negative values never reach the UI.
 */
import type { Product } from "@/lib/products";
import type { Currency } from "@/lib/fx";
import { formatINR, formatPKR, formatUSD } from "@/lib/fx";

/** Keys we treat as "this is a price" when recursively scanning JSONB. */
const PRICE_KEYS = new Set([
  "price",
  "amount",
  "sale_price",
  "salePrice",
  "value",
  "finalPrice",
  "final_price",
]);

/** Convert an arbitrary value to a finite non-negative number, or null. */
function toPrice(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : null;
  if (typeof v === "string") {
    // Strip commas / whitespace so "1,399" or " 1399 " still parses.
    const cleaned = v.replace(/[, \t]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

/**
 * Recursively walk `variation_config` and collect every numeric price
 * we can find under a recognised key. Handles both object and array
 * nesting, and stops on primitives.
 */
export function extractPricesFromVariationConfig(variationConfig: unknown): number[] {
  const found: number[] = [];
  const visit = (node: unknown, parentKey?: string) => {
    if (node == null) return;

    // Primitives — treat as a price only if their parent key was one of
    // the recognised keys. (Otherwise every plan label / duration would
    // false-positive.)
    if (typeof node === "number" || typeof node === "string") {
      if (parentKey && PRICE_KEYS.has(parentKey)) {
        const n = toPrice(node);
        if (n != null) found.push(n);
      }
      return;
    }

    // Arrays — recurse, inheriting the parent key so `prices: [1399, 5500]`
    // still gets picked up correctly.
    if (Array.isArray(node)) {
      for (const item of node) visit(item, parentKey);
      return;
    }

    // Objects — recurse, using each child key as the parent for its value.
    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node)) visit(v, k);
    }
  };
  visit(variationConfig);
  return found;
}

/**
 * The lowest valid price for a product across:
 *   • variation_config (all recognised price keys)
 *   • product.privatePrice (legacy tier)
 *   • product.price       (base fallback — always considered so we
 *                          never return null / NaN)
 *
 * Returns 0 only if the base price itself is invalid, which the caller
 * can treat as "price not set". In practice every catalog row has a
 * valid `price`, so this is effectively always a positive number.
 */
/**
 * Lowest fixed international USD price across a product's variations, or null
 * when the admin has not set any. Used for the "From $X" label shown to
 * non-Asian visitors before they pick a specific combination.
 */
export function getStartingPriceUsd(product: Product): number | null {
  const cfg = product.variationConfig as { prices?: Array<{ priceUsd?: unknown }> } | undefined;
  if (!cfg || !Array.isArray(cfg.prices)) return null;
  const usd = cfg.prices
    .map((p) => Number(p?.priceUsd))
    .filter((n) => Number.isFinite(n) && n > 0);
  return usd.length ? Math.min(...usd) : null;
}

export function getStartingPrice(product: Product): number {
  const candidates: number[] = [];
  const base = toPrice(product.price);
  if (base != null) candidates.push(base);

  const priv = toPrice((product as { privatePrice?: unknown }).privatePrice);
  if (priv != null) candidates.push(priv);

  for (const p of extractPricesFromVariationConfig(product.variationConfig)) {
    candidates.push(p);
  }

  if (candidates.length === 0) return 0;
  return Math.min(...candidates);
}

/**
 * True when the product has more than one *distinct* price, i.e. the
 * shopper will pay more than the starting price depending on which
 * variation they pick. Drives the "From " prefix on cards.
 */
export function hasMultiplePrices(product: Product): boolean {
  const set = new Set<number>();
  const base = toPrice(product.price);
  if (base != null) set.add(base);

  const priv = toPrice((product as { privatePrice?: unknown }).privatePrice);
  if (priv != null) set.add(priv);

  for (const p of extractPricesFromVariationConfig(product.variationConfig)) {
    set.add(p);
  }
  return set.size > 1;
}

/**
 * Format a PKR-canonical amount for display. Defaults to PKR because
 * that's what the DB stores; callers in a client component that has
 * access to the FX context should convert to the visitor's chosen
 * currency first (see `formatPriceFromPKR`) and pass the resulting
 * amount + currency here — or just use `formatPriceFromPKR` directly.
 *
 * Kept as a thin helper because the spec explicitly asked for a
 * `formatPrice(price, currency)` entry point.
 */
export function formatPrice(price: number, currency: Currency = "PKR"): string {
  const n = toPrice(price);
  if (n == null) return "—";
  switch (currency) {
    case "USD": return formatUSD(n);
    case "INR": return formatINR(n);
    case "PKR":
    default:    return formatPKR(n);
  }
}

/**
 * The user-facing price label shown on cards / listings — PKR-only.
 * Shows the starting/cheapest price with a "From" prefix when multiple
 * distinct prices exist.
 */
export function getProductPriceLabel(product: Product): string {
  const label = formatPKR(getStartingPrice(product));
  return hasMultiplePrices(product) ? `From ${label}` : label;
}

/**
 * FX-aware variant of {@link getProductPriceLabel}. Takes the values
 * from the FX context so it can render the visitor's chosen currency.
 * Call from client components (`ProductCard`, `MobileHeroProductCard`).
 *
 * Not a hook — takes the FX values as arguments so it stays pure and
 * usable from `useMemo` bodies.
 */
export function formatProductPriceLabel(
  product: Product,
  currency: Currency,
  usdToPkr: number,
  fxReady: boolean,
  usdToInr = 83,
  /** "OTHER" (non-Asian) visitors get the admin's fixed USD price. */
  region?: string,
): string {
  const start = getStartingPrice(product);
  const prefix = hasMultiplePrices(product) ? "From " : "";
  if (currency === "USD" && region === "OTHER") {
    const intl = getStartingPriceUsd(product);
    if (intl != null) return `${prefix}${formatUSD(intl)}`;
  }
  // If we're on PKR (native), just format directly — no FX round-trip.
  if (currency === "PKR") return `${prefix}${formatPKR(start)}`;
  if (!fxReady || !usdToPkr) return "—";
  if (currency === "INR") return `${prefix}${formatINR((start / usdToPkr) * usdToInr)}`;
  return `${prefix}${formatUSD(start / usdToPkr)}`;
}
