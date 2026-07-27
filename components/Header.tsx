"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import CurrencySwitcher from "@/components/CurrencySwitcher";
import MobileMenu from "@/components/MobileMenu";

/* Utility-bar links (plati: Buyers / Sellers / Affiliates) */
const TOP_NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/prices", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

/* Category bar (plati: Games / Cards / Software for PC / ...) */
const CATS = [
  { href: "/shop#ai-subscriptions", icon: "fa-comments", label: "AI Subscriptions" },
  { href: "/shop#design-tools", icon: "fa-palette", label: "Design & Image AI" },
  { href: "/shop#productivity", icon: "fa-bolt-lightning", label: "Productivity" },
  { href: "/shop#automation", icon: "fa-diagram-project", label: "Automation" },
  { href: "/shop#courses", icon: "fa-graduation-cap", label: "Courses" },
];

export default function Header({ mobileWhatsAppUrl = "" }: { mobileWhatsAppUrl?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, ready: authReady } = useAuth();
  const authed = authReady ? !!user : null;
  const pathname = usePathname();
  const { count, ready } = useCart();
  const chatHref = mobileWhatsAppUrl || "/contact";
  const purchasesHref = authed ? "/account" : "/login";

  return (
    <>
      {/* The three bars are SIBLINGS (not nested in one <header>): position:
          sticky can only stick within its parent's height, so the sticky
          main bar must live directly at page level to stay pinned for the
          whole scroll. Top/category bars scroll away naturally. */}

      {/* ── Row 1: utility bar (desktop only) ──────────────────────────── */}
      <div className="pl-topbar">
          <div className="v2-container pl-topbar-row">
            <nav className="pl-topbar-nav" aria-label="Secondary">
              {TOP_NAV.map(({ href, label }) => (
                <Link key={href} href={href} className={pathname === href ? "is-active" : ""}>{label}</Link>
              ))}
            </nav>
            <div className="pl-topbar-right">
              <CurrencySwitcher />
            </div>
          </div>
        </div>

        {/* ── Row 2: logo / catalog / search / actions (plati order).
            Only THIS bar is sticky — the utility bar above and the category
            bar below scroll away naturally with the page (no collapse
            animation → no layout shift → no shake). ─────────────────────── */}
        <header className="pl-main-bar">
        <div className="v2-container pl-main-row">
          <Link className="pl-brand" href="/" aria-label="SubscribAI home">
            <Image src="/assets/subscribai-logo.png" alt="SubscribAI" width={149} height={36} priority />
          </Link>

          {/* Desktop: orange Catalog link. Mobile: same orange square opens
              the menu (CSS re-orders it to the far left on mobile). */}
          <Link className="pl-catalog-btn pl-catalog-desktop" href="/shop">
            <i className="fa-solid fa-table-cells-large" aria-hidden></i>
            <span>Catalog</span>
          </Link>
          <button
            type="button"
            className="pl-catalog-btn pl-catalog-mobile"
            onClick={() => setMenuOpen(true)}
            aria-label="Open catalog menu"
            aria-expanded={menuOpen}
          >
            <i className="fa-solid fa-table-cells-large" aria-hidden></i>
          </button>

          <form className="pl-search" action="/shop" role="search">
            <input
              type="search"
              name="q"
              placeholder="Product search"
              aria-label="Product search"
              autoComplete="off"
            />
            <button type="submit" aria-label="Search">
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </form>

          <div className="pl-actions">
            <a className="pl-action-tile" href={chatHref} target={mobileWhatsAppUrl ? "_blank" : undefined} rel="noopener">
              <i className="fa-solid fa-comment-dots"></i>
              <span>Chat</span>
            </a>
            {authed ? (
              <Link className="pl-action-tile" href="/account">
                <i className="fa-solid fa-box-open"></i>
                <span>Purchases</span>
              </Link>
            ) : (
              <Link className="pl-action-tile" href="/login">
                <i className="fa-solid fa-user"></i>
                <span>Sign in</span>
              </Link>
            )}
            <Link className="pl-action-tile pl-action-cart" href="/cart">
              <i className="fa-solid fa-cart-shopping"></i>
              <span>Cart</span>
              {ready && count > 0 && <b className="pl-cart-badge">{count > 99 ? "99+" : count}</b>}
            </Link>
          </div>

          {/* Mobile: search toggle on the right (plati's magnifier) */}
          <button
            type="button"
            className="pl-mobile-icon pl-search-toggle"
            onClick={() => setSearchOpen((o) => !o)}
            aria-label="Toggle search"
            aria-expanded={searchOpen}
          >
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
        </div>

        {/* Mobile search bar (toggled by the magnifier) */}
        <form className={`pl-search pl-search-mobile v2-container ${searchOpen ? "is-open" : ""}`} action="/shop" role="search">
          <input type="search" name="q" placeholder="Product search" aria-label="Product search" autoComplete="off" />
          <button type="submit" aria-label="Search"><i className="fa-solid fa-magnifying-glass"></i></button>
        </form>
        </header>{/* /.pl-main-bar — the product page portals its price bar here */}

        {/* ── Row 3: category bar ────────────────────────────────────────── */}
        <nav className="pl-catnav" aria-label="Categories">
          <div className="v2-container pl-catnav-row">
            {CATS.map(({ href, icon, label }) => (
              <Link key={href} href={href}>
                <i className={`fa-solid ${icon}`} aria-hidden></i>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <MobileMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          authed={authed}
          whatsappUrl={mobileWhatsAppUrl}
        />

      {/* ── Mobile bottom tab bar (plati: Home / Chat / Purchases / Cart) ── */}
      <nav className="pl-tabbar" aria-label="Mobile navigation">
        <Link href="/" className={pathname === "/" ? "is-active" : ""}>
          <i className="fa-solid fa-house"></i>
          <span>Home</span>
        </Link>
        <Link href="/shop" className={pathname === "/shop" ? "is-active" : ""}>
          <i className="fa-solid fa-store"></i>
          <span>Shop</span>
        </Link>
        <a href={chatHref} target={mobileWhatsAppUrl ? "_blank" : undefined} rel="noopener">
          <i className="fa-solid fa-comment-dots"></i>
          <span>Chat</span>
        </a>
        <Link href={purchasesHref} className={pathname === "/account" ? "is-active" : ""}>
          <i className="fa-solid fa-box-open"></i>
          <span>Purchases</span>
        </Link>
        <Link href="/cart" className={`pl-tabbar-cart ${pathname === "/cart" ? "is-active" : ""}`}>
          <i className="fa-solid fa-cart-shopping"></i>
          <span>Cart</span>
          {ready && count > 0 && <b className="pl-cart-badge">{count > 99 ? "99+" : count}</b>}
        </Link>
      </nav>
    </>
  );
}
