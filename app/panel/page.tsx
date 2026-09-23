import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseAdmin, hasServiceRole } from "@/lib/supabase/admin";
import { getPanelUser } from "@/lib/panel/auth";
import { PLATFORM_LABELS, type Platform } from "@/lib/panel/types";
import LoginForm from "./login/LoginForm";

export const metadata: Metadata = {
  title: "SMM Panel — followers, likes and views, delivered",
  description:
    "Order Instagram, TikTok, YouTube and Facebook growth from one wallet. Pay with card, bank, JazzCash or Easypaisa. Same SubscribAI account you already have.",
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

type CategoryPreview = { name: string; platform: Platform; from: number };

/**
 * Public landing page for the panel.
 *
 * Everything here is best-effort: it must render for a logged-out stranger
 * even if Supabase is unreachable, so every query is wrapped and falls back to
 * an empty state rather than throwing. A marketing page that 500s is worse
 * than one with no numbers on it.
 */
async function loadPreview(): Promise<{
  categories: CategoryPreview[];
  serviceCount: number;
  ordersDelivered: number;
}> {
  const empty = { categories: [], serviceCount: 0, ordersDelivered: 0 };
  if (!hasServiceRole()) return empty;

  try {
    const db = getSupabaseAdmin();
    const [{ data: services }, { data: cats }, { count: delivered }] = await Promise.all([
      db.from("panel_services").select("category_id, rate_per_1000, active").eq("active", true),
      db.from("panel_service_categories").select("id, name, platform").eq("active", true).order("sort_order"),
      db.from("panel_orders").select("id", { count: "exact", head: true }).eq("status", "completed"),
    ]);

    const rows = services ?? [];
    const categories: CategoryPreview[] = (cats ?? [])
      .map((c: { id: string; name: string; platform: Platform }) => {
        const prices = rows
          .filter((s: { category_id: string | null }) => s.category_id === c.id)
          .map((s: { rate_per_1000: number }) => Number(s.rate_per_1000))
          .filter((n: number) => Number.isFinite(n) && n > 0);
        return prices.length
          ? { name: c.name, platform: c.platform, from: Math.min(...prices) }
          : null;
      })
      .filter((c): c is CategoryPreview => c !== null)
      .slice(0, 8);

    return { categories, serviceCount: rows.length, ordersDelivered: delivered ?? 0 };
  } catch {
    return empty;
  }
}

const FEATURES = [
  {
    icon: "⚡",
    title: "Starts in minutes",
    body: "Most services begin within the hour. Every order shows its live status, so you are never left guessing whether it went through.",
  },
  {
    icon: "◆",
    title: "One wallet, no surprises",
    body: "Top up once and spend it across any service. The price you see is the price charged — calculated from the catalog, never from the browser.",
  },
  {
    icon: "↺",
    title: "Automatic refunds",
    body: "If an order is cancelled or fails, the money goes straight back to your wallet. You do not have to ask, and it cannot be paid back twice.",
  },
  {
    icon: "✉",
    title: "Support that answers",
    body: "Open a ticket from inside the panel and the reply lands in the same thread, attached to the order it is about.",
  },
];

const STEPS = [
  { n: 1, title: "Sign in", body: "Use your existing subscribai.com account. There is nothing new to register for." },
  { n: 2, title: "Add funds", body: "Pay by card, bank transfer, JazzCash or Easypaisa. Online payments credit your wallet immediately." },
  { n: 3, title: "Place an order", body: "Pick a service, paste the link, choose a quantity. The cost is shown before you confirm." },
  { n: 4, title: "Watch it land", body: "Track progress from My Orders. Completed, partial or refunded — the status is always current." },
];

const FAQS = [
  {
    q: "Do I need a separate account for the panel?",
    a: "No. The panel uses the same email and password as your subscribai.com shop account. If you can sign in to the shop, you can sign in here — you will just be asked once, because the two keep separate sessions.",
  },
  {
    q: "How do I pay?",
    a: "Choose Pay online on the Add funds page for card, bank account or mobile wallet through PayFast — your balance updates the moment the payment is confirmed. If you would rather transfer directly to our bank account, use the second tab and an administrator will confirm it by hand.",
  },
  {
    q: "What happens if an order fails?",
    a: "The charge is returned to your wallet automatically, and the order shows as refunded. You do not need to open a ticket for it.",
  },
  {
    q: "Can I get a refund on a completed order?",
    a: "No. Once a service has been delivered it cannot be undone, which is why the link and quantity are worth double-checking before you confirm. A wrong or private link is the most common cause of a failed order.",
  },
  {
    q: "Is there an API?",
    a: "Yes. Generate a key under Settings once you are signed in, and you can place orders from your own site or script.",
  },
];

export default async function PanelLandingPage() {
  // Someone already signed in wants their dashboard, not the sales pitch.
  const user = await getPanelUser();
  if (user) redirect("/panel/dashboard");

  const { categories, serviceCount, ordersDelivered } = await loadPreview();

  return (
    <div className="bg-[var(--surface-2)]">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/panel" className="flex items-center gap-2 font-bold text-[var(--text)]">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm text-white">SP</span>
            <span>SubscribAI Panel</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--text-muted)] md:flex">
            <a href="#services" className="hover:text-[var(--text)]">Services</a>
            <a href="#how" className="hover:text-[var(--text)]">How it works</a>
            <a href="#faq" className="hover:text-[var(--text)]">FAQ</a>
            <Link href="/" className="hover:text-[var(--text)]">Shop</Link>
          </nav>

          <a href="#signin" className="panel-btn panel-btn-primary !py-2 text-sm">Sign in</a>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,400px)] md:items-center md:py-20">
        <div>
          <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            Now part of subscribai.com
          </span>

          <h1 className="mt-4 text-3xl font-bold leading-tight text-[var(--text)] sm:text-4xl md:text-5xl">
            Followers, likes and views —{" "}
            <span className="text-brand-600 dark:text-brand-400">ordered in seconds</span>
          </h1>

          <p className="mt-4 max-w-xl text-base text-[var(--text-muted)] sm:text-lg">
            Grow on Instagram, TikTok, YouTube and Facebook from one balance. Pay with card, bank,
            JazzCash or Easypaisa — and use the SubscribAI account you already have.
          </p>

          <ul className="mt-6 grid gap-2.5 text-sm text-[var(--text)]">
            {[
              "No new account — your shop login works here",
              "Wallet credited the moment your payment clears",
              "Failed or cancelled orders refund themselves",
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] text-white">
                  ✓
                </span>
                {point}
              </li>
            ))}
          </ul>

          <dl className="mt-8 grid max-w-md grid-cols-3 gap-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Services</dt>
              <dd className="mt-0.5 text-2xl font-bold text-[var(--text)]">
                {serviceCount ? serviceCount.toLocaleString() : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Delivered</dt>
              <dd className="mt-0.5 text-2xl font-bold text-[var(--text)]">
                {ordersDelivered ? ordersDelivered.toLocaleString() : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Support</dt>
              <dd className="mt-0.5 text-2xl font-bold text-[var(--text)]">24/7</dd>
            </div>
          </dl>
        </div>

        {/* Sign-in lives in the hero, the way every SMM panel does it — the
            visitor is usually a returning customer, not a first-timer. */}
        <div id="signin" className="panel-card p-6 shadow-sm md:scroll-mt-24">
          <h2 className="text-lg font-bold text-[var(--text)]">Sign in</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Same email and password as your subscribai.com account.
          </p>
          <LoginForm next="/panel/dashboard" />
          <p className="mt-4 border-t border-[var(--border)] pt-4 text-center text-sm text-[var(--text-muted)]">
            No account yet?{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Create one on the shop
            </Link>
          </p>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className="bg-[var(--surface)] py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-[var(--text)] sm:text-3xl">
            Built to be boring in the right places
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--text-muted)]">
            Fast where it matters, predictable where it counts, and honest about what happened to your money.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="panel-card p-5">
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-lg text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                >
                  {f.icon}
                </span>
                <h3 className="mt-3.5 text-base font-bold text-[var(--text)]">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services preview ───────────────────────────────────────────── */}
      <section id="services" className="scroll-mt-20 py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-[var(--text)] sm:text-3xl">
            What you can order
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--text-muted)]">
            Rates are per 1,000 units. Sign in to see every service with its minimum, maximum and speed.
          </p>

          {categories.length === 0 ? (
            <p className="mx-auto mt-8 max-w-md rounded-xl border border-dashed border-[var(--border)] px-6 py-10 text-center text-sm text-[var(--text-muted)]">
              The catalog is being set up. Sign in shortly and it will be here.
            </p>
          ) : (
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((c) => (
                <div key={c.name} className="panel-card flex flex-col gap-1 p-5">
                  <span className="text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                    {PLATFORM_LABELS[c.platform] ?? c.platform}
                  </span>
                  <span className="text-base font-semibold text-[var(--text)]">{c.name}</span>
                  <span className="mt-1 text-sm text-[var(--text-muted)]">
                    from{" "}
                    <strong className="text-[var(--text)]">
                      {c.from.toLocaleString("en-PK", { minimumFractionDigits: 2 })} PKR
                    </strong>{" "}
                    / 1k
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section id="how" className="scroll-mt-20 bg-brand-600 py-14 text-white md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Four steps, start to finish</h2>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-xl bg-white/10 p-5 backdrop-blur-sm">
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white text-base font-bold text-brand-700"
                >
                  {s.n}
                </span>
                <h3 className="mt-3.5 text-base font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/80">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 text-center">
            <a href="#signin" className="panel-btn bg-white font-bold text-brand-700 hover:bg-white/90">
              Get started
            </a>
          </div>
        </div>
      </section>

      {/* ── Payments ───────────────────────────────────────────────────── */}
      <section className="bg-[var(--surface)] py-12">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Ways to pay
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {["Debit / credit card", "Bank transfer", "JazzCash", "Easypaisa", "UnionPay"].map((m) => (
              <span
                key={m}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-sm font-medium text-[var(--text)]"
              >
                {m}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Card and wallet payments are handled by PayFast and credit your balance automatically.
          </p>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-20 py-14 md:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-[var(--text)] sm:text-3xl">
            Questions people actually ask
          </h2>

          {/* <details> rather than a JS accordion: it works before hydration,
              it is keyboard accessible for free, and it is searchable in-page. */}
          <div className="mt-8 grid gap-2.5">
            {FAQS.map((f) => (
              <details key={f.q} className="panel-card group p-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-[var(--text)]">
                  {f.q}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-lg text-[var(--text-muted)] transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="border-t border-[var(--border)] px-5 py-4 text-sm leading-relaxed text-[var(--text-muted)]">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
          <Link href="/panel" className="flex items-center gap-2 font-bold text-[var(--text)]">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-xs text-white">SP</span>
            SubscribAI Panel
          </Link>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-[var(--text-muted)]">
            <Link href="/" className="hover:text-[var(--text)]">Shop</Link>
            <Link href="/contact" className="hover:text-[var(--text)]">Contact</Link>
            <Link href="/terms" className="hover:text-[var(--text)]">Terms</Link>
            <Link href="/privacy" className="hover:text-[var(--text)]">Privacy</Link>
            <Link href="/refund" className="hover:text-[var(--text)]">Refunds</Link>
          </nav>
          <p className="max-w-xl text-xs leading-relaxed text-[var(--text-muted)]">
            Check the link, quantity and service before you confirm an order. Invalid links, private
            accounts and wrong formats cause failed orders. © {new Date().getFullYear()} SubscribAI.
          </p>
        </div>
      </footer>
    </div>
  );
}
