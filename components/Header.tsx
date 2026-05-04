"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import CurrencySwitcher from "@/components/CurrencySwitcher";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/prices", label: "Pricing" },
  { href: "/freebies", label: "Freebies" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  // The drawer is portalled to document.body so it escapes the header's
  // backdrop-filter (which creates a containing block that breaks position:fixed).
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { count, ready } = useCart();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track customer auth state — Header re-renders on sign-in/sign-out.
  useEffect(() => {
    let cancelled = false;
    try {
      const supabase = getSupabaseBrowser();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!cancelled) setAuthed(!!user);
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
        setAuthed(!!session?.user);
      });
      return () => { cancelled = true; sub.subscription.unsubscribe(); };
    } catch {
      setAuthed(false);
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
  }, [drawerOpen]);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <header className={`v2-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="v2-container v2-header-row">
        <Link className="v2-brand" href="/" aria-label="SubscribAI home">
          <Image src="/assets/subscribai-logo.png" alt="SubscribAI" width={140} height={36} priority />
        </Link>

        <nav className="v2-nav" aria-label="Primary">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} className={pathname === href ? "is-active" : ""}>{label}</Link>
          ))}
        </nav>

        <div className="v2-header-actions">
          <CurrencySwitcher />
          <Link className="v2-icon-btn" href="/cart" aria-label="Cart">
            <i className="fa-solid fa-cart-shopping"></i>
            <span className="v2-cart-count" {...(ready && count > 0 ? {} : { "data-empty": true })}>{count}</span>
          </Link>
          {authed ? (
            <Link className="btn btn-outline btn-small" href="/account"><i className="fa-solid fa-user"></i> Account</Link>
          ) : (
            <Link className="btn btn-outline btn-small" href="/login">Sign in</Link>
          )}
          <Link className="btn btn-primary btn-small" href="/shop">Start now</Link>
          <button
            className="v2-burger"
            type="button"
            aria-label="Menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((o) => !o)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>

      {/* Drawer is portalled below — escapes header's backdrop-filter. */}
      {mounted && createPortal(
        <>
          <div
            className={`v2-mobile-backdrop ${drawerOpen ? "is-open" : ""}`}
            aria-hidden="true"
            onClick={closeDrawer}
          />
          <aside
            className={`v2-mobile-drawer ${drawerOpen ? "is-open" : ""}`}
            aria-hidden={!drawerOpen}
            aria-label="Site navigation"
          >
            <div className="v2-mobile-drawer-head">
              <span className="v2-mobile-drawer-title">Menu</span>
              <button
                type="button"
                className="v2-mobile-drawer-close"
                onClick={closeDrawer}
                aria-label="Close menu"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <nav className="v2-mobile-drawer-nav">
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={closeDrawer}
                  className={pathname === href ? "is-active" : ""}
                >
                  {label}
                  <i className="fa-solid fa-arrow-right" aria-hidden></i>
                </Link>
              ))}
            </nav>

            <div className="v2-mobile-drawer-actions">
              {authed ? (
                <Link href="/account" className="btn btn-outline btn-large" onClick={closeDrawer}>
                  <i className="fa-solid fa-user"></i> Your account
                </Link>
              ) : (
                <Link href="/login" className="btn btn-outline btn-large" onClick={closeDrawer}>
                  <i className="fa-solid fa-right-to-bracket"></i> Sign in
                </Link>
              )}
              <Link href="/shop" className="btn btn-primary btn-large" onClick={closeDrawer}>
                Start now <i className="fa-solid fa-arrow-right"></i>
              </Link>
            </div>
          </aside>
        </>,
        document.body,
      )}
    </header>
  );
}
