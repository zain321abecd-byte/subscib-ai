import { Injectable } from "@nestjs/common";

type RateCache = { usdToPkr: number; usdToInr: number; fetchedAt: number };

const TTL_MS = 60 * 60 * 1000;
const FALLBACK_USD_TO_PKR = 280;
const FALLBACK_USD_TO_INR = 83;

@Injectable()
export class FxService {
  private cache: RateCache | null = null;

  private async fetchRates(): Promise<Omit<RateCache, "fetchedAt">> {
    try {
      const r = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: any = await r.json();
      const usdToPkr = Number(data?.rates?.PKR);
      const usdToInr = Number(data?.rates?.INR);
      if (!Number.isFinite(usdToPkr) || usdToPkr <= 0) throw new Error("invalid PKR rate");
      if (!Number.isFinite(usdToInr) || usdToInr <= 0) throw new Error("invalid INR rate");
      return { usdToPkr, usdToInr };
    } catch {
      return { usdToPkr: FALLBACK_USD_TO_PKR, usdToInr: FALLBACK_USD_TO_INR };
    }
  }

  async getRates() {
    if (this.cache && Date.now() - this.cache.fetchedAt < TTL_MS) {
      return { ...this.cache, cached: true };
    }
    const rates = await this.fetchRates();
    this.cache = { ...rates, fetchedAt: Date.now() };
    return { ...this.cache, cached: false };
  }
}
