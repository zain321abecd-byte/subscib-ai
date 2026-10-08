"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

const links = [
  ["Orders", "/panel/admin/orders"], ["Payments", "/panel/admin/payments"],
  ["Provider services", "/panel/admin/services"], ["Added services", "/panel/admin/services/added"], ["Providers", "/panel/admin/providers"],
  ["Users", "/panel/admin/users"], ["Reports", "/panel/admin/reports"],
] as const;

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="panel-sidebar sticky top-0 z-30 flex h-dvh flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] p-4 md:fixed md:inset-y-0 md:left-0 md:w-[260px]">
      <Link href="/panel/admin/orders" className="flex items-center gap-3 px-2 py-2 text-[var(--text)]">
        <BrandLogo size={36} />
        <div><span className="block font-bold">Panel Admin</span><span className="block text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Restricted console</span></div>
      </Link>
      <nav className="mt-6 grid gap-1" aria-label="Panel administration">
        {links.map(([label, href]) => <Link key={href} href={href} className={`panel-sidebar-link ${pathname === href ? "active" : ""}`}>{label}</Link>)}
      </nav>
      <div className="mt-auto grid gap-1 border-t border-[var(--border)] pt-4">
        <Link href="/panel/dashboard" className="panel-sidebar-link">Customer panel</Link>
        <Link href="/" className="panel-sidebar-link">Shop website</Link>
      </div>
    </aside>
  );
}
