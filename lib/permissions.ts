/**
 * Frontend mirror of api/src/auth/permissions.ts.
 *
 * Keep this in sync with the backend catalog — both define "what can each role
 * do?". The backend is the security authority (its guards reject unauthorised
 * calls); this copy lets the Next.js middleware, the admin layout, and the
 * AdminShell make the SAME access decisions so the UI never shows something the
 * API would refuse.
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
  // Daily sales / renewals
  "sales:read",
  "sales:write",
  "sales:delete",
  // Settings
  "settings:read",
  "settings:write",
  // Emails
  "emails:read",
  "emails:send",
  // Users
  "users:read",
  "users:write",
  "users:assign-roles",
  "users:delete",
  // Analytics
  "analytics:view",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type Role = "superadmin" | "admin" | "manager" | "editor" | "customer";
export const ROLES: Role[] = ["superadmin", "admin", "manager", "editor", "customer"];

/** Permission catalog grouped for the user-management UI. Mirrors the backend. */
export const PERMISSION_GROUPS: Array<{ label: string; keys: PermissionKey[] }> = [
  { label: "Products", keys: ["products:read", "products:write", "products:delete"] },
  { label: "Orders & revenue", keys: ["orders:read", "orders:write", "orders:refund", "orders:revenue"] },
  { label: "Blog", keys: ["blog:read", "blog:write", "blog:delete"] },
  { label: "Reviews", keys: ["reviews:read", "reviews:moderate", "reviews:delete"] },
  { label: "Freebies", keys: ["freebies:read", "freebies:write", "freebies:delete"] },
  { label: "Stock", keys: ["stock:read", "stock:write"] },
  { label: "Daily sales", keys: ["sales:read", "sales:write", "sales:delete"] },
  { label: "Settings", keys: ["settings:read", "settings:write"] },
  { label: "Emails", keys: ["emails:read", "emails:send"] },
  { label: "Users", keys: ["users:read", "users:write", "users:assign-roles", "users:delete"] },
  { label: "Analytics", keys: ["analytics:view"] },
];

/** Roles that may enter the admin portal at all. Customers are excluded. */
export const BACK_OFFICE_ROLES: ReadonlySet<Role> = new Set<Role>([
  "superadmin",
  "admin",
  "manager",
  "editor",
]);

export function isBackOfficeRole(role: string | null | undefined): role is Role {
  return !!role && BACK_OFFICE_ROLES.has(role as Role);
}

/** Role → default permission set. Mirrors ROLE_DEFAULTS on the backend. */
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
    "sales:read", "sales:write",
    "settings:read",
    "emails:read", "emails:send",
    "analytics:view",
  ],
  editor: [
    "products:read", "products:write",
    "blog:read", "blog:write",
    "freebies:read", "freebies:write",
    "reviews:read",
    "stock:read",
  ],
  customer: [],
};

export interface PermissionOverride {
  grant?: PermissionKey[];
  revoke?: PermissionKey[];
}

/** Resolve effective permissions: role defaults ⊕ grant − revoke.
 *  Superadmin is ALWAYS full access — overrides are ignored so a stray revoke
 *  can never lock a superadmin out of anything. */
export function resolveEffectivePermissions(
  role: Role,
  override?: PermissionOverride | null,
): Set<PermissionKey> {
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

/** Parse a JSONB override coming from public.users.permissions. */
export function parseOverride(raw: unknown): PermissionOverride {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const filter = (v: unknown): PermissionKey[] | undefined =>
    Array.isArray(v)
      ? (v as string[]).filter((k): k is PermissionKey => (PERMISSION_KEYS as readonly string[]).includes(k))
      : undefined;
  const grant = filter(o.grant);
  const revoke = filter(o.revoke);
  const out: PermissionOverride = {};
  if (grant?.length) out.grant = grant;
  if (revoke?.length) out.revoke = revoke;
  return out;
}

export function hasPermission(
  effective: ReadonlyArray<string> | ReadonlySet<string> | null | undefined,
  key: PermissionKey,
): boolean {
  if (!effective) return false;
  const set: ReadonlySet<string> = effective instanceof Set ? effective : new Set(effective as ReadonlyArray<string>);
  return set.has(key);
}

/**
 * Required permission to OPEN each admin section. A section with no entry is
 * visible to any back-office role (e.g. the dashboard). Longest matching prefix
 * wins, so nested routes inherit their parent's gate.
 */
export const SECTION_PERMISSIONS: Array<{ prefix: string; permission: PermissionKey }> = [
  { prefix: "/admin/products", permission: "products:read" },
  { prefix: "/admin/blog", permission: "blog:read" },
  { prefix: "/admin/reviews", permission: "reviews:read" },
  { prefix: "/admin/orders", permission: "orders:read" },
  { prefix: "/admin/bundle-orders", permission: "orders:read" },
  { prefix: "/admin/business-bundle-inquiries", permission: "orders:read" },
  { prefix: "/admin/custom-pricing-requests", permission: "orders:read" },
  { prefix: "/admin/stock", permission: "stock:read" },
  { prefix: "/admin/sales", permission: "sales:read" },
  { prefix: "/admin/traffic", permission: "analytics:view" },
  { prefix: "/admin/users", permission: "users:read" },
  { prefix: "/admin/pricing-plans", permission: "settings:read" },
  { prefix: "/admin/settings", permission: "settings:read" },
  { prefix: "/admin/email", permission: "emails:read" },
];

/** The permission a pathname requires to be viewed, or null if any admin may. */
export function requiredPermissionForPath(pathname: string): PermissionKey | null {
  let best: { prefix: string; permission: PermissionKey } | null = null;
  for (const entry of SECTION_PERMISSIONS) {
    if (pathname === entry.prefix || pathname.startsWith(entry.prefix + "/")) {
      if (!best || entry.prefix.length > best.prefix.length) best = entry;
    }
  }
  return best?.permission ?? null;
}
