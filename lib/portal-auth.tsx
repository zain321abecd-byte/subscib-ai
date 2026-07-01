"use client";

/**
 * Client-side state + helpers for portal (back-office) authentication.
 *
 * The portal has its own JWT — completely separate from the customer
 * JWT stored under "subscribai-auth". Storing it here means:
 *   • all /admin fetches use `Authorization: Bearer <portal-jwt>`
 *   • the same value is mirrored to a cookie so middleware + server
 *     components can gate /admin/* without shipping every page to the
 *     client.
 *
 * There is intentionally no self-signup. The only ways to get an
 * account are (a) the bootstrap script for the first superadmin,
 * or (b) accepting an invite emailed from /admin/team.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiBaseUrl, PORTAL_AUTH_COOKIE, PORTAL_AUTH_STORAGE_KEY } from "./api-client";

export type PortalUser = {
  id: string;
  email: string;
  name: string | null;
  status: "invited" | "active" | "disabled";
  is_superadmin: boolean;
  groups?: Array<{ id: string; name: string }>;
};

export type PortalAuthState = {
  user: PortalUser | null;
  permissions: string[];
  isSuper: boolean;
  ready: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
  hasPermission: (key: string) => boolean;
};

const Ctx = createContext<PortalAuthState | null>(null);

function writeCookie(token: string, expiresAt: string | null) {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  // If the token has an expiry, mirror it; otherwise session cookie.
  const expires = expiresAt ? `; Expires=${new Date(expiresAt).toUTCString()}` : "";
  document.cookie = `${PORTAL_AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${expires}${secure}`;
}

function clearCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${PORTAL_AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

type StoredAuth = { token: string; expires_at: string | null; user: PortalUser; permissions: string[] };

function readStored(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PORTAL_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed?.token || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(next: StoredAuth) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PORTAL_AUTH_STORAGE_KEY, JSON.stringify(next));
  writeCookie(next.token, next.expires_at);
}

function forget() {
  if (typeof window !== "undefined") window.localStorage.removeItem(PORTAL_AUTH_STORAGE_KEY);
  clearCookie();
}

export function PortalAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<PortalAuthState, "login" | "logout" | "refresh" | "hasPermission">>({
    user: null, permissions: [], isSuper: false, ready: false, token: null,
  });
  const tokenRef = useRef<string | null>(null);

  const applyStored = useCallback((s: StoredAuth | null) => {
    tokenRef.current = s?.token ?? null;
    setState({
      user: s?.user ?? null,
      permissions: s?.permissions ?? [],
      isSuper: !!s?.user?.is_superadmin,
      ready: true,
      token: s?.token ?? null,
    });
  }, []);

  const refresh = useCallback(async () => {
    const stored = readStored();
    if (!stored) { applyStored(null); return; }
    try {
      const res = await fetch(`${apiBaseUrl()}/portal/me`, {
        headers: { Authorization: `Bearer ${stored.token}` },
      });
      if (!res.ok) throw new Error(`portal/me → ${res.status}`);
      const body = await res.json();
      const next: StoredAuth = {
        token: stored.token,
        expires_at: stored.expires_at,
        user: body.user,
        permissions: Array.isArray(body.permissions) ? body.permissions : [],
      };
      persist(next);
      applyStored(next);
    } catch {
      forget();
      applyStored(null);
    }
  }, [applyStored]);

  useEffect(() => {
    // Hydrate from localStorage on mount, then verify against /portal/me.
    const stored = readStored();
    if (!stored) { applyStored(null); return; }
    applyStored(stored);
    void refresh();
  }, [applyStored, refresh]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${apiBaseUrl()}/portal/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false as const, error: body?.message || body?.error || "Login failed." };
      const next: StoredAuth = {
        token: body.token,
        expires_at: body.expires_at ?? null,
        user: body.user,
        permissions: Array.isArray(body.permissions) ? body.permissions : [],
      };
      persist(next);
      applyStored(next);
      return { ok: true as const };
    } catch (err: any) {
      return { ok: false as const, error: err?.message || "Login failed." };
    }
  }, [applyStored]);

  const logout = useCallback(() => {
    forget();
    applyStored(null);
  }, [applyStored]);

  const hasPermission = useCallback((key: string) => {
    if (state.isSuper) return true;
    return state.permissions.includes(key);
  }, [state.isSuper, state.permissions]);

  const value = useMemo<PortalAuthState>(
    () => ({ ...state, login, logout, refresh, hasPermission }),
    [state, login, logout, refresh, hasPermission],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePortalAuth(): PortalAuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePortalAuth must be used inside <PortalAuthProvider>");
  return v;
}
