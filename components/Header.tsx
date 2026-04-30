"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";

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
  const pathname = usePathname();
  const { count, ready } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
          <Link className="v2-icon-btn" href="/cart" aria-label="Cart">
            <i className="fa-solid fa-cart-shopping"></i>
            <span className="v2-cart-count" {...(ready && count > 0 ? {} : { "data-empty": true })}>{count}</span>
          </Link>
          <Link className="btn btn-outline btn-small" href="/account">Account</Link>
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

      <div className={`v2-mobile-drawer ${drawerOpen ? "is-open" : ""}`} aria-hidden={!drawerOpen}>
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href} onClick={closeDrawer}>{label}</Link>
        ))}
        <Link href="/account" className="btn btn-outline" onClick={closeDrawer}>Account</Link>
        <Link href="/shop" className="btn btn-primary" onClick={closeDrawer}>Start now</Link>
      </div>
    </header>
  );
}
