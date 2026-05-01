import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import StatusPill from "../StatusPill";
import StyledSelectField from "../StyledSelectField";
import type { OrderRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const STATUSES = ["all", "pending", "paid", "delivered", "failed", "refunded", "cancelled"] as const;

function fmtPKR(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(Number(n));
}

export default async function OrdersAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const filter = (params.status || "all") as (typeof STATUSES)[number];
  const search = (params.q || "").trim();

  const supabase = await getSupabaseServer();
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
  if (filter !== "all") query = query.eq("status", filter);
  if (search) {
    // Search either by order_number or customer email.
    query = query.or(`order_number.ilike.%${search}%,customer_email.ilike.%${search}%`);
  }
  const { data, error } = await query;
  const orders = (data ?? []) as OrderRow[];

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Orders</h1>
          <p>Live feed of customer orders. Update status as you fulfil.</p>
        </div>
      </header>

      <form className="admin-toolbar" method="get">
        <input
          name="q"
          className="admin-input"
          placeholder="Search by order # or email…"
          defaultValue={search}
        />
        <div style={{ minWidth: 180 }}>
          <StyledSelectField
            name="status"
            defaultValue={filter}
            options={STATUSES.map((s) => ({ value: s, label: s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1) }))}
            ariaLabel="Status filter"
          />
        </div>
        <button type="submit" className="admin-btn admin-btn-ghost">Filter</button>
        <div className="admin-toolbar-spacer" />
        <span style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>{orders.length} {orders.length === 1 ? "order" : "orders"}</span>
      </form>

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {error.message}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="admin-card admin-empty">
          <i className="fa-solid fa-inbox"></i>
          <div>No orders match those filters.</div>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><code>{o.order_number}</code></td>
                    <td>
                      <div>{o.customer_email}</div>
                      {o.customer_phone && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{o.customer_phone}</div>}
                    </td>
                    <td>{Array.isArray(o.items) ? o.items.reduce((s, i: any) => s + Number(i.qty || 1), 0) : 0}</td>
                    <td>{fmtPKR(o.subtotal_pkr ?? Number(o.subtotal_usd))}</td>
                    <td><StatusPill status={o.status} /></td>
                    <td style={{ whiteSpace: "nowrap" }}>{new Date(o.created_at).toLocaleString()}</td>
                    <td><Link href={`/admin/orders/${o.id}`} className="admin-btn admin-btn-ghost" style={{ padding: "6px 12px" }}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
