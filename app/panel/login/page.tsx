import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPanelUser } from "@/lib/panel/auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function PanelLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  // Already signed in — don't show a login form to someone who has a session.
  const existing = await getPanelUser();
  if (existing) redirect(safeNext(next));

  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--surface-2)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-[var(--text)]">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-sm text-white">SP</span>
            SubscribAI Panel
          </Link>
        </div>

        <div className="panel-card p-6">
          <h1 className="text-xl font-bold text-[var(--text)]">Sign in</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Use the same email and password as your subscribai.com account.
          </p>

          {error === "not_configured" && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
            >
              The panel isn&apos;t fully configured yet. An administrator needs to set the API and
              database keys before sign-in will work.
            </p>
          )}

          <LoginForm next={safeNext(next)} />
        </div>

        <p className="mt-5 text-center text-sm text-[var(--text-muted)]">
          No account yet?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Create one on the shop
          </Link>{" "}
          — it works here too.
        </p>
      </div>
    </div>
  );
}

/**
 * Only ever redirect to a path inside the panel. Without this, `?next=` is an
 * open redirect: a link could send someone through our sign-in and straight
 * out to an attacker's page wearing our domain in the referrer.
 */
function safeNext(next: string | undefined): string {
  if (!next) return "/panel";
  if (!next.startsWith("/panel")) return "/panel";
  if (next.startsWith("//")) return "/panel";
  return next;
}
