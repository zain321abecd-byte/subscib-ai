"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import AdminNavProgress from "./AdminNavProgress";

type NavItem = { href: string; label: string; icon: string };

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: "fa-gauge" }],
  },
  {
    section: "Catalog",
    items: [
      { href: "/admin/products", label: "Products",  icon: "fa-box" },
      { href: "/admin/blog",     label: "Blog posts", icon: "fa-newspaper" },
      { href: "/admin/reviews",  label: "Reviews",    icon: "fa-star" },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/admin/orders",  label: "Orders",  icon: "fa-receipt" },
      { href: "/admin/stock",   label: "Stock",   icon: "fa-boxes-stacked" },
      { href: "/admin/traffic", label: "Traffic", icon: "fa-chart-line" },
    ],
  },
  {
    section: "Configuration",
    items: [{ href: "/admin/settings", label: "Site settings", icon: "fa-sliders" }],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/admin";
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const { logout } = useAuth();

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

  function signOut() {
    try {
      logout();
    } finally {
      router.push("/admin/login");
      router.refresh();
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
              {group.items.map((item) => {
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
      <main className="admin-main">{children}</main>
    </div>
  );
}
