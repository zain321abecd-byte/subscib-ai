"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePortalAuth } from "@/lib/portal-auth";
import { requiredPermissionForPath, type PermissionKey, type Role } from "@/lib/permissions";
import AdminNavProgress from "./AdminNavProgress";

type NavItem = { href: string; label: string; icon: string; permission?: PermissionKey };

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: "fa-gauge" }],
  },
  {
    section: "Catalog",
    items: [
      { href: "/admin/products", label: "Products",  icon: "fa-box",       permission: "products:read" },
      { href: "/admin/blog",     label: "Blog posts", icon: "fa-newspaper", permission: "blog:read" },
      { href: "/admin/reviews",  label: "Reviews",    icon: "fa-star",      permission: "reviews:read" },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/admin/orders",  label: "Orders",  icon: "fa-receipt",        permission: "orders:read" },
      { href: "/admin/customer-contacts", label: "Customer Contacts", icon: "fa-address-book", permission: "orders:read" },
      { href: "/admin/bundle-orders", label: "Bundle Orders", icon: "fa-layer-group", permission: "orders:read" },
      { href: "/admin/business-bundle-inquiries", label: "Business Bundle Inquiries", icon: "fa-building-circle-check", permission: "orders:read" },
      { href: "/admin/custom-pricing-requests", label: "Custom Pricing Requests", icon: "fa-file-signature", permission: "orders:read" },
      { href: "/admin/contact-messages", label: "Contact Messages", icon: "fa-message" },
      { href: "/admin/email",   label: "Emails",  icon: "fa-envelope",       permission: "emails:read" },
      { href: "/admin/stock",   label: "Stock",   icon: "fa-boxes-stacked",  permission: "stock:read" },
      { href: "/admin/sales",   label: "Daily Sales", icon: "fa-hand-holding-dollar", permission: "sales:read" },
      { href: "/admin/coupons", label: "Promo Codes", icon: "fa-ticket",         permission: "settings:read" },
      { href: "/admin/traffic", label: "Traffic", icon: "fa-chart-line",     permission: "analytics:view" },
    ],
  },
  {
    section: "Configuration",
    items: [
      { href: "/admin/users",    label: "Team & permissions", icon: "fa-users-gear", permission: "users:read" },
      { href: "/admin/pricing-plans", label: "Pricing Plans", icon: "fa-tags", permission: "settings:read" },
      { href: "/admin/settings", label: "Site settings",      icon: "fa-sliders",    permission: "settings:read" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminShell({
  children,
  role,
  permissions,
  me,
}: {
  children: React.ReactNode;
  /** Server-resolved back-office role. Undefined on login/diagnostics. */
  role?: Role;
  /** Server-resolved effective permission keys. Authoritative for UI gating. */
  permissions?: string[];
  /** Signed-in portal user (server-resolved). Undefined on login/diagnostics. */
  me?: { id: string; email: string; name: string | null; isSuper: boolean };
}) {
  const pathname = usePathname() || "/admin";
  const [navOpen, setNavOpen] = useState(false);
  const { logout } = usePortalAuth();

  // Authoritative permission check driven by the server-provided set (NOT the
  // localStorage JWT, which the admin portal doesn't use). Superadmin passes
  // everything; this only ever HIDES UI — the API + RLS are the real guards.
  const hasPermission = (key: PermissionKey) =>
    role === "superadmin" || (permissions?.includes(key) ?? false);

  // Permission required to view the current section (null ⇒ any back-office role).
  const sectionPermission = requiredPermissionForPath(pathname);

  // Tag <body> for admin-specific CSS overrides (kills the public radial
  // gradients and resets scroll padding). Cleaned up on unmount so the public
  // body styles come back if React swaps in a public route.
  useEffect(() => {
    document.body.classList.add("admin-body");
    document.documentElement.classList.add("admin-html");
    return () => {
      document.body.classList.remove("admin-body");
      document.documentElement.classList.remove("admin-html");
    };
  }, []);

  // Don't render the chrome on standalone pages (login / accept-invite / diagnostics).
  if (pathname === "/admin/login" || pathname === "/admin/accept-invite" || pathname === "/admin/diagnostics") {
    return <>{children}</>;
  }

  function signOut() {
    // logout() clears both localStorage + the portal cookie; then bounce to login.
    logout();
    window.location.assign("/admin/login");
  }

  // Sidebar link click — let Next.js handle the navigation natively (this
  // makes loading.tsx fire), and dispatch a custom event so AdminNavProgress
  // can start the top bar immediately for visual feedback.
  function handleNav(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    // Preserve cmd/ctrl-click → open in new tab.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (href === pathname) {
      e.preventDefault();
      return;
    }
    setNavOpen(false);
    window.dispatchEvent(new Event("admin-nav-start"));
    // Don't preventDefault — Next's <Link> does the actual navigation.
  }

  return (
    <div className="admin-shell">
      <Suspense fallback={null}><AdminNavProgress /></Suspense>
      <aside className="admin-side">
        <div className="admin-side-head">
          <Link href="/admin" className="admin-brand" onClick={(e) => handleNav(e, "/admin")} aria-label="SubscribAI admin">
            <Image
              src="/assets/subscribai-logo.png"
              alt="SubscribAI"
              width={140}
              height={36}
              priority
              style={{ height: "auto", width: "auto", maxHeight: 36 }}
            />
          </Link>
          <button
            type="button"
            className="admin-mobile-toggle"
            onClick={() => setNavOpen((o) => !o)}
            aria-expanded={navOpen}
            aria-label="Toggle navigation"
          >
            <i className={`fa-solid ${navOpen ? "fa-xmark" : "fa-bars"}`}></i>
          </button>
        </div>

        <nav className={`admin-nav ${navOpen ? "" : "is-collapsed"}`}>
          {NAV.map((group) => (
            <div key={group.section}>
              <div className="admin-nav-section">{group.section}</div>
              {group.items
                .filter((item) => !item.permission || hasPermission(item.permission))
                .map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`admin-nav-link ${active ? "is-active" : ""}`}
                    onClick={(e) => handleNav(e, item.href)}
                    aria-current={active ? "page" : undefined}
                  >
                    <i className={`fa-solid ${item.icon}`}></i>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        {/* Pinned user card at the bottom — sibling of <nav> so it always
            stays in view while the nav scrolls. */}
        {me && <UserCardMenu me={me} onSignOut={signOut} />}
      </aside>
      <main className="admin-main">
        {sectionPermission && !hasPermission(sectionPermission) ? (
          <NoAccess permission={sectionPermission} />
        ) : (
          children
        )}
      </main>
    </div>
  );
}

/**
 * Bottom-pinned user card with a click-to-open menu (Settings +
 * Sign out). The card lives in .admin-side-user, styled via
 * globals.css so it survives sidebar scrolling. The menu pops
 * *upward* from the card because it sits at the bottom of the pane.
 */
function UserCardMenu({
  me, onSignOut,
}: { me: { id: string; email: string; name: string | null; isSuper: boolean }; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="admin-side-user" ref={wrapRef}>
      <button
        type="button"
        className="admin-side-user-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserCard me={me} />
      </button>

      {open && (
        <div className="admin-user-menu" role="menu">
          <Link
            href="/admin/settings"
            className="admin-user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <i className="fa-solid fa-gear" />
            Settings
          </Link>
          <button
            type="button"
            className="admin-user-menu-item is-danger"
            role="menuitem"
            onClick={() => { setOpen(false); onSignOut(); }}
          >
            <i className="fa-solid fa-right-from-bracket" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Compact "signed in as" card. Avatar + display name + role pill.
 * Truncates long emails so the card doesn't push the nav around.
 */
function UserCard({ me }: { me: { id: string; email: string; name: string | null; isSuper: boolean } }) {
  const display = me.name?.trim() || me.email.split("@")[0];
  const initial = (display[0] || me.email[0] || "?").toUpperCase();
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px",
        borderRadius: 10,
        background: "var(--surface-2, rgba(255,255,255,0.03))",
        border: "1px solid var(--border)",
      }}
    >
      <div
        aria-hidden
        style={{
          width: 36, height: 36, borderRadius: "50%",
          display: "grid", placeItems: "center", flexShrink: 0,
          background: me.isSuper
            ? "linear-gradient(135deg, #4884FF, #8FB4FF)"
            : "linear-gradient(135deg, #64748b, #94a3b8)",
          color: "#fff", fontWeight: 700, fontSize: 14,
          boxShadow: me.isSuper ? "0 4px 12px rgba(72,132,255,0.35)" : "none",
        }}
      >
        {initial}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, fontSize: 13, color: "var(--text)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}
        title={me.email}
        >
          {display}
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginTop: 2,
        }}>
          {me.isSuper ? (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "2px 7px", borderRadius: 999,
              background: "rgba(72,132,255,0.15)",
              color: "#4884FF",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
            }}>
              <i className="fa-solid fa-crown" style={{ fontSize: 9 }} />
              SUPERADMIN
            </span>
          ) : (
            <span style={{
              padding: "2px 7px", borderRadius: 999,
              background: "var(--surface-2, rgba(255,255,255,0.06))",
              color: "var(--text-muted)",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
            }}>
              ADMIN
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function NoAccess({ permission }: { permission: PermissionKey }) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "60vh", textAlign: "center", padding: 24 }}>
      <div style={{ maxWidth: 420 }}>
        <i className="fa-solid fa-lock" style={{ fontSize: 40, color: "var(--text-muted)", marginBottom: 16 }} aria-hidden="true"></i>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", margin: "0 0 8px" }}>No access</h1>
        <p style={{ color: "var(--text-muted)", margin: "0 0 4px" }}>
          You don&apos;t have permission to view this section.
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Requires <code>{permission}</code>. Ask a superadmin to grant it.
        </p>
        <Link href="/admin" className="admin-btn admin-btn-ghost" style={{ marginTop: 18, display: "inline-flex" }}>
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
