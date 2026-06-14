import { NextResponse } from "next/server";

// Fetch live USD rates. open.er-api.com is a free, no-API-key endpoint.
// Cached for 1 hour because exchange rates do not need per-request freshness.

type RateCache = { usdToPkr: number; usdToInr: number; fetchedAt: number };

let cache: RateCache | null = null;
const TTL_MS = 60 * 60 * 1000;
const FALLBACK_USD_TO_PKR = 280;
const FALLBACK_USD_TO_INR = 83;

async function fetchRates(): Promise<Omit<RateCache, "fetchedAt">> {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const usdToPkr = Number(data?.rates?.PKR);
    const usdToInr = Number(data?.rates?.INR);
    if (!Number.isFinite(usdToPkr) || usdToPkr <= 0) throw new Error("invalid PKR rate");
    if (!Number.isFinite(usdToInr) || usdToInr <= 0) throw new Error("invalid INR rate");
    return { usdToPkr, usdToInr };
  } catch {
    return { usdToPkr: FALLBACK_USD_TO_PKR, usdToInr: FALLBACK_USD_TO_INR };
  }
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
      return NextResponse.json({ ...cache, cached: true });
    }
    const rates = await fetchRates();
    cache = { ...rates, fetchedAt: Date.now() };
    return NextResponse.json({ ...cache, cached: false });
  } catch {
    const rates = cache ?? {
      usdToPkr: FALLBACK_USD_TO_PKR,
      usdToInr: FALLBACK_USD_TO_INR,
      fetchedAt: Date.now(),
    };
    return NextResponse.json({ ...rates, cached: !!cache, fallback: true });
  }
}
