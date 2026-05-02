import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";
import type { OrderRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Pending",   cls: "is-pending" },
  paid:      { label: "Paid",      cls: "is-paid" },
  delivered: { label: "Delivered", cls: "is-delivered" },
  failed:    { label: "Failed",    cls: "is-failed" },
  refunded:  { label: "Refunded",  cls: "is-refunded" },
  cancelled: { label: "Cancelled", cls: "is-cancelled" },
};

function fmtPKR(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(Number(n));
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function AccountPage() {
  const user = await getCustomer();
  if (!user) redirect("/login?next=/account");

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const orders = (data ?? []) as OrderRow[];
  const fullName = (user.user_metadata as any)?.full_name || user.email || "there";

  return (
    <section className="v2-section">
      <div className="v2-container">
        <header className="v2-section-head" style={{ textAlign: "left", maxWidth: "none", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p className="v2-eyebrow">Account</p>
            <h2>Hi {fullName}</h2>
            <p style={{ color: "var(--text-muted)", marginTop: 6 }}>{user.email}</p>
          </div>
          <SignOutButton />
        </header>

        {error && (
          <div className="surface-card" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.20)", color: "#fca5a5" }}>
            {error.message}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="surface-card">
            <div className="empty-state">
              <div className="empty-state-icon"><i className="fa-solid fa-bag-shopping"></i></div>
              <h3>No orders yet</h3>
              <p>When you place your first order, it&rsquo;ll show up here.</p>
              <Link href="/shop" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                Browse the shop
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--text)", margin: 0 }}>Your orders ({orders.length})</h3>

            {orders.map((o) => {
              const pill = STATUS_PILL[o.status] || { label: o.status, cls: "" };
              const items = Array.isArray(o.items) ? o.items : [];
              return (
                <article key={o.id} className="account-order">
                  <header className="account-order-head">
                    <div>
                      <code className="account-order-number">{o.order_number}</code>
                      <span className={`account-order-pill ${pill.cls}`}>{pill.label}</span>
                    </div>
                    <span className="account-order-date">{fmtDate(o.created_at)}</span>
                  </header>

                  <ul className="account-order-items">
                    {items.map((it: any, i: number) => (
                      <li key={`${it.id}-${i}`}>
                        <span>{it.name}</span>
                        <small>× {it.qty} · ${Number(it.price).toFixed(2)}</small>
                      </li>
                    ))}
                  </ul>

                  <footer className="account-order-foot">
                    <div>
                      <strong>{fmtPKR(o.subtotal_pkr ?? Number(o.subtotal_usd))}</strong>
                      <small> ≈ ${Number(o.subtotal_usd).toFixed(2)}</small>
                    </div>
                    {o.payment_method && (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "capitalize" }}>
                        {o.payment_method}
                      </span>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
