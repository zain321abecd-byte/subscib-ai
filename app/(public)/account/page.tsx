"use client";

import Link from "next/link";
import { useCart, type Order } from "@/lib/cart";

const STATUS_LABEL: Record<Order["status"], { label: string; cls: string }> = {
  paid:    { label: "Paid",    cls: "is-paid" },
  pending: { label: "Pending", cls: "is-pending" },
  failed:  { label: "Failed",  cls: "is-failed" },
};

const PROVIDER_LABEL: Record<Order["paymentProvider"], string> = {
  jazzcash: "JazzCash", easypaisa: "Easypaisa", card: "Card",
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("en-PK", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function AccountPage() {
  const cart = useCart();

  if (!cart.ready) {
    return (
      <section className="v2-section">
        <div className="v2-container">
          <div className="surface-card"><div className="empty-state"><div className="spinner spinner-lg"></div><p>Loading your account…</p></div></div>
        </div>
      </section>
    );
  }

  return (
    <section className="v2-section">
      <div className="v2-container">
        <header className="v2-section-head" style={{ textAlign: "left", maxWidth: "none" }}>
          <p className="v2-eyebrow">Account</p>
          <h2>Welcome back</h2>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "var(--space-5)" }} className="acct-grid">
          <div>
            <div className="surface-card" style={{ padding: 0 }}>
              <div style={{ padding: "var(--space-5)", borderBottom: cart.orders.length > 0 ? "1px solid var(--border)" : "none" }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-xl)", color: "var(--text)" }}>
                  Recent orders {cart.orders.length > 0 && (
                    <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)", fontWeight: 500 }}>
                      · {cart.orders.length}
                    </span>
                  )}
                </h3>
              </div>

              {cart.orders.length === 0 ? (
                <div className="empty-state" style={{ padding: "var(--space-7) var(--space-5)" }}>
                  <div className="empty-state-icon"><i className="fa-solid fa-receipt"></i></div>
                  <h3>No orders yet</h3>
                  <p>Once you complete a checkout, your order history and active subscriptions appear here.</p>
                  <Link className="btn btn-primary" href="/shop" style={{ marginTop: "var(--space-3)" }}>Start shopping</Link>
                </div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {cart.orders.map((o, idx) => (
                    <li key={o.orderId} style={{
                      padding: "var(--space-5)",
                      borderTop: idx === 0 ? "none" : "1px solid var(--border)",
                      display: "grid", gap: "var(--space-3)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                            Order {o.orderId}
                          </div>
                          <div style={{ color: "var(--text-soft)", fontSize: "var(--fs-sm)", marginTop: 2 }}>
                            {formatDate(o.placedAt)} · {PROVIDER_LABEL[o.paymentProvider]}
                          </div>
                        </div>
                        <span className={`status-pill ${STATUS_LABEL[o.status].cls}`}>{STATUS_LABEL[o.status].label}</span>
                      </div>

                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                        {o.items.map((it) => (
                          <li key={it.id} style={{ display: "flex", justifyContent: "space-between", color: "var(--text-soft)", fontSize: "var(--fs-sm)" }}>
                            <span>{it.name} × {it.qty}</span>
                            <span>${(it.price * it.qty).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>

                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "baseline",
                        paddingTop: "var(--space-2)", borderTop: "1px solid var(--border)",
                      }}>
                        <strong style={{ color: "var(--text)", fontFamily: "var(--font-heading)" }}>
                          Total: Rs {o.pkrTotal.toLocaleString("en-PK")}
                          <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "var(--fs-xs)", marginLeft: 8 }}>
                            ≈ ${o.subtotalUsd.toFixed(2)}
                          </span>
                        </strong>
                        {o.status === "pending" && (
                          <a
                            href={`https://wa.me/15550132026?text=${encodeURIComponent(`Hi, I'd like to check on order ${o.orderId} (currently pending).`)}`}
                            className="btn btn-outline btn-small"
                            target="_blank" rel="noreferrer"
                          >
                            <i className="fa-brands fa-whatsapp"></i> Check status
                          </a>
                        )}
                        {o.status === "paid" && (
                          <span style={{ color: "var(--success-500)", fontSize: "var(--fs-sm)" }}>
                            <i className="fa-solid fa-circle-check"></i> Activated
                          </span>
                        )}
                        {o.status === "failed" && (
                          <Link href="/shop" className="btn btn-outline btn-small">Retry</Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <aside style={{ display: "grid", gap: "var(--space-4)" }}>
            <div className="surface-card">
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-lg)", color: "var(--text)", marginBottom: "var(--space-3)" }}>Need help?</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10, fontSize: "var(--fs-sm)" }}>
                <li><a href="https://wa.me/15550132026" style={{ color: "var(--brand-300)" }}><i className="fa-brands fa-whatsapp"></i> WhatsApp support</a></li>
                <li><a href="mailto:contact@subscribai.com" style={{ color: "var(--brand-300)" }}><i className="fa-solid fa-envelope"></i> Email us</a></li>
                <li><Link href="/faq" style={{ color: "var(--brand-300)" }}><i className="fa-solid fa-circle-question"></i> FAQ</Link></li>
                <li><Link href="/refund" style={{ color: "var(--brand-300)" }}><i className="fa-solid fa-rotate"></i> Refund policy</Link></li>
              </ul>
            </div>
            <div className="surface-card">
              <span className="badge badge-brand" style={{ marginBottom: "var(--space-3)" }}>Tip</span>
              <p style={{ color: "var(--text-soft)", fontSize: "var(--fs-sm)" }}>
                Order history is stored locally in this browser. Sign-in with cross-device sync is coming soon.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <style>{`@media (max-width: 880px) { .acct-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}
