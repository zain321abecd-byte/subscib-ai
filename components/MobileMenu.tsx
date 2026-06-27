"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import CurrencySwitcher from "@/components/CurrencySwitcher";

/**
 * Mobile menu — full-screen slide-down panel triggered by the Header's
 * hamburger. Web-native pattern (Apple.com, Stripe.com style):
 *   • Anchored at the top of the viewport so it doesn't fight the browser's
 *     own bottom UI.
 *   • Covers the whole viewport so users aren't distracted by content behind.
 *   • Tap targets ≥ 56px; primary destinations get badges + descriptions.
 *   • Hidden on ≥1024px (desktop has the inline nav).
 *
 * Usage: <MobileMenu open onClose />. The button that toggles it lives in
 * the Header so the trigger sits in the visible top bar.
 */
export default function MobileMenu({
  open,
  onClose,
  authed,
}: {
  open: boolean;
  onClose: () => void;
  authed: boolean | null;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Close on route change so a tap navigates + dismisses in one action.
  useEffect(() => { if (open) onClose(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pathname]);

  // Lock body scroll while open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Esc to dismiss — keyboard-accessible.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
      aria-hidden={!open}
      className={`premium-mobile-menu
        fixed inset-0 z-[80]
        md:hidden
        bg-ink-1000
        flex flex-col
        transition-[opacity,transform] duration-250 ease-out
        ${open
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-3 pointer-events-none"}
      `}
    >
      {/* Top bar — mirrors the site Header so the visual anchor stays put. */}
      <div className="premium-mobile-menu-top flex items-center justify-between px-5 pt-3 pb-3 border-b border-white/10">
        <Image
          src="/assets/subscribai-logo.png"
          alt="SubscribAI"
          width={140}
          height={36}
          className="premium-mobile-menu-logo h-7 w-auto"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="premium-mobile-menu-close h-11 w-11 grid place-items-center rounded-full appearance-none bg-transparent border-0 cursor-pointer text-ink-50 active:bg-white/10 transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div
        className="premium-mobile-menu-scroll flex-1 overflow-y-auto px-5 pt-4 pb-8"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
      >
        {/* Primary navigation — large taps, no descriptions, just speed. */}
        <div className="premium-mobile-menu-hero">
          <p>Premium AI tools</p>
          <h2>Choose where you want to go.</h2>
          <span>Fast checkout, local support, and instant digital delivery.</span>
        </div>

        <ul className="premium-mobile-menu-list flex flex-col list-none p-0 m-0">
          {PRIMARY.map((link) => {
            const active = link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  className={`premium-mobile-menu-link
                    flex items-center justify-between gap-3
                    py-4 border-b border-white/5
                    text-[19px] font-semibold tracking-tight
                    ${active ? "is-active text-brand-500" : "text-ink-50"}
                    active:translate-x-0.5 transition-transform
                  `}
                >
                  <span className="inline-flex items-center gap-3">
                    <span className={`premium-mobile-menu-link-icon
                      h-9 w-9 grid place-items-center rounded-sm
                      ${active ? "bg-brand-500/15 text-brand-500" : "bg-white/[0.04] text-ink-200"}
                    `}>
                      {link.icon}
                    </span>
                    {link.label}
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="premium-mobile-menu-arrow text-ink-400">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Currency + auth + primary CTA */}
        <div className="premium-mobile-menu-actions mt-6 grid grid-cols-1 gap-3">
          <div className="premium-mobile-currency
            flex items-center justify-between gap-3
            rounded-md bg-white/[0.03] border border-white/10
            px-4 py-3
          ">
            <div>
              <p className="text-[12px] uppercase tracking-wider text-ink-400 leading-tight">Currency</p>
              <p className="text-sm font-semibold text-ink-50 leading-tight mt-1">Show prices in</p>
            </div>
            <CurrencySwitcher />
          </div>

          {authed ? (
            <Link
              href="/account"
              onClick={onClose}
              className="premium-mobile-secondary
                flex items-center justify-center gap-2
                h-12 rounded-md
                bg-white/[0.04] border border-white/10
                text-ink-50 font-semibold
                active:bg-white/10 transition-colors
              "
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c1.2-3.4 4-5 7-5s5.8 1.6 7 5" />
              </svg>
              Your account
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="premium-mobile-secondary
                flex items-center justify-center gap-2
                h-12 rounded-md
                bg-white/[0.04] border border-white/10
                text-ink-50 font-semibold
                active:bg-white/10 transition-colors
              "
            >
              Sign in
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </Link>
          )}

          <Link
            href="/shop"
            onClick={onClose}
            className="premium-mobile-primary
              flex items-center justify-center gap-2
              h-12 rounded-md
              bg-brand-500 active:bg-brand-700
              text-white font-semibold
              shadow-[0_10px_28px_-10px_rgba(255,122,26,0.7)]
              transition-colors
            "
          >
            Start shopping
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </Link>
        </div>

        <p className="premium-mobile-help mt-5 text-center text-[13px] text-ink-400">
          Need help?{" "}
          <a href="https://wa.me/15550132026" className="text-brand-500 font-semibold inline-flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.5 3.5A11 11 0 0 0 3.4 18.1L2 22l4-1.4A11 11 0 1 0 20.5 3.5ZM12 20.2a9 9 0 0 1-4.6-1.3l-.3-.2-2.8.9.9-2.7-.2-.3a9.2 9.2 0 1 1 7 3.6Zm5-6.7c-.3-.1-1.6-.8-1.9-.9-.3-.1-.5-.1-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.8-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5L9 7.6c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.4-.3.3-1 1-1 2.4 0 1.4 1.1 2.8 1.2 3 .1.2 2.1 3.4 5.2 4.7.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.6-.7 1.9-1.3.2-.6.2-1.1.2-1.3-.1-.2-.3-.3-.6-.4Z"/>
            </svg>
            WhatsApp us
          </a>
        </p>
      </div>
    </div>,
    document.body,
  );
}

/* -----------------------------------------------------------------------------
 * Primary navigation links — matches the desktop nav, plus Account.
 * ---------------------------------------------------------------------------*/

const PRIMARY: Array<{ href: string; label: string; icon: React.ReactNode }> = [
  { href: "/",         label: "Home",     icon: <IconHome /> },
  { href: "/shop",     label: "Shop",     icon: <IconShop /> },
  { href: "/prices",   label: "Pricing",  icon: <IconTag />  },
  { href: "/blog",     label: "Blog",     icon: <IconBook /> },
  { href: "/contact",  label: "Contact",  icon: <IconChat /> },
  { href: "/faq",      label: "FAQ",      icon: <IconHelp /> },
];

const SVG = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconHome() { return <svg {...SVG}><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1v-9"/></svg>; }
function IconShop() { return <svg {...SVG}><path d="M4 7h16l-1.2 11.2A2 2 0 0 1 16.8 20H7.2a2 2 0 0 1-2-1.8L4 7Z"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/></svg>; }
function IconTag()  { return <svg {...SVG}><path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="8" cy="8" r="1.5"/></svg>; }
function IconBook() { return <svg {...SVG}><path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4V4Z"/><path d="M20 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8V4Z"/></svg>; }
function IconChat() { return <svg {...SVG}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l.9-5.4A8 8 0 1 1 21 12Z"/></svg>; }
function IconHelp() { return <svg {...SVG}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1 1.2-1 1.7v.5"/><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"/></svg>; }
