"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSION_KEYS, ROLES, type PermissionKey, type Role } from "@/lib/permissions";

type ActionResult = { ok: true } | { ok: false; error: string };

const isPermissionKey = (k: string): k is PermissionKey =>
  (PERMISSION_KEYS as readonly string[]).includes(k);

/** Update a user's role + per-user permission override. Superadmin-only path. */
export async function updateUserRole(input: {
  userId: string;
  role: Role;
  grant: string[];
  revoke: string[];
}): Promise<ActionResult> {
  const me = await requireAdmin("users:assign-roles");

  if (!ROLES.includes(input.role)) return { ok: false, error: "Invalid role." };

  const supabase = getSupabaseAdmin();

  // Guard: you can't change your own role (matches the UI lock, enforced server-side).
  const { data: target } = await supabase
    .from("users")
    .select("email")
    .eq("id", input.userId)
    .maybeSingle();
  if (!target) return { ok: false, error: "User not found." };
  if (me.email && target.email?.toLowerCase() === me.email.toLowerCase()) {
    return { ok: false, error: "You can't change your own role." };
  }

  // Superadmin is always full access — never persist a grant/revoke override on
  // one, so a mistaken toggle can't lock a superadmin out.
  const permissions: { grant?: PermissionKey[]; revoke?: PermissionKey[] } = {};
  if (input.role !== "superadmin") {
    const grant = (input.grant || []).filter(isPermissionKey);
    const revoke = (input.revoke || []).filter(isPermissionKey);
    if (grant.length) permissions.grant = grant;
    if (revoke.length) permissions.revoke = revoke;
  }

  const { error } = await supabase
    .from("users")
    .update({ role: input.role, permissions })
    .eq("id", input.userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}

/** Delete a user. Superadmin-only path. */
export async function deleteUserAction(userId: string): Promise<ActionResult> {
  const me = await requireAdmin("users:delete");

  const supabase = getSupabaseAdmin();

  const { data: target } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return { ok: false, error: "User not found." };
  if (me.email && target.email?.toLowerCase() === me.email.toLowerCase()) {
    return { ok: false, error: "You can't delete your own account." };
  }

  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}
