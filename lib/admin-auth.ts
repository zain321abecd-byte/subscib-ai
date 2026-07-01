import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PermissionKey } from "./permissions";

/**
 * Server-side view of the currently-logged-in portal user.
 *
 * Two sources of truth are involved:
 *   • the "subscribai-portal-token" cookie holds the JWT
 *   • the backend /portal/me endpoint resolves it into a user + effective
 *     permissions (union across group memberships, superadmin bypass)
 *
 * We keep the same `AdminAccess` shape the rest of the app was already using
 * so callers of requireAdmin() keep working — the underlying identity model
 * is different (portal_users, not public.users), but the caller only cares
 * about {role, effectivePermissions}.
 */
export interface AdminAccess {
  role: "superadmin" | "admin";
  effectivePermissions: PermissionKey[];
  email: string;
  userId: string;
  name: string | null;
  isSuper: boolean;
  source: "portal";
}

const PORTAL_COOKIE = "subscribai-portal-token";

async function callPortalMe(token: string): Promise<AdminAccess | null> {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!base) return null;
  try {
    const res = await fetch(`${base}/portal/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      user: { id: string; email: string; name: string | null; is_superadmin: boolean };
      permissions: string[];
    };
    return {
      role: body.user.is_superadmin ? "superadmin" : "admin",
      effectivePermissions: (body.permissions || []) as PermissionKey[],
      email: body.user.email,
      userId: body.user.id,
      name: body.user.name,
      isSuper: body.user.is_superadmin,
      source: "portal",
    };
  } catch {
    return null;
  }
}

/** Called from Server Components / Server Actions. Returns null if not logged in as portal user. */
export async function getAdminContext(): Promise<AdminAccess | null> {
  const store = await cookies();
  const token = store.get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  return callPortalMe(token);
}

/**
 * Hard gate for Server Actions. Redirects to /admin/login when not signed in,
 * throws Forbidden when the caller lacks the required permission.
 */
export async function requireAdmin(permission?: PermissionKey): Promise<AdminAccess> {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/admin/login?error=not_admin");
  if (permission && !ctx.isSuper && !ctx.effectivePermissions.includes(permission)) {
    throw new Error(`Forbidden: missing permission "${permission}".`);
  }
  return ctx;
}

/** Read the raw portal JWT server-side, e.g. to forward to backend admin routes. */
export async function getPortalToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(PORTAL_COOKIE)?.value ?? null;
}
