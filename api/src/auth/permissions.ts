/**
 * Permission catalog + role defaults.
 *
 * Single source of truth for "what can each role do?" — both the backend
 * (PermissionGuard) and the admin frontend (user-management page) import
 * from here so the lists never drift.
 */

export const PERMISSION_KEYS = [
  // Products
  "products:read",
  "products:write",
  "products:delete",
  // Orders + revenue
  "orders:read",
  "orders:write",
  "orders:refund",
  "orders:revenue",
  // Blog
  "blog:read",
  "blog:write",
  "blog:delete",
  // Reviews
  "reviews:read",
  "reviews:moderate",
  "reviews:delete",
  // Freebies
  "freebies:read",
  "freebies:write",
  "freebies:delete",
  // Stock
  "stock:read",
  "stock:write",
  // Subscription delivery automation (WhatsApp delivery messages)
  "delivery:read",
  "delivery:send",
  "delivery:templates",
  // Settings
  "settings:read",
  "settings:write",
  // Emails
  "emails:read",
  "emails:send",
  // Users (only superadmin should have users:assign-roles / users:delete)
  "users:read",
  "users:write",
  "users:assign-roles",
  "users:delete",
  // Analytics
  "analytics:view",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_GROUPS: Array<{ label: string; keys: PermissionKey[] }> = [
  { label: "Products", keys: ["products:read", "products:write", "products:delete"] },
  { label: "Orders & revenue", keys: ["orders:read", "orders:write", "orders:refund", "orders:revenue"] },
  { label: "Blog", keys: ["blog:read", "blog:write", "blog:delete"] },
  { label: "Reviews", keys: ["reviews:read", "reviews:moderate", "reviews:delete"] },
  { label: "Freebies", keys: ["freebies:read", "freebies:write", "freebies:delete"] },
  { label: "Stock", keys: ["stock:read", "stock:write"] },
  { label: "Delivery automation", keys: ["delivery:read", "delivery:send", "delivery:templates"] },
  { label: "Settings", keys: ["settings:read", "settings:write"] },
  { label: "Emails", keys: ["emails:read", "emails:send"] },
  { label: "Users", keys: ["users:read", "users:write", "users:assign-roles", "users:delete"] },
  { label: "Analytics", keys: ["analytics:view"] },
];

export type Role = "superadmin" | "admin" | "manager" | "editor" | "customer";
export const ROLES: Role[] = ["superadmin", "admin", "manager", "editor", "customer"];

/**
 * Role → default permission set. Superadmin gets EVERY key. Admin gets
 * everything except user role assignment / user deletion. Manager runs the
 * day-to-day shop. Editor only touches content. Customer has nothing.
 */
export const ROLE_DEFAULTS: Record<Role, ReadonlyArray<PermissionKey>> = {
  superadmin: [...PERMISSION_KEYS],
  admin: PERMISSION_KEYS.filter((k) => k !== "users:assign-roles" && k !== "users:delete"),
  manager: [
    "products:read", "products:write",
    "orders:read", "orders:write", "orders:refund", "orders:revenue",
    "blog:read",
    "reviews:read", "reviews:moderate",
    "freebies:read", "freebies:write",
    "stock:read", "stock:write",
    "delivery:read", "delivery:send",
    "settings:read",
    "emails:read", "emails:send",
    "analytics:view",
  ],
  editor: [
    "products:read", "products:write",   // no delete
    "blog:read", "blog:write",           // no delete
    "freebies:read", "freebies:write",
    "reviews:read",
    "stock:read",
  ],
  customer: [],
};

/** Per-user override stored in public.users.permissions JSONB. */
export interface PermissionOverride {
  grant?: PermissionKey[];
  revoke?: PermissionKey[];
}

/**
 * Resolve effective permissions: role defaults ⊕ grant - revoke. Returns the
 * final set as a Set<PermissionKey> for O(1) hasPermission() checks.
 */
export function resolveEffectivePermissions(
  role: Role,
  override?: PermissionOverride | null,
): Set<PermissionKey> {
  // Superadmin is ALWAYS full access — overrides are ignored so a stray revoke
  // can never lock a superadmin out of anything.
  if (role === "superadmin") return new Set<PermissionKey>(PERMISSION_KEYS);
  const set = new Set<PermissionKey>(ROLE_DEFAULTS[role] || []);
  if (override?.grant) {
    for (const k of override.grant) {
      if ((PERMISSION_KEYS as readonly string[]).includes(k)) set.add(k);
    }
  }
  if (override?.revoke) {
    for (const k of override.revoke) set.delete(k);
  }
  return set;
}

/** Convenience: does this (role, override) pair grant the requested key? */
export function hasPermissionFor(
  role: Role,
  override: PermissionOverride | null | undefined,
  key: PermissionKey,
): boolean {
  return resolveEffectivePermissions(role, override).has(key);
}

/** Safely parse a JSONB value coming from the DB into a typed override. */
export function parseOverride(raw: unknown): PermissionOverride {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const grant = Array.isArray(o.grant) ? (o.grant as string[]).filter((k): k is PermissionKey => (PERMISSION_KEYS as readonly string[]).includes(k)) : undefined;
  const revoke = Array.isArray(o.revoke) ? (o.revoke as string[]).filter((k): k is PermissionKey => (PERMISSION_KEYS as readonly string[]).includes(k)) : undefined;
  const out: PermissionOverride = {};
  if (grant?.length) out.grant = grant;
  if (revoke?.length) out.revoke = revoke;
  return out;
}
