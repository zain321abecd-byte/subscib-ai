import { getSupabaseAdmin } from "./supabase/admin";
import {
  isBackOfficeRole,
  parseOverride,
  resolveEffectivePermissions,
  type PermissionKey,
  type Role,
} from "./permissions";

/**
 * Server-authoritative admin authorization.
 *
 * The admin portal authenticates over a Supabase cookie session (the only auth
 * transport that works in middleware + Server Components — the custom JWT lives
 * in localStorage and is invisible server-side). Authorization, however, is
 * driven by the NEW role model in public.users so the 5-role / per-user
 * permission system is the single source of truth.
 *
 * Resolution order (fail-safe: anything unexpected → no access):
 *   1. public.users row (matched by email) with a back-office role → authoritative.
 *   2. public.users row with role 'customer' → NOT admin (the reported hole).
 *   3. Legacy `admins` table membership (by auth uid) → treated as 'admin'.
 *   4. Otherwise → no access.
 */
export interface AdminAccess {
  role: Role;
  effectivePermissions: PermissionKey[];
  email: string | null;
  source: "users" | "admins";
}

export async function resolveAdminAccess(
  email: string | null | undefined,
  authUid: string | null | undefined,
): Promise<AdminAccess | null> {
  if (!email && !authUid) return null;

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    // Service role not configured — cannot verify, so deny.
    return null;
  }

  // 1 & 2 — the new role model, matched by email (citext column ⇒ case-insensitive).
  if (email) {
    const { data, error } = await admin
      .from("users")
      .select("role, permissions")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (!error && data && isBackOfficeRole(data.role)) {
      const role = data.role as Role;
      const effective = Array.from(
        resolveEffectivePermissions(role, parseOverride(data.permissions)),
      );
      return { role, effectivePermissions: effective, email, source: "users" };
    }
    // A 'customer' row does NOT grant access here — fall through to the legacy
    // admins table so a long-standing admin who also has a customer account
    // isn't locked out.
  }

  // 3 — legacy admins table (Supabase-auth era), keyed by auth.users.id.
  if (authUid) {
    const { data, error } = await admin
      .from("admins")
      .select("user_id")
      .eq("user_id", authUid)
      .maybeSingle();
    if (!error && data) {
      const role: Role = "admin";
      const effective = Array.from(resolveEffectivePermissions(role));
      return { role, effectivePermissions: effective, email: email ?? null, source: "admins" };
    }
  }

  // 4 — no back-office access.
  return null;
}
