"use server";

import { signInToPanel } from "@/lib/panel/auth";

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
