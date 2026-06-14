"use client";

import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/browser";

/**
 * Client-side helper for calling the standalone NestJS backend (Render in prod,
 * http://localhost:4000 in dev). Base URL comes from NEXT_PUBLIC_API_URL.
 *
 * For admin/authenticated calls it attaches the current Supabase access token as
 * `Authorization: Bearer <token>`, which the API's AuthGuard / AdminGuard verify.
 */

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

/** Authorization header with the current Supabase access token, or {}. */
export async function authHeaders(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured()) return {};
  try {
    const { data } = await getSupabaseBrowser().auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

type Options = { auth?: boolean };

async function request<T = any>(method: string, path: string, body?: unknown, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth) Object.assign(headers, await authHeaders());

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
