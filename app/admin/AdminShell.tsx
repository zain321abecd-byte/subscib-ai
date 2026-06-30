"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/browser";
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
      { href: "/admin/email",   label: "Emails",  icon: "fa-envelope",       permission: "emails:read" },
      { href: "/admin/stock",   label: "Stock",   icon: "fa-boxes-stacked",  permission: "stock:read" },
      { href: "/admin/traffic", label: "Traffic", icon: "fa-chart-line",     permission: "analytics:view" },
    ],
  },
  {
    section: "Configuration",
    items: [
      { href: "/admin/users",    label: "Team & permissions", icon: "fa-users-gear", permission: "users:read" },
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
}: {
  children: React.ReactNode;
  /** Server-resolved back-office role. Undefined on login/diagnostics. */
  role?: Role;
  /** Server-resolved effective permission keys. Authoritative for UI gating. */
  permissions?: string[];
}) {
  const pathname = usePathname() || "/admin";
  const [navOpen, setNavOpen] = useState(false);
  const { logout } = useAuth();

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

  // Don't render the chrome on standalone pages (login + diagnostics).
  if (pathname === "/admin/login" || pathname === "/admin/diagnostics") return <>{children}</>;

  async function signOut() {
    try {
      // The admin portal authenticates over the Supabase cookie session, so the
      // session MUST be cleared here — otherwise "sign out" leaves the user
      // still authorised. Also clear the customer-side JWT for good measure.
      if (isSupabaseConfigured()) {
        await getSupabaseBrowser().auth.signOut();
      }
      logout();
    } finally {
      window.location.assign("/admin/login");
    }
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
          <div style={{ marginTop: 10, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <Link href="/" className="admin-nav-link" onClick={() => setNavOpen(false)}>
              <i className="fa-solid fa-arrow-up-right-from-square"></i>
              View site
            </Link>
            <button type="button" className="admin-nav-link" onClick={signOut} style={{ width: "100%", background: "none", border: "none", textAlign: "left", cursor: "pointer", font: "inherit" }}>
              <i className="fa-solid fa-right-from-bracket"></i>
              Sign out
            </button>
          </div>
        </nav>
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
