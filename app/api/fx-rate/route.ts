import { NextResponse } from "next/server";

// Fetch live USD→PKR rate. open.er-api.com is a free, no-API-key endpoint.
// Cached for 1 hour (3600s) — exchange rates don't move that fast.

let cache: { rate: number; fetchedAt: number } | null = null;
const TTL_MS = 60 * 60 * 1000;
const FALLBACK_RATE = 280;

async function fetchRate(): Promise<number> {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const rate = Number(data?.rates?.PKR);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("invalid rate");
    return rate;
  } catch {
    return FALLBACK_RATE;
  }
}

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return NextResponse.json({ usdToPkr: cache.rate, cached: true, fetchedAt: cache.fetchedAt });
  }
  const rate = await fetchRate();
  cache = { rate, fetchedAt: Date.now() };
  return NextResponse.json({ usdToPkr: rate, cached: false, fetchedAt: cache.fetchedAt });
}
