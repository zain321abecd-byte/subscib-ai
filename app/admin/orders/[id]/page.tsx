import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAdminContext } from "@/lib/admin-auth";
import StatusPill from "../../StatusPill";
import OrderControls from "./OrderControls";
import type { OrderRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function fmtPKR(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(Number(n));
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const isUuid = /^[0-9a-f-]{36}$/i.test(id);
  const filterCol = isUuid ? "id" : "order_number";
  const { data, error } = await supabase.from("orders").select("*").eq(filterCol, id).maybeSingle();
  if (error || !data) notFound();
  const order = data as OrderRow;

  // "Send delivery message" shortcut — only for teammates who may actually
  // send, with a count of what has already gone out for this order.
  const me = await getAdminContext();
  const canSendDelivery = !!me && (me.isSuper || me.effectivePermissions.includes("delivery:send"));
  let deliveriesSent = 0;
  if (canSendDelivery) {
    const { count } = await getSupabaseAdmin()
      .from("delivery_messages")
      .select("id", { count: "exact", head: true })
      .eq("order_id", order.id)
      .neq("status", "failed");
    deliveriesSent = count ?? 0;
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const fmtPhone = order.customer_phone ? order.customer_phone.replace(/^\+/, "") : null;
  const whatsappLink = fmtPhone ? `https://wa.me/${fmtPhone}` : null;

  return (
    <>
      <header className="admin-page-head">
        <div>
          <p style={{ margin: 0 }}><Link href="/admin/orders" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>← Orders</Link></p>
          <h1>Order <code style={{ fontSize: "0.7em" }}>{order.order_number}</code></h1>
          <p>
            Placed {new Date(order.created_at).toLocaleString()} · <StatusPill status={order.status} />
          </p>
        </div>
      </header>

      <div className="admin-order-grid">
        <div style={{ display: "grid", gap: 14 }}>
          <div className="admin-card">
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--text)", margin: "0 0 12px" }}>Items</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {items.map((it: any, i: number) => (
                    <tr key={`${it.id}-${i}`}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>{it.name}</div>
                        {it.variation?.summary && (
                          <div style={{ fontSize: "0.78rem", color: "var(--brand-300)", marginTop: 2 }}>
                            {it.variation.summary}
                          </div>
                        )}
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}><code>{it.id}</code></div>
                      </td>
                      <td>{it.qty}</td>
                      <td>Rs {Number(it.price).toLocaleString("en-PK")}</td>
                      <td>Rs {(Number(it.price) * Number(it.qty || 1)).toLocaleString("en-PK")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ textAlign: "right", color: "var(--text-muted)" }}>Subtotal (PKR)</td>
                    <td>{fmtPKR(order.subtotal_pkr)}</td>
                  </tr>
                  {order.subtotal_usd != null && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "right", color: "var(--text-muted)" }}>≈ USD</td>
                      <td>${Number(order.subtotal_usd).toFixed(2)}</td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>

          <div className="admin-card">
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--text)", margin: "0 0 12px" }}>Customer</h3>
            <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "8px 18px", margin: 0 }}>
              <dt style={{ color: "var(--text-muted)" }}>Account</dt>
              <dd style={{ margin: 0 }}>
                {order.user_id ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span className="admin-pill admin-pill-paid" title={order.user_id}>
                      <i className="fa-solid fa-user-check" style={{ marginRight: 4 }}></i>
                      Signed-in customer
                    </span>
                    <code style={{ fontSize: "0.75em", color: "var(--text-muted)" }}>
                      {order.user_id.slice(0, 8)}…
                    </code>
                  </span>
                ) : (
                  <span className="admin-pill admin-pill-pending">
                    <i className="fa-solid fa-user-slash" style={{ marginRight: 4 }}></i>
                    Guest
                  </span>
                )}
              </dd>
              <dt style={{ color: "var(--text-muted)" }}>Email</dt>
              <dd style={{ margin: 0 }}><a href={`mailto:${order.customer_email}`}>{order.customer_email}</a></dd>
              {order.customer_name && (<>
                <dt style={{ color: "var(--text-muted)" }}>Name</dt>
                <dd style={{ margin: 0 }}>{order.customer_name}</dd>
              </>)}
              {order.customer_phone && (<>
                <dt style={{ color: "var(--text-muted)" }}>Phone</dt>
                <dd style={{ margin: 0 }}>
                  {order.customer_phone}{" "}
                  {whatsappLink && <a href={whatsappLink} target="_blank" rel="noopener" style={{ marginLeft: 6 }}>WhatsApp →</a>}
                </dd>
              </>)}
              {order.payment_method && (<>
                <dt style={{ color: "var(--text-muted)" }}>Method</dt>
                <dd style={{ margin: 0, textTransform: "capitalize" }}>{order.payment_method}</dd>
              </>)}
              {order.transaction_id && (<>
                <dt style={{ color: "var(--text-muted)" }}>Txn ID</dt>
                <dd style={{ margin: 0 }}><code style={{ fontSize: "0.85em" }}>{order.transaction_id}</code></dd>
              </>)}
              {order.delivered_at && (<>
                <dt style={{ color: "var(--text-muted)" }}>Delivered</dt>
                <dd style={{ margin: 0 }}>{new Date(order.delivered_at).toLocaleString()}</dd>
              </>)}
              {order.package_tier && (<>
                <dt style={{ color: "var(--text-muted)" }}>Package</dt>
                <dd style={{ margin: 0, textTransform: "capitalize" }}>{order.package_tier}</dd>
              </>)}
            </dl>
          </div>

          {/* Traffic attribution */}
          {(order.utm_source || order.referrer || order.landing_page) && (
            <div className="admin-card">
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--text)", margin: "0 0 12px" }}>Traffic source</h3>
              <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "8px 18px", margin: 0 }}>
                {order.utm_source && (<>
                  <dt style={{ color: "var(--text-muted)" }}>Source</dt>
                  <dd style={{ margin: 0 }}>{order.utm_source}</dd>
                </>)}
                {order.utm_medium && (<>
                  <dt style={{ color: "var(--text-muted)" }}>Medium</dt>
                  <dd style={{ margin: 0 }}>{order.utm_medium}</dd>
                </>)}
                {order.utm_campaign && (<>
                  <dt style={{ color: "var(--text-muted)" }}>Campaign</dt>
                  <dd style={{ margin: 0 }}>{order.utm_campaign}</dd>
                </>)}
                {order.referrer && (<>
                  <dt style={{ color: "var(--text-muted)" }}>Referrer</dt>
                  <dd style={{ margin: 0, wordBreak: "break-all" }}>
                    <a href={order.referrer} target="_blank" rel="noopener" style={{ color: "var(--brand-300)" }}>
                      {order.referrer}
                    </a>
                  </dd>
                </>)}
                {order.landing_page && (<>
                  <dt style={{ color: "var(--text-muted)" }}>Landing</dt>
                  <dd style={{ margin: 0, wordBreak: "break-all", fontSize: "0.85rem" }}>{order.landing_page}</dd>
                </>)}
              </dl>
            </div>
          )}
        </div>

        <OrderControls order={order} canSendDelivery={canSendDelivery} deliveriesSent={deliveriesSent} />
      </div>
    </>
  );
}
