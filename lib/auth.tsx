"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiBaseUrl } from "./api-client";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: "customer" | "admin";
  email_verified_at: string | null;
};

type AuthCtx = {
  user: AuthUser | null;
  ready: boolean;            // false until we've checked localStorage on mount
  accessToken: string | null;
  signup: (input: { email: string; password: string; name?: string; phone?: string }) => Promise<{ ok: true; message: string } | { ok: false; error: string }>;
  login: (input: { email: string; password: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);
const STORAGE_KEY = "subscribai-auth";

function readStored(): { token: string; user: AuthUser } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string; user?: AuthUser };
    if (!parsed?.token || !parsed?.user) return null;
    return { token: parsed.token, user: parsed.user };
  } catch {
    return null;
  }
}

function writeStored(value: { token: string; user: AuthUser } | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage, then verify the token is still valid against the API.
  useEffect(() => {
    const stored = readStored();
    if (!stored) {
      setReady(true);
      return;
    }
    setUser(stored.user);
    setAccessToken(stored.token);

    // Background refresh: if the JWT was revoked / expired, /auth/me 401s and we clear.
    (async () => {
      try {
        const res = await fetch(`${apiBaseUrl()}/auth/me`, {
          headers: { Authorization: `Bearer ${stored.token}` },
        });
        if (!res.ok) throw new Error("stale token");
        const data = await res.json();
        if (data?.user) {
          setUser(data.user as AuthUser);
          writeStored({ token: stored.token, user: data.user as AuthUser });
        }
      } catch {
        setUser(null);
        setAccessToken(null);
        writeStored(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const signup = useCallback<AuthCtx["signup"]>(async (input) => {
    try {
      const res = await fetch(`${apiBaseUrl()}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        return { ok: false, error: (data?.message as string) || "Signup failed." };
      }
      return { ok: true, message: data?.message || "Account created — check your email to verify." };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Network error." };
    }
  }, []);

  const login = useCallback<AuthCtx["login"]>(async (input) => {
    try {
      const res = await fetch(`${apiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data?.accessToken || !data?.user) {
        return { ok: false, error: (data?.message as string) || "Invalid email or password." };
      }
      writeStored({ token: data.accessToken, user: data.user });
      setAccessToken(data.accessToken);
      setUser(data.user as AuthUser);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Network error." };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    writeStored(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${apiBaseUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("stale token");
      const data = await res.json();
      if (data?.user) {
        setUser(data.user as AuthUser);
        writeStored({ token: accessToken, user: data.user as AuthUser });
      }
    } catch {
      logout();
    }
  }, [accessToken, logout]);

  const value = useMemo<AuthCtx>(
    () => ({ user, accessToken, ready, signup, login, logout, refresh }),
    [user, accessToken, ready, signup, login, logout, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
