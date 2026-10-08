"use server";

import { getPanelUser, signInToPanel, signOutOfPanel } from "@/lib/panel/auth";

/**
 * Sign in to the panel.
 *
 * A Server Action rather than a browser fetch, for one reason: the session
 * cookie is httpOnly, and only the server can set that. It also keeps the
 * password out of any client-side request the browser extension ecosystem can
 * see, and means the API base URL doesn't have to be reachable from the
 * browser at all.
 */
export async function panelLogin(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = (email || "").trim();
  if (!trimmed || !password) {
    return { ok: false, error: "Enter your email and password." };
  }
  return signInToPanel(trimmed, password);
}

export async function panelAdminLogin(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await panelLogin(email, password);
  if (!result.ok) return result;

  const user = await getPanelUser();
  if (!user?.isAdmin) {
    await signOutOfPanel();
    return { ok: false, error: "This account does not have panel administrator access." };
  }
  return { ok: true };
}

export async function panelSignup(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const name = (input.name || "").trim();
  const email = (input.email || "").trim().toLowerCase();
  const password = String(input.password || "");
  if (!name) return { ok: false, error: "Enter your name." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (password.length < 8) return { ok: false, error: "Use at least 8 characters for your password." };

  const base = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!base) return { ok: false, error: "Account signup is not configured yet." };
  try {
    const response = await fetch(`${base}/auth/signup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => ({})) as { message?: string | string[] };
    const message = Array.isArray(payload.message) ? payload.message.join(", ") : payload.message;
    if (!response.ok) return { ok: false, error: message || "Could not create the account." };
    return { ok: true, message: message || "Account created. Check your email to verify it, then sign in." };
  } catch {
    return { ok: false, error: "Couldn't reach the account service. Try again in a moment." };
  }
}
