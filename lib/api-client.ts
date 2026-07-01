"use client";

/**
 * Client-side helper for calling the standalone NestJS backend (Render in prod,
 * http://localhost:4000 in dev). Base URL comes from NEXT_PUBLIC_API_URL.
 *
 * For authenticated calls it attaches the JWT issued by our backend
 * (POST /auth/login) as `Authorization: Bearer <token>`. The token lives in
 * localStorage under "subscribai-auth" — written by lib/auth.tsx on login.
 */
const AUTH_STORAGE_KEY = "subscribai-auth";
/** localStorage key for the back-office (portal) JWT — distinct from customer auth. */
export const PORTAL_AUTH_STORAGE_KEY = "subscribai-portal-auth";
/** Cookie name mirroring the portal token so the middleware + server components can gate /admin/*. */
export const PORTAL_AUTH_COOKIE = "subscribai-portal-token";

/** Backend base URL (no trailing slash). Throws if not configured. */
export function apiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_URL is not set. Point it at your backend (e.g. http://localhost:4000).");
  return url.replace(/\/+$/, "");
}

/** Same as apiBaseUrl but returns "" instead of throwing — for best-effort calls. */
export function apiBaseUrlSafe(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
}

export function apiUrl(path: string): string {
  return `${apiBaseUrl()}${path}`;
}

/** Authorization header with the current backend JWT, or {} if not signed in. */
export async function authHeaders(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {};
  } catch {
    return {};
  }
}

/** Authorization header carrying the *portal* JWT (from /admin/login). */
export async function portalAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PORTAL_AUTH_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {};
  } catch {
    return {};
  }
}

type Options = { auth?: boolean; portal?: boolean };

async function request<T = any>(method: string, path: string, body?: unknown, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.portal) Object.assign(headers, await portalAuthHeaders());
  else if (opts.auth) Object.assign(headers, await authHeaders());

  const res = await fetch(apiUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let payload: any;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!res.ok) {
    const message = payload?.message || payload?.error || `Request failed (${res.status})`;
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }
  return payload as T;
}

export const apiGet = <T = any>(path: string, opts?: Options) => request<T>("GET", path, undefined, opts);
export const apiPost = <T = any>(path: string, body?: unknown, opts?: Options) => request<T>("POST", path, body, opts);
export const apiPatch = <T = any>(path: string, body?: unknown, opts?: Options) => request<T>("PATCH", path, body, opts);
export const apiDelete = <T = any>(path: string, opts?: Options) => request<T>("DELETE", path, undefined, opts);

/** multipart/form-data upload (admin). Returns the parsed JSON ({ url, ... }). */
export async function apiUpload<T = any>(path: string, file: File, folder?: string): Promise<T> {
  const fd = new FormData();
  fd.append("file", file);
  if (folder) fd.append("folder", folder);

  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: await authHeaders(),
    body: fd,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.message || payload?.error || `Upload failed (${res.status})`);
  return payload as T;
}
