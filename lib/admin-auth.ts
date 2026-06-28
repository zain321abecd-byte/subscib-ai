import { redirect } from "next/navigation";
import { getSupabaseServer } from "./supabase/server";
import { resolveAdminAccess, type AdminAccess } from "./admin-access";
import { hasPermission, type PermissionKey } from "./permissions";

/**
 * Resolve the current admin's authorization from the Supabase cookie session.
 * Returns null when the visitor is not signed in or is not a back-office user.
 * Use in Server Components / Server Actions.
 */
export async function getAdminContext(): Promise<AdminAccess | null> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return resolveAdminAccess(user.email ?? null, user.id);
}

/**
 * Hard gate for Server Actions (and any server code that mutates). Redirects to
 * the login page when the caller isn't a back-office user, and throws when they
 * lack the specific permission. Returns the resolved access on success.
 *
 * This is the real enforcement for admin mutations: RLS via is_admin() only
 * knows "admin or not", so the finer 5-role permissions are enforced here.
 */
export async function requireAdmin(permission?: PermissionKey): Promise<AdminAccess> {
  const ctx = await getAdminContext();
  if (!ctx) {
    redirect("/admin/login?error=not_admin");
  }
  if (permission && !hasPermission(ctx.effectivePermissions, permission)) {
    throw new Error(`Forbidden: missing permission "${permission}".`);
  }
  return ctx;
}
