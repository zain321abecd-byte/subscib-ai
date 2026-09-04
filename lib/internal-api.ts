/**
 * Server-to-server client for the NestJS backend, authenticated with the
 * shared `x-internal-token` (INTERNAL_API_TOKEN) that the API's
 * InternalOrAdminGuard accepts for trusted calls.
 *
 * Same transport as lib/email-api.ts (which predates this file and stays for
 * the email endpoints) — this one is the general-purpose version used by the
 * delivery-automation Server Actions. SERVER ONLY: it carries a secret.
 */

function apiBase(): string {
  return (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
}

export function isInternalApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function internalApi<T = any>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("API base URL is not configured (set NEXT_PUBLIC_API_URL or API_URL).");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = process.env.INTERNAL_API_TOKEN;
  if (token) headers["x-internal-token"] = token;

  const res = await fetch(`${base}${path}`, {
    method: init?.method || "GET",
    headers,
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  const text = await res.text();
  let payload: any;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }
  if (!res.ok) {
    const msg = payload?.message || payload?.error || `API request failed (${res.status})`;
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }
  return payload as T;
}
