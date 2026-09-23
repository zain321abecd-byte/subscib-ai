import Link from "next/link";
import { requirePanelUser } from "@/lib/panel/auth";
import Sidebar from "@/components/panel/Sidebar";
import ThemeToggle from "@/components/panel/ThemeToggle";
import SignOutButton from "@/components/panel/SignOutButton";

export const dynamic = "force-dynamic";

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

  const displayName = user.name?.trim() || user.email.split("@")[0];
  const balance = Number(user.wallet.balance ?? 0);
  const currency = user.wallet.currency ?? "PKR";

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[260px_1fr]">
      <Sidebar isAdmin={user.isAdmin} />

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text)]">Hi {displayName}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {user.isAdmin ? "Administrator" : "Customer"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/panel/wallet"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-right"
            >
              <span className="block text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                Balance
              </span>
              <span className="block text-sm font-bold text-[var(--text)]">
                {balance.toLocaleString("en-PK", { minimumFractionDigits: 2 })} {currency}
              </span>
            </Link>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
