"use client";

import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/lib/cart";
import { useFx, formatPriceFromPKR, formatUSD } from "@/lib/fx";
import type { Product } from "@/lib/products";

export default function CartClient({ recommended }: { recommended: Product[] }) {
  const cart = useCart();
  const { currency, usdToPkr, usdToInr, ready: fxReady, region } = useFx();
  // Cart prices are stored in PKR (the canonical currency since 2026-05).
  // For non-PK visitors, formatPriceFromPKR converts via the live FX rate.
  const fmtMoney = (pkr: number) => formatPriceFromPKR(pkr, currency, usdToPkr, fxReady, usdToInr);

  /* Every buyer outside Pakistan pays the admin's fixed USD prices, so quote
     those rather than a converted rupee figure — the cart must match the
     product page and what PayFast will charge. (Mirrors
     usesInternationalPricing in lib/region.ts, which can't be imported here:
     it pulls in next/headers and this is a client component.) */
  const fxRate = fxReady && usdToPkr > 0 ? usdToPkr : 280;
  const useIntlPricing = region !== "PK";
  const itemUsd = (i: { price: number; priceUsd?: number; qty: number }) =>
    (i.priceUsd != null ? i.priceUsd : i.price / fxRate) * (i.qty || 1);
  const intlSubtotal = cart.items.reduce((sum, i) => sum + itemUsd(i), 0);
  const fmtItem = (i: { price: number; priceUsd?: number; qty: number }, unit = false) =>
    useIntlPricing
      ? formatUSD(unit ? itemUsd({ ...i, qty: 1 }) : itemUsd(i))
      : fmtMoney(i.price * (unit ? 1 : i.qty || 1));
  const fmtSummary = (pkr: number, usd: number) => (useIntlPricing ? formatUSD(usd) : fmtMoney(pkr));

  /* Shown under both the empty and the filled cart so shoppers can keep
     adding without navigating away. */
  const RecommendedRow = recommended.length > 0 ? (
    <section className="cart-reco">
      <h2 className="cart-reco-head">Recommended</h2>
      <div className="pl-card-grid">
        {recommended.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  ) : null;

  if (!cart.ready) {
    return (
      <section className="cart-page">
        <div className="v2-container">
          <h1 className="cart-title">Cart</h1>
          <div className="cart-empty">
            <div className="spinner spinner-lg"></div>
            <p>Loading your cart…</p>
          </div>
        </div>
      </section>
    );
  }

  if (cart.items.length === 0) {
    return (
      <section className="cart-page">
        <div className="v2-container">
          <h1 className="cart-title">Cart</h1>

          <div className="cart-empty">
            <div className="cart-empty-icon" aria-hidden>
              <i className="fa-solid fa-basket-shopping"></i>
            </div>
            <h2 className="cart-empty-title">Cart is empty yet</h2>
            <p className="cart-empty-text">Find what you need in the catalog or using the search</p>
            <Link className="cart-empty-btn" href="/shop">Start shopping</Link>
          </div>

          {RecommendedRow}
        </div>
      </section>
    );
  }

  const tax = 0;
  const total = cart.subtotal + tax;

  return (
    <section className="cart-page">
      <div className="v2-container">
        <h1 className="cart-title">Cart</h1>
        <p className="cart-count-line">{cart.count} {cart.count === 1 ? "item" : "items"}</p>

        <div className="cart-grid">
          {/* Line items */}
          <div className="surface-card" style={{ padding: 0 }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {cart.items.map((item, idx) => (
                <li key={item.id} className="cart-line-row" style={{
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
                    {item.variation?.summary && (
                      <span className="cart-variation-summary">{item.variation.summary}</span>
                    )}
                    <small style={{ color: "var(--text-muted)", display: "block", marginTop: 2 }}>{fmtItem(item, true)} each</small>
                  </div>

                  {/* Qty controls */}
                  <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: "var(--radius-pill)", overflow: "hidden", background: "var(--bg-elevated)" }}>
                    <button type="button" onClick={() => cart.setQty(item.id, item.qty - 1)} aria-label="Decrease" style={qtyBtn}>−</button>
                    <span style={{ minWidth: 28, textAlign: "center", color: "var(--text)", fontWeight: 600 }}>{item.qty}</span>
                    <button type="button" onClick={() => cart.setQty(item.id, item.qty + 1)} aria-label="Increase" style={qtyBtn}>+</button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <strong style={{ color: "var(--text)", fontFamily: "var(--font-heading)", fontSize: "var(--fs-lg)" }}>{fmtItem(item)}</strong>
                    <button type="button" onClick={() => cart.remove(item.id)} aria-label="Remove" className="product-icon-action" style={{ background: "var(--surface-soft)" }}>
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Summary */}
          <aside className="surface-card cart-summary">
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-xl)", color: "var(--text)", marginBottom: "var(--space-4)" }}>Order summary</h3>
            <div style={{ display: "grid", gap: 10, fontSize: "var(--fs-sm)", color: "var(--text-soft)" }}>
              <div style={summaryRow}><span>Subtotal</span><span>{fmtSummary(cart.subtotal, intlSubtotal)}</span></div>
              <div style={summaryRow}><span>Taxes</span><span>{fmtMoney(tax)}</span></div>
              <div style={{ ...summaryRow, paddingTop: 12, borderTop: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "var(--fs-lg)" }}>
                <span>Total</span><span>{fmtSummary(total, intlSubtotal)}</span>
              </div>
            </div>
            <Link href="/checkout" className="btn btn-primary btn-large" style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-5)" }}>
              Proceed to checkout <i className="fa-solid fa-arrow-right"></i>
            </Link>

            <Link href="/shop" className="btn btn-outline" style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-3)" }}>
              Continue shopping
            </Link>
            <ul style={{ listStyle: "none", padding: 0, margin: "var(--space-5) 0 0", color: "var(--text-muted)", fontSize: "var(--fs-xs)", display: "grid", gap: 6 }}>
              <li><i className="fa-solid fa-shield-halved" style={{ color: "var(--accent-600)" }}></i> Secure encrypted checkout</li>
              <li><i className="fa-solid fa-clock" style={{ color: "var(--accent-600)" }}></i> Activated in &lt; 30 min</li>
              <li><i className="fa-solid fa-rotate" style={{ color: "var(--accent-600)" }}></i> Replacement guarantee</li>
            </ul>
          </aside>
        </div>

        {RecommendedRow}
      </div>

      {/* Mobile-only sticky checkout bar */}
      <div className="cart-sticky-cta">
        <Link href="/checkout" className="btn btn-primary btn-large">
          Checkout · {fmtSummary(total, intlSubtotal)} <i className="fa-solid fa-arrow-right"></i>
        </Link>
      </div>
    </section>
  );
}

const qtyBtn: React.CSSProperties = {
  width: 32, height: 32, border: "none", background: "transparent", color: "var(--text-soft)", cursor: "pointer", fontSize: 18,
};
const summaryRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "baseline",
};
