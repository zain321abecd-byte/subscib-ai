import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePanelUser } from "@/lib/panel/auth";
import { EmptyState, LinkButton, Money, OrderBadge, PageHeader, Stat, TableWrap, Td, Th } from "@/components/panel/ui";
import type { Order, WalletTransaction } from "@/lib/panel/types";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function PanelDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;
  const user = await requirePanelUser();
  const db = getSupabaseAdmin();

  // Panel RLS has no policies, so every filter here is load-bearing: it's the
  // only thing scoping these rows to the signed-in user.
  const [{ data: transactions }, { data: orderRows }] = await Promise.all([
    db
      .from("panel_wallet_transactions")
      .select("id, user_id, type, amount, balance_after, reference, note, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    db
      .from("panel_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const recent = (transactions ?? []) as WalletTransaction[];
  const orders = (orderRows ?? []) as Order[];

  const balance = Number(user.wallet.balance ?? 0);
  const currency = user.wallet.currency ?? "PKR";

  const active = orders.filter((o) =>
    ["pending", "processing", "in_progress"].includes(o.status),
  ).length;
  const completed = orders.filter((o) => o.status === "completed").length;
  const spent = orders
    .filter((o) => !o.refunded_at && o.status !== "cancelled" && o.status !== "failed")
    .reduce((sum, o) => sum + Number(o.charge || 0), 0);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Dashboard"
        subtitle="Your balance and activity at a glance."
        action={<LinkButton href="/panel/orders/new">New order</LinkButton>}
      />

      {denied === "admin" && (
        <p
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
        >
          That area is for panel administrators.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Wallet balance"
          value={<Money value={balance} currency={currency} />}
          hint="Top-ups arrive once an admin approves them"
        />
        <Stat label="Active orders" value={active.toLocaleString()} hint="Pending or in progress" />
        <Stat label="Completed orders" value={completed.toLocaleString()} />
        <Stat label="Total spent" value={<Money value={spent} currency={currency} />} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Recent orders
        </h2>
        {orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            body="Pick something from the catalog and your order will show up here with its live status."
            action={<LinkButton href="/panel/services" variant="ghost">Browse services</LinkButton>}
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Placed</Th>
                <Th>Service</Th>
                <Th align="right">Quantity</Th>
                <Th align="right">Charge</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map((o) => (
                <tr key={o.id}>
                  <Td className="whitespace-nowrap text-[var(--text-muted)]">
                    {new Date(o.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </Td>
                  <Td className="font-medium text-[var(--text)]">{o.service_name}</Td>
                  <Td align="right" className="whitespace-nowrap">{o.quantity.toLocaleString()}</Td>
                  <Td align="right" className="whitespace-nowrap font-semibold text-[var(--text)]">
                    <Money value={o.charge} currency={currency} />
                  </Td>
                  <Td><OrderBadge status={o.status} /></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Recent transactions
        </h2>
        {recent.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            body="Every credit and debit is listed here with the balance after each one."
            action={<LinkButton href="/panel/wallet" variant="ghost">Add funds</LinkButton>}
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Type</Th>
                <Th>Detail</Th>
                <Th align="right">Amount</Th>
                <Th align="right">Balance after</Th>
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t.id}>
                  <Td className="whitespace-nowrap text-[var(--text-muted)]">
                    {new Date(t.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </Td>
                  <Td>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        t.type === "credit"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {t.type === "credit" ? "Credit" : "Debit"}
                    </span>
                  </Td>
                  <Td className="text-[var(--text-muted)]">{t.note || "—"}</Td>
                  <Td align="right" className="whitespace-nowrap font-semibold text-[var(--text)]">
                    {t.type === "credit" ? "+" : "−"}
                    {Number(t.amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                  </Td>
                  <Td align="right" className="whitespace-nowrap text-[var(--text-muted)]">
                    <Money value={t.balance_after} currency={currency} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>
    </div>
  );
}
