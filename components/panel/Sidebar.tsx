"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const PANEL_NAME = process.env.NEXT_PUBLIC_PANEL_NAME || "SubscribAI Panel";

type Item = { href: string; label: string; icon: string };

/** Navigation for the whole panel. Administration only renders for admins. */
const CUSTOMER: Item[] = [
  { href: "/panel", label: "Dashboard", icon: "▦" },
  { href: "/panel/services", label: "Services", icon: "☰" },
  { href: "/panel/orders/new", label: "New order", icon: "＋" },
  { href: "/panel/orders", label: "My orders", icon: "⇄" },
  { href: "/panel/wallet", label: "Add funds", icon: "▤" },
  { href: "/panel/transactions", label: "Transactions", icon: "≡" },
  { href: "/panel/tickets", label: "Support", icon: "✉" },
  { href: "/panel/settings", label: "Settings", icon: "⚙" },
];

const ADMIN: Item[] = [
  { href: "/panel/admin/users", label: "Users", icon: "◎" },
  { href: "/panel/admin/services", label: "Services", icon: "☰" },
  { href: "/panel/admin/providers", label: "Providers", icon: "⇆" },
  { href: "/panel/admin/orders", label: "All orders", icon: "⇄" },
  { href: "/panel/admin/payments", label: "Payments", icon: "▤" },
  { href: "/panel/admin/reports", label: "Reports", icon: "◨" },
];

function NavList({
  items, pathname, onNavigate,
}: {
  items: Item[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <ul className="grid gap-0.5">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-brand-600 text-white"
                  : "text-[var(--text)] hover:bg-[var(--surface-3)]"
              }`}
            >
              <span aria-hidden="true" className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname() || "/panel";
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes, so tapping a link
  // doesn't leave the menu covering the page you just opened.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile bar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 md:hidden">
        <Link href="/panel" className="flex items-center gap-2 font-bold text-[var(--text)]">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-xs text-white">SP</span>
          {PANEL_NAME}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="panel-nav"
          className="panel-btn panel-btn-ghost !px-3 !py-1.5 text-sm"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <aside
        id="panel-nav"
        className={`${open ? "block" : "hidden"} border-b border-[var(--border)] bg-[var(--surface)] p-3 md:sticky md:top-0 md:block md:h-dvh md:border-b-0 md:border-r md:p-4`}
      >
        <Link
          href="/panel"
          className="mb-6 hidden items-center gap-2 px-2 font-bold text-[var(--text)] md:flex"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm text-white">SP</span>
          {PANEL_NAME}
        </Link>

        <nav aria-label="Panel">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Menu
          </p>
          <NavList items={CUSTOMER} pathname={pathname} onNavigate={() => setOpen(false)} />

          {isAdmin && (
            <>
              <p className="px-3 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Administration
              </p>
              <NavList items={ADMIN} pathname={pathname} onNavigate={() => setOpen(false)} />
            </>
          )}
        </nav>

        {/* Way back to the shop. The panel is part of the site, not a silo. */}
        <div className="mt-6 border-t border-[var(--border)] px-3 pt-4">
          <Link href="/" className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">
            ← Back to subscribai.com
          </Link>
        </div>
      </aside>
    </>
  );
}
