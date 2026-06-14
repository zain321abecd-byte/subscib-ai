"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import CurrencySwitcher from "@/components/CurrencySwitcher";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import MobileMenu from "@/components/MobileMenu";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/prices", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const pathname = usePathname();
  const { count, ready } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  return (
    <header className={`v2-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="v2-container v2-header-row">
        <Link className="v2-brand" href="/" aria-label="SubscribAI home">
          {/* Intrinsic source is 537×130 (≈4.13:1). The width/height props here
              must match that aspect or the image gets squashed when CSS only
              constrains one dimension. CSS uses width:auto + height:Xpx so the
              browser scales proportionally on every breakpoint. */}
          <Image src="/assets/subscribai-logo.png" alt="SubscribAI" width={149} height={36} priority />
        </Link>

        {/* Desktop primary nav */}
        <nav className="v2-nav hidden md:flex" aria-label="Primary">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} className={pathname === href ? "is-active" : ""}>{label}</Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="v2-header-actions hidden md:flex">
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
        </div>

        {/* Mobile actions — cart icon + hamburger only. Everything else lives
            in the slide-down menu (MobileMenu). */}
        <div className="mobile-header-actions flex md:hidden items-center gap-1">
          <Link
            href="/cart"
            aria-label={`Cart${ready && count > 0 ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`}
            className="mobile-header-icon mobile-header-cart
              relative inline-flex h-11 w-11 items-center justify-center
              rounded-full
              text-ink-50 active:bg-white/10
              transition-colors
            "
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 4h2l2.4 11.2A2 2 0 0 0 9.36 17H17.5a2 2 0 0 0 1.96-1.6L21 8H6" />
              <circle cx="10" cy="20" r="1.25" fill="currentColor" stroke="none" />
              <circle cx="17" cy="20" r="1.25" fill="currentColor" stroke="none" />
            </svg>
            {ready && count > 0 && (
              <span
                className="
                  absolute top-1 right-1
                  min-w-4.5 h-4.5 px-1
                  rounded-full bg-brand-500 text-white
                  text-[10px] font-semibold leading-4.5 text-center
                  ring-2 ring-ink-1000
                "
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="mobile-header-icon mobile-header-menu
              relative inline-flex h-11 w-11 items-center justify-center
              appearance-none bg-transparent border-0 cursor-pointer
              rounded-full
              text-ink-50 active:bg-white/10
              transition-colors
            "
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} authed={authed} />
    </header>
  );
}
