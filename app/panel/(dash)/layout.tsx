import Link from "next/link";
import { requirePanelUser } from "@/lib/panel/auth";
import Sidebar from "@/components/panel/Sidebar";
import ThemeToggle from "@/components/panel/ThemeToggle";
import SignOutButton from "@/components/panel/SignOutButton";
import { Money } from "@/components/panel/ui";
import AdminSidebar from "@/components/panel/AdminSidebar";
import { headers } from "next/headers";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Shell for every signed-in panel page: sidebar, top bar, balance.
 *
 * requirePanelUser() both resolves the session and creates the panel profile
 * and wallet on a first visit, so by the time a page renders those rows are
 * guaranteed to exist. Pages call it again for their own copy of the user —
 * that's a cheap cookie read plus one /auth/me call, and it means no page
 * depends on the layout having run.
 */
export default async function PanelDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePanelUser();
  const pathname = (await headers()).get("x-pathname") || "";
  const isAdminArea = pathname.startsWith("/panel/admin");

  const displayName = user.name?.trim() || user.email.split("@")[0];
  const balance = Number(user.wallet.balance ?? 0);
  const currency = user.wallet.currency ?? "PKR";

  return (
    <div className="panel-dashboard-shell min-h-dvh md:grid md:grid-cols-[260px_1fr]">
      {isAdminArea ? (
        // The wrapper keeps the first grid column reserved while the actual
        // admin navigation is fixed to the viewport on desktop.
        <div className="md:w-[260px]">
          <AdminSidebar />
        </div>
      ) : (
        // Reserve the grid column while the customer navigation itself stays
        // fixed to the viewport. Only the page content scrolls on desktop.
        <div className="md:w-[260px]">
          <Sidebar isAdmin={user.isAdmin} />
        </div>
      )}

      <div className="min-w-0 flex min-h-dvh flex-col">
        <header className="panel-dashboard-topbar fixed left-2 right-2 top-[72px] z-40 !m-0 flex items-center justify-between gap-2 px-3 py-2.5 sm:px-6 md:left-[276px] md:right-4 md:top-3 md:gap-3 md:py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text)]">{isAdminArea ? "Panel administration" : `Hi ${displayName}`}</p>
            <p className="panel-user-role text-xs text-[var(--text-muted)]">
              {isAdminArea ? displayName : user.isAdmin ? "Administrator" : "Customer"}
            </p>
          </div>

          <div className="panel-topbar-actions flex shrink-0 items-center gap-1.5 sm:gap-2">
            {!isAdminArea && <Link
              href="/panel/wallet"
              className="panel-balance-card rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-right sm:px-3"
            >
              <span className="block text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                Balance
              </span>
              <span className="block text-sm font-bold text-[var(--text)]">
                <Money value={balance} currency={currency} />
              </span>
            </Link>}
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>
        <div aria-hidden="true" className="h-[76px] shrink-0 md:h-[86px]" />

        <main className="panel-dashboard-content min-w-0 flex-1 p-3 sm:p-6">{children}</main>
        <footer className="mx-4 mb-4 flex flex-col gap-2 border-t border-[var(--border)] px-1 py-4 text-xs text-[var(--text-muted)] sm:mx-6 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SubscribAI Panel</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Panel legal navigation">
            <Link href="/contact">Support</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/refund">Refunds</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
