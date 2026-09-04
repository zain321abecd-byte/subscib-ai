/**
 * Portal permission catalog. Kept in a separate file from
 * `../auth/permissions.ts` so the portal team-management code stays
 * self-contained even if the customer-side auth is refactored later.
 *
 * Group storage: `portal_groups.permissions` is a JSONB array of these keys.
 * Effective set for a portal user = union across every group they're in.
 * Superadmin (`portal_users.is_superadmin`) bypasses this table entirely.
 */

export const PORTAL_PERMISSION_KEYS = [
  "products:read", "products:write", "products:delete",
  "orders:read", "orders:write", "orders:refund", "orders:revenue",
  "blog:read", "blog:write", "blog:delete",
  "reviews:read", "reviews:moderate", "reviews:delete",
  "freebies:read", "freebies:write", "freebies:delete",
  "stock:read", "stock:write",
  // Daily Sales / Renewals — customer subscription tracking (distinct
  // from stock:*, which is our own inventory expiry).
  "sales:read", "sales:write", "sales:delete",
  // Subscription delivery automation — send credentials over WhatsApp,
  // manage the message templates. Deliberately separate from sales:* because
  // these messages carry account passwords.
  "delivery:read", "delivery:send", "delivery:templates",
  "settings:read", "settings:write",
  "emails:read", "emails:send",
  "users:read", "users:write",
  "analytics:view",
] as const;

export type PortalPermissionKey = (typeof PORTAL_PERMISSION_KEYS)[number];

export const PORTAL_PERMISSION_GROUPS: Array<{ label: string; keys: PortalPermissionKey[] }> = [
  { label: "Products",  keys: ["products:read","products:write","products:delete"] },
  { label: "Orders",    keys: ["orders:read","orders:write","orders:refund","orders:revenue"] },
  { label: "Blog",      keys: ["blog:read","blog:write","blog:delete"] },
  { label: "Reviews",   keys: ["reviews:read","reviews:moderate","reviews:delete"] },
  { label: "Freebies",  keys: ["freebies:read","freebies:write","freebies:delete"] },
  { label: "Stock",     keys: ["stock:read","stock:write"] },
  { label: "Daily sales", keys: ["sales:read","sales:write","sales:delete"] },
  { label: "Delivery automation", keys: ["delivery:read","delivery:send","delivery:templates"] },
  { label: "Settings",  keys: ["settings:read","settings:write"] },
  { label: "Emails",    keys: ["emails:read","emails:send"] },
  { label: "Team",      keys: ["users:read","users:write"] },
  { label: "Analytics", keys: ["analytics:view"] },
];

export function isPortalPermissionKey(k: unknown): k is PortalPermissionKey {
  return typeof k === "string" && (PORTAL_PERMISSION_KEYS as readonly string[]).includes(k);
}

/** Merge every group's permission array into one Set. */
export function unionOfGroupPermissions(groupsPermissions: Array<unknown[]>): Set<PortalPermissionKey> {
  const set = new Set<PortalPermissionKey>();
  for (const arr of groupsPermissions) {
    if (!Array.isArray(arr)) continue;
    for (const k of arr) if (isPortalPermissionKey(k)) set.add(k);
  }
  return set;
}
