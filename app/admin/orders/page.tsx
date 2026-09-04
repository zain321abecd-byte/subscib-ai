import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import StatusPill from "../StatusPill";
import OrdersFilters from "./OrdersFilters";
import type { OrderRow } from "@/lib/supabase/types";

export const metadata = { title: "Orders" };

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
    // PostgREST `or` uses comma as the separator between conditions, so any
    // comma in the user's input would break the query. Escape it (and trim
    // wildcards that could explode).
    const safe = search.replace(/[,()]/g, "").slice(0, 80);
    const pat = `%${safe}%`;
    query = query.or(
      [
        `order_number.ilike.${pat}`,
        `customer_email.ilike.${pat}`,
        `customer_name.ilike.${pat}`,
        `customer_phone.ilike.${pat}`,
        `transaction_id.ilike.${pat}`,
        `utm_source.ilike.${pat}`,
        `utm_campaign.ilike.${pat}`,
      ].join(","),
    );
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

      <OrdersFilters count={orders.length} />

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
                  <th>Source</th>
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
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {o.user_id ? (
                          <i className="fa-solid fa-circle-check" title="Signed-in customer" style={{ color: "#22c55e", fontSize: 11 }}></i>
                        ) : (
                          <i className="fa-solid fa-circle" title="Guest order" style={{ color: "var(--text-muted)", fontSize: 9 }}></i>
                        )}
                        <span>{o.customer_email}</span>
                      </div>
                      {o.customer_phone && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", paddingLeft: 18 }}>{o.customer_phone}</div>}
                    </td>
                    <td>
                      <div>{Array.isArray(o.items) ? o.items.reduce((s, i: any) => s + Number(i.qty || 1), 0) : 0}</div>
                      {o.package_tier && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "capitalize" }}>{o.package_tier}</div>}
                    </td>
                    <td>{fmtPKR(o.subtotal_pkr ?? Number(o.subtotal_usd))}</td>
                    <td>
                      {o.utm_source ? (
                        <div>
                          <strong style={{ color: "var(--text)" }}>{o.utm_source}</strong>
                          {o.utm_medium && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{o.utm_medium}</div>}
                        </div>
                      ) : o.referrer ? (
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }} title={o.referrer}>
                          {(() => { try { return new URL(o.referrer).hostname; } catch { return "referral"; } })()}
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>direct</span>
                      )}
                    </td>
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
