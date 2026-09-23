import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdmin, hasServiceRole } from "@/lib/supabase/admin";
import type { PanelProfile, PanelWallet } from "./types";

/**
 * Server-side identity for /panel.
 *
 * The panel deliberately does NOT have its own accounts. A customer signs in
 * with the same email and password they use for the shop — the credentials
 * live in public.users and are checked by our NestJS API, exactly as the
 * storefront does it.
 *
 * The one thing the storefront does differently is where it keeps the token:
 * lib/auth.tsx puts it in localStorage, which a Server Component can't read.
 * So the panel sets its own httpOnly cookie holding the same JWT. That's why
 * signing into the shop doesn't automatically sign you into /panel — same
 * account, separate session — and why none of the shop's auth code had to
 * change to make this work.
 *
 * Validation goes through GET /auth/me on every request rather than verifying
 * the JWT locally. It costs a round trip, but it means a disabled or deleted
 * account stops working immediately instead of when its token expires. The
 * /admin portal resolves its own cookie the same way.
 */

export const PANEL_COOKIE = "subscribai-panel-token";

/** 30 days. Matches how long the backend's JWT is good for. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export interface PanelUser {
  id: string;
  email: string;
  name: string | null;
  profile: PanelProfile;
  wallet: PanelWallet;
  isAdmin: boolean;
}

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
}

/** Resolve a raw JWT into the shop account it belongs to, or null. */
async function resolveToken(
  token: string,
): Promise<{ id: string; email: string; name: string | null } | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      user?: { id?: string; email?: string; name?: string | null };
    };
    if (!body?.user?.id || !body.user.email) return null;
    return { id: body.user.id, email: body.user.email, name: body.user.name ?? null };
  } catch {
    return null;
  }
}

/**
 * Give this shop account a panel profile and wallet if it doesn't have one.
 *
 * The standalone build did this with a trigger on auth.users. There's no
 * equivalent hook on public.users that wouldn't also fire for every shop
 * signup, and most shop customers will never open the panel — so the rows are
 * created on first visit instead. Idempotent: concurrent first-visits race
 * harmlessly on the primary key.
 */
async function ensureProfile(userId: string): Promise<{ profile: PanelProfile; wallet: PanelWallet } | null> {
  const db = getSupabaseAdmin();

  const { data: existing } = await db
    .from("panel_profiles")
    .select("user_id, role, status, api_key, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  let profile = existing as PanelProfile | null;

  if (!profile) {
    const { data: created, error } = await db
      .from("panel_profiles")
      .insert({ user_id: userId })
      .select("user_id, role, status, api_key, created_at")
      .maybeSingle();

    if (error) {
      // Lost a race with another request that created it first — re-read.
      const { data: reread } = await db
        .from("panel_profiles")
        .select("user_id, role, status, api_key, created_at")
        .eq("user_id", userId)
        .maybeSingle();
      profile = reread as PanelProfile | null;
    } else {
      profile = created as PanelProfile | null;
    }
    if (!profile) return null;
  }

  const { data: existingWallet } = await db
    .from("panel_wallets")
    .select("user_id, balance, currency")
    .eq("user_id", userId)
    .maybeSingle();

  let wallet = existingWallet as PanelWallet | null;
  if (!wallet) {
    await db.from("panel_wallets").insert({ user_id: userId });
    const { data: reread } = await db
      .from("panel_wallets")
      .select("user_id, balance, currency")
      .eq("user_id", userId)
      .maybeSingle();
    wallet = (reread as PanelWallet | null) ?? { user_id: userId, balance: 0, currency: "PKR" };
  }

  return { profile, wallet };
}

/** The signed-in panel user, or null. Safe to call from any Server Component. */
export async function getPanelUser(): Promise<PanelUser | null> {
  if (!hasServiceRole()) return null;

  const store = await cookies();
  const token = store.get(PANEL_COOKIE)?.value;
  if (!token) return null;

  const account = await resolveToken(token);
  if (!account) return null;

  const rows = await ensureProfile(account.id);
  if (!rows) return null;

  // A suspended panel profile is treated as signed out. The shop account is
  // untouched — suspending someone here doesn't lock them out of the store.
  if (rows.profile.status !== "active") return null;

  return {
    id: account.id,
    email: account.email,
    name: account.name,
    profile: rows.profile,
    wallet: rows.wallet,
    isAdmin: rows.profile.role === "admin",
  };
}

/** Hard gate for panel pages. Bounces to the panel sign-in, preserving the target. */
export async function requirePanelUser(nextPath?: string): Promise<PanelUser> {
  const user = await getPanelUser();
  if (!user) {
    const suffix = nextPath && nextPath !== "/panel" ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/panel/login${suffix}`);
  }
  return user;
}

/** Hard gate for /panel/admin. Non-admins land back on their own dashboard. */
export async function requirePanelAdmin(): Promise<PanelUser> {
  const user = await requirePanelUser();
  if (!user.isAdmin) redirect("/panel?denied=admin");
  return user;
}

/** Sign in with the shop account and open a panel session. */
export async function signInToPanel(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = apiBase();
  if (!base) return { ok: false, error: "The panel is not configured yet. Set NEXT_PUBLIC_API_URL." };

  let res: Response;
  try {
    res = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Couldn't reach the sign-in service. Try again in a moment." };
  }

  const payload = (await res.json().catch(() => ({}))) as {
    accessToken?: string;
    message?: string | string[];
    error?: string;
  };

  if (!res.ok || !payload.accessToken) {
    const raw = payload.message || payload.error || "Invalid email or password.";
    return { ok: false, error: Array.isArray(raw) ? raw.join(", ") : String(raw) };
  }

  const store = await cookies();
  store.set(PANEL_COOKIE, payload.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return { ok: true };
}

/** Close the panel session. The shop session, which lives in localStorage, is untouched. */
export async function signOutOfPanel(): Promise<void> {
  const store = await cookies();
  store.delete(PANEL_COOKIE);
}
