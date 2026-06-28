import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  PERMISSION_GROUPS,
  PERMISSION_KEYS,
  ROLE_DEFAULTS,
  ROLES,
  parseOverride,
  resolveEffectivePermissions,
  type Role,
} from "@/lib/permissions";
import UsersClient, { type AdminUser, type Catalog } from "./UsersClient";

export const metadata = { title: "Users · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  // Gate: must be a back-office user with users:read. Redirects otherwise.
  const me = await requireAdmin("users:read");

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, phone, role, permissions, email_verified_at, last_login_at, created_at")
    .order("created_at", { ascending: false });

  const users: AdminUser[] = (data || []).map((u: any) => {
    const override = parseOverride(u.permissions);
    return {
      id: u.id,
      email: u.email,
      name: u.name ?? null,
      phone: u.phone ?? null,
      role: u.role as Role,
      override,
      effectivePermissions: Array.from(resolveEffectivePermissions(u.role as Role, override)),
      email_verified_at: u.email_verified_at ?? null,
      last_login_at: u.last_login_at ?? null,
      created_at: u.created_at,
    };
  });

  const catalog: Catalog = {
    roles: ROLES,
    permissions: [...PERMISSION_KEYS],
    groups: PERMISSION_GROUPS.map((g) => ({ label: g.label, keys: [...g.keys] })),
    roleDefaults: Object.fromEntries(
      ROLES.map((r) => [r, [...ROLE_DEFAULTS[r]]]),
    ) as Record<Role, string[]>,
  };

  const canAssignRoles =
    me.role === "superadmin" || me.effectivePermissions.includes("users:assign-roles");
  const canDelete =
    me.role === "superadmin" || me.effectivePermissions.includes("users:delete");

  return (
    <UsersClient
      initialUsers={users}
      catalog={catalog}
      meEmail={me.email}
      canAssignRoles={canAssignRoles}
      canDelete={canDelete}
      loadError={error ? error.message : null}
    />
  );
}
