import "server-only";

export type UpstreamProviderService = {
  service: string | number;
  name: string;
  type?: string;
  category?: string;
  rate: string | number;
  min: string | number;
  max: string | number;
};

export async function getProviderCatalog(providerId: string): Promise<UpstreamProviderService[]> {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!base) throw new Error("Railway API is not configured.");
  const response = await fetch(`${base}/panel-provider-services/${encodeURIComponent(providerId)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let payload: { success?: boolean; services?: UpstreamProviderService[]; message?: string };
  try { payload = JSON.parse(text); } catch { throw new Error("Railway returned an invalid provider response."); }
  if (!response.ok || !payload.success || !Array.isArray(payload.services)) {
    throw new Error(payload.message || `Railway API returned HTTP ${response.status}.`);
  }
  return payload.services;
}
