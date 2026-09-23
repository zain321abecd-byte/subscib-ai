import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { EmptyState, Money, PageHeader, Stat, TableWrap, Th } from "@/components/panel/ui";
import { ORDER_STATUS_LABELS, type Order, type OrderStatus } from "@/lib/panel/types";
import AdminOrderRow from "./AdminOrderRow";

export const metadata: Metadata = { title: "All orders" };
export const dynamic = "force-dynamic";

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  ...(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => ({
    value: s,
    label: ORDER_STATUS_LABELS[s],
  })),
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const search = (q || "").trim();
  const db = getSupabaseAdmin();

  let query = db.from("panel_orders").select("*").order("created_at", { ascending: false }).limit(300);
  if (status && status in ORDER_STATUS_LABELS) query = query.eq("status", status);
  if (search) query = query.or(`service_name.ilike.%${search}%,link.ilike.%${search}%`);

  const { data } = await query;
  const orders = (data ?? []) as Order[];

  // One lookup for the whole page rather than a join per row.
  const userIds = [...new Set(orders.map((o) => o.user_id))];
  const { data: profileRows } = userIds.length
    ? await db.from("users").select("id, email, name").in("id", userIds)
    : { data: [] };
  const byUser = new Map((profileRows ?? []).map((p: { id: string; email: string; name: string | null }) => [p.id, p]));

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const revenue = orders
    .filter((o) => !o.refunded_at && o.status !== "cancelled" && o.status !== "failed")
    .reduce((sum, o) => sum + Number(o.charge || 0), 0);

  return (
    <>
      <PageHeader title="All orders" subtitle="Move orders along, forward them to a provider, or cancel with an automatic refund." />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Shown" value={orders.length.toLocaleString()} hint="Most recent 300" />
        <Stat label="Awaiting action" value={pendingCount.toLocaleString()} hint="Status: pending" />
        <Stat label="Value shown" value={<Money value={revenue} />} hint="Excludes cancelled, failed and refunded" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const active = (status || "") === f.value;
            const href = f.value ? `/admin/orders?status=${f.value}` : "/admin/orders";
            return (
              <Link
                key={f.label}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  active ? "bg-brand-600 text-white" : "bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        <form method="get" className="ml-auto flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={search} placeholder="Search service or link"
                 className="panel-input max-w-xs !py-1.5 text-sm" aria-label="Search orders" />
          <button type="submit" className="panel-btn panel-btn-ghost !py-1.5 text-sm">Search</button>
        </form>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders here"
          body={status || search ? "Nothing matches this filter." : "Orders appear as customers place them."}
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Placed</Th>
              <Th>Customer</Th>
              <Th>Service</Th>
              <Th align="right">Qty</Th>
              <Th align="right">Charge</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <AdminOrderRow
                key={o.id}
                order={o}
                customer={byUser.get(o.user_id)?.name || byUser.get(o.user_id)?.email || "unknown"}
              />
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
