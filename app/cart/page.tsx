"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export default function CartPage() {
  const cart = useCart();

  if (!cart.ready) {
    return (
      <section className="v2-section">
        <div className="v2-container">
          <div className="surface-card"><div className="empty-state"><div className="spinner spinner-lg"></div><p>Loading your cart…</p></div></div>
        </div>
      </section>
    );
  }

  if (cart.items.length === 0) {
    return (
      <section className="v2-section">
        <div className="v2-container">
          <div className="surface-card">
            <div className="empty-state">
              <div className="empty-state-icon"><i className="fa-solid fa-cart-shopping"></i></div>
              <h3>Your cart is empty</h3>
              <p>Browse the shop to add AI subscriptions, courses, or templates.</p>
              <Link className="btn btn-primary" href="/shop" style={{ marginTop: "var(--space-3)" }}>Browse shop</Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const tax = 0;
  const total = cart.subtotal + tax;

  return (
    <section className="v2-section">
      <div className="v2-container">
        <header className="v2-section-head" style={{ textAlign: "left", maxWidth: "none" }}>
          <p className="v2-eyebrow">Your cart</p>
          <h2>{cart.count} {cart.count === 1 ? "item" : "items"}</h2>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "var(--space-5)", alignItems: "start" }} className="cart-grid">
          {/* Line items */}
          <div className="surface-card" style={{ padding: 0 }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {cart.items.map((item, idx) => (
                <li key={item.id} style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: "var(--space-4)",
                  alignItems: "center",
                  padding: "var(--space-5)",
                  borderTop: idx === 0 ? "none" : "1px solid var(--border)",
                }}>
                  <div className={`product-media ${item.thumbClass || "media-orange"}`} style={{ width: 80, height: 80, minHeight: 80, borderRadius: "var(--radius-md)", fontSize: "1.6rem" }}>
                    <i className={item.iconClass || "fa-solid fa-box"}></i>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", color: "var(--text)", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "var(--fs-md)" }}>{item.name}</strong>
                    <small style={{ color: "var(--text-muted)", display: "block", marginTop: 2 }}>${item.price} each</small>
                  </div>

                  {/* Qty controls */}
                  <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: "var(--radius-pill)", overflow: "hidden", background: "var(--bg-elevated)" }}>
                    <button type="button" onClick={() => cart.setQty(item.id, item.qty - 1)} aria-label="Decrease" style={qtyBtn}>−</button>
                    <span style={{ minWidth: 28, textAlign: "center", color: "var(--text)", fontWeight: 600 }}>{item.qty}</span>
                    <button type="button" onClick={() => cart.setQty(item.id, item.qty + 1)} aria-label="Increase" style={qtyBtn}>+</button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <strong style={{ color: "var(--text)", fontFamily: "var(--font-heading)", fontSize: "var(--fs-lg)" }}>${(item.price * item.qty).toFixed(2)}</strong>
                    <button type="button" onClick={() => cart.remove(item.id)} aria-label="Remove" className="product-icon-action" style={{ background: "var(--surface-soft)" }}>
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Summary */}
          <aside className="surface-card" style={{ position: "sticky", top: 92 }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-xl)", color: "var(--text)", marginBottom: "var(--space-4)" }}>Order summary</h3>
            <div style={{ display: "grid", gap: 10, fontSize: "var(--fs-sm)", color: "var(--text-soft)" }}>
              <div style={summaryRow}><span>Subtotal</span><span>${cart.subtotal.toFixed(2)}</span></div>
              <div style={summaryRow}><span>Taxes</span><span>${tax.toFixed(2)}</span></div>
              <div style={{ ...summaryRow, paddingTop: 12, borderTop: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "var(--fs-lg)" }}>
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>
            <Link href="/checkout" className="btn btn-primary btn-large" style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-5)" }}>
              Proceed to checkout <i className="fa-solid fa-arrow-right"></i>
            </Link>
            <Link href="/shop" className="btn btn-outline" style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-3)" }}>
              Continue shopping
            </Link>
            <ul style={{ listStyle: "none", padding: 0, margin: "var(--space-5) 0 0", color: "var(--text-muted)", fontSize: "var(--fs-xs)", display: "grid", gap: 6 }}>
              <li><i className="fa-solid fa-shield-halved" style={{ color: "var(--accent-600)" }}></i> Secure SahulatPay checkout</li>
              <li><i className="fa-solid fa-clock" style={{ color: "var(--accent-600)" }}></i> Activated in &lt; 30 min</li>
              <li><i className="fa-solid fa-rotate" style={{ color: "var(--accent-600)" }}></i> Replacement guarantee</li>
            </ul>
          </aside>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .cart-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

const qtyBtn: React.CSSProperties = {
  width: 32, height: 32, border: "none", background: "transparent", color: "var(--text-soft)", cursor: "pointer", fontSize: 18,
};
const summaryRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "baseline",
};
