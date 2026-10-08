import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import AdminLoginForm from "./AdminLoginForm";

export const metadata: Metadata = { title: "Panel admin sign in", robots: { index: false, follow: false } };

export default async function PanelAdminLoginPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--surface-2)] px-4 py-10">
      <section className="panel-card w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <BrandLogo size={42} />
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-brand-600">SubscribAI</p><h1 className="text-xl font-bold text-[var(--text)]">Panel administration</h1></div>
        </div>
        <p className="mt-4 text-sm text-[var(--text-muted)]">A separate, restricted workspace for services, providers, payments, users, and reports.</p>
        {denied && <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">Your customer account is not a panel administrator.</p>}
        <AdminLoginForm />
        <div className="mt-5 flex justify-between border-t border-[var(--border)] pt-4 text-xs text-[var(--text-muted)]"><Link href="/panel/login">Customer sign in</Link><Link href="/">Back to shop</Link></div>
      </section>
    </main>
  );
}
