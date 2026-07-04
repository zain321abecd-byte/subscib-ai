"use client";

/**
 * Settings section tabs. Uses `useTransition` + programmatic
 * router.push so the target tab lights up **immediately** on click.
 * The actual loading indicator lives inside the content area
 * (`loading.tsx`) — the nav stays quiet so users don't see two
 * spinners at once.
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";

const SECTIONS = [
  { href: "/admin/settings/general",  label: "General",  icon: "fa-sliders" },
  { href: "/admin/settings/content",  label: "Content",  icon: "fa-align-left" },
  { href: "/admin/settings/branding", label: "Branding", icon: "fa-paintbrush" },
  { href: "/admin/settings/social",   label: "Social",   icon: "fa-share-nodes" },
  { href: "/admin/settings/currency", label: "Currency", icon: "fa-coins" },
  { href: "/admin/settings/seo",      label: "SEO",      icon: "fa-magnifying-glass-chart" },
];

export default function SettingsNav() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [targetHref, setTargetHref] = useState<string | null>(null);

  // Once the router has actually landed on the pending target, drop the
  // optimistic highlight so the "active" state is driven only by the
  // real pathname again.
  useEffect(() => {
    if (targetHref && pathname.startsWith(targetHref)) setTargetHref(null);
  }, [pathname, targetHref]);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    // Preserve cmd/ctrl-click → open in new tab, and no-op on same tab.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (pathname === href || pathname.startsWith(href + "/")) { e.preventDefault(); return; }
    e.preventDefault();
    setTargetHref(href);
    startTransition(() => router.push(href));
  }

  return (
    <nav className="settings-tabs" aria-label="Settings sections">
      {SECTIONS.map((s) => {
        const isReal   = pathname === s.href || pathname.startsWith(s.href + "/");
        const isTarget = targetHref === s.href;
        const active = isReal || isTarget;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`settings-tab ${active ? "is-active" : ""}`}
            aria-current={active ? "page" : undefined}
            aria-busy={isTarget && isPending ? true : undefined}
            onClick={(e) => handleClick(e, s.href)}
          >
            <i className={`fa-solid ${s.icon}`}></i>
            <span>{s.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
