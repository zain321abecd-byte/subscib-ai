import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { Card, EmptyState, Money, PageHeader, Stat, TableWrap, Td, Th } from "@/components/panel/ui";
import type { Order } from "@/lib/panel/types";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

/** Orders that the customer actually paid for — the basis of every figure here. */
function isBillable(o: Order) {
  return !o.refunded_at && o.status !== "cancelled" && o.status !== "failed";
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const range: Range = RANGES.includes(Number(days) as Range) ? (Number(days) as Range) : 30;

  const since = new Date();
  since.setDate(since.getDate() - range);
  const sinceIso = since.toISOString();

  const db = getSupabaseAdmin();

  const [{ data: orderRows }, { data: paymentRows }, { count: userCount }] = await Promise.all([
    db.from("panel_orders").select("*").gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(2000),
    db.from("panel_payment_requests").select("amount, status, created_at").gte("created_at", sinceIso).limit(2000),
    db.from("panel_profiles").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
  ]);

  const orders = (orderRows ?? []) as Order[];
  const billable = orders.filter(isBillable);

  const revenue = billable.reduce((sum, o) => sum + Number(o.charge || 0), 0);
  const refunded = orders
    .filter((o) => o.refunded_at)
    .reduce((sum, o) => sum + Number(o.charge || 0), 0);
  const toppedUp = (paymentRows ?? [])
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const averageOrder = billable.length ? revenue / billable.length : 0;

  // Revenue by service.
  const byService = new Map<string, { count: number; revenue: number }>();
  for (const o of billable) {
    const row = byService.get(o.service_name) ?? { count: 0, revenue: 0 };
    row.count += 1;
    row.revenue += Number(o.charge || 0);
    byService.set(o.service_name, row);
  }
  const topServices = [...byService.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10);

  // Revenue by day, most recent first.
  const byDay = new Map<string, { count: number; revenue: number }>();
  for (const o of billable) {
    const key = o.created_at.slice(0, 10);
    const row = byDay.get(key) ?? { count: 0, revenue: 0 };
    row.count += 1;
    row.revenue += Number(o.charge || 0);
    byDay.set(key, row);
  }
  const days14 = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
  const peak = Math.max(1, ...days14.map(([, v]) => v.revenue));

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`Orders placed in the last ${range} days. Cancelled, failed and refunded orders are excluded from revenue.`}
      />

      <div className="mb-5 flex flex-wrap gap-1.5">
        {RANGES.map((r) => (
          <a
            key={r}
            href={`/panel/admin/reports?days=${r}`}
            aria-current={r === range ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              r === range ? "bg-brand-600 text-white" : "bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Last {r} days
          </a>
        ))}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue" value={<Money value={revenue} />} hint={`${billable.length.toLocaleString()} billable orders`} />
        <Stat label="Average order" value={<Money value={averageOrder} />} />
        <Stat label="Refunded" value={<Money value={refunded} />} hint="Returned to wallets" />
        <Stat label="Wallet top-ups" value={<Money value={toppedUp} />} hint="Approved in this period" />
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orders placed" value={orders.length.toLocaleString()} />
        <Stat label="Completed" value={(statusCounts.completed ?? 0).toLocaleString()} />
        <Stat label="Still open" value={((statusCounts.pending ?? 0) + (statusCounts.processing ?? 0) + (statusCounts.in_progress ?? 0)).toLocaleString()} />
        <Stat label="New accounts" value={(userCount ?? 0).toLocaleString()} />
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders in this period"
          body="Pick a longer range, or come back once customers start ordering."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">Revenue by day</h2>
            <ul className="grid gap-2">
              {days14.map(([day, v]) => (
                <li key={day} className="grid grid-cols-[88px_1fr_auto] items-center gap-3 text-sm">
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </span>
                  <span className="h-2 rounded-full bg-[var(--surface-3)]" aria-hidden="true">
                    <span
                      className="block h-2 rounded-full bg-brand-600"
                      style={{ width: `${Math.max(3, (v.revenue / peak) * 100)}%` }}
                    />
                  </span>
                  <span className="whitespace-nowrap text-xs font-semibold text-[var(--text)]">
                    <Money value={v.revenue} />
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">Top services</h2>
            <TableWrap>
              <thead>
                <tr>
                  <Th>Service</Th>
                  <Th align="right">Orders</Th>
                  <Th align="right">Revenue</Th>
                </tr>
              </thead>
              <tbody>
                {topServices.map(([name, v]) => (
                  <tr key={name}>
                    <Td className="font-medium text-[var(--text)]">{name}</Td>
                    <Td align="right" className="text-[var(--text-muted)]">{v.count.toLocaleString()}</Td>
                    <Td align="right" className="whitespace-nowrap font-semibold text-[var(--text)]">
                      <Money value={v.revenue} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        </div>
      )}
    </>
  );
}
