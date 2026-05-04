"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/admin/settings/general",  label: "General",  icon: "fa-sliders" },
  { href: "/admin/settings/branding", label: "Branding", icon: "fa-paintbrush" },
  { href: "/admin/settings/social",   label: "Social",   icon: "fa-share-nodes" },
  { href: "/admin/settings/currency", label: "Currency", icon: "fa-coins" },
  { href: "/admin/settings/seo",      label: "SEO",      icon: "fa-magnifying-glass-chart" },
];

export default function SettingsNav() {
  const pathname = usePathname() || "";

  return (
    <nav className="settings-tabs" aria-label="Settings sections">
      {SECTIONS.map((s) => {
        const active = pathname === s.href || pathname.startsWith(s.href + "/");
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`settings-tab ${active ? "is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <i className={`fa-solid ${s.icon}`}></i>
            <span>{s.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
