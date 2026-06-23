"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import { formatPriceFromPKR, useFx } from "@/lib/fx";
import { readAttribution } from "@/components/TrafficCapture";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { apiUrl, authHeaders } from "@/lib/api-client";

type StatusPill = "idle" | "submitting" | "redirecting" | "failed";

/** PayFast BASKET_ID must be <= 20 chars, alphanumeric (+ _ -). */
function newBasketId(): string {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `O${stamp}${random}`.toUpperCase().slice(0, 19);
}

type InitFields = Record<string, string>;

export default function CheckoutPage() {
  const cart = useCart();
  const { currency, usdToPkr, usdToInr, ready: fxReady, region } = useFx();
  const isPK = region === "PK";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [status, setStatus] = useState<StatusPill>("idle");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const autoSubmitRef = useRef<HTMLFormElement | null>(null);
  const [pendingPost, setPendingPost] = useState<{ action: string; fields: InitFields } | null>(null);

  // Optional auth prefill — guests can check out; signed-in users get prefill.
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (user) {
        if (user.email) setEmail(user.email);
        const fullName = (user.user_metadata as Record<string, unknown> | undefined)?.full_name;
        if (typeof fullName === "string") setName(fullName);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user?.email) setEmail(session.user.email);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  // Submit the hidden form to PayFast as soon as it's mounted with fields.
  useEffect(() => {
    if (pendingPost && autoSubmitRef.current) {
      autoSubmitRef.current.submit();
    }
  }, [pendingPost]);

  const pkrTotal = Math.round(cart.subtotal);
  const pkrFormatted = pkrTotal.toLocaleString("en-PK");
  const usdTotal = fxReady && usdToPkr > 0 ? cart.subtotal / usdToPkr : 0;
  const usdFormatted = usdTotal.toFixed(2);
  const fmtMoney = (pkr: number) => formatPriceFromPKR(pkr, currency, usdToPkr, fxReady, usdToInr);

  if (cart.ready && cart.items.length === 0 && status === "idle") {
    return (
      <section className="v2-section">
        <div className="v2-container">
          <div className="surface-card">
            <div className="empty-state">
              <div className="empty-state-icon"><i className="fa-solid fa-cart-shopping"></i></div>
              <h3>Nothing to check out</h3>
              <p>Your cart is empty.</p>
              <Link href="/shop" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>Browse shop</Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Valid email is required.";
    // PayFast requires CUSTOMER_MOBILE_NO. Accept 03XXXXXXXXX (PK) or +countrycode... formats.
    if (!/^(\+?\d{7,15}|03\d{9})$/.test(phone.replace(/\s+/g, ""))) e.phone = "Enter a valid mobile number.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  async function placeOrder(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    if (cart.items.length === 0) return;
    if (!fxReady) {
      setMessage("Loading exchange rate, please retry in a moment…");
      return;
    }

    setStatus("submitting");
    setMessage("Creating order…");
    const basketId = newBasketId();
    setOrderId(basketId);

    // Snapshot — keep history visible after the cart is cleared on return.
    const orderItemsSnapshot = cart.items.map((i) => ({ ...i }));
    const orderSubtotalSnapshot = cart.subtotal;

    // Best-effort: record the pending order. Payment proceeds even on DB outage.
    const attribution = readAttribution();
    const tiers = new Set<string>();
    for (const i of orderItemsSnapshot) {
      const v = i.variation as Record<string, unknown> | undefined;
      const t = v && typeof v.accountType === "string" ? v.accountType : "";
      if (t) tiers.add(t);
    }
    const package_tier = tiers.size === 1 ? [...tiers][0] : tiers.size > 1 ? "mixed" : null;

    authHeaders().then((auth) => fetch(apiUrl("/orders"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({
        items: orderItemsSnapshot.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price, variation: i.variation })),
        customer_email: email,
        customer_phone: phone,
        customer_name: name,
        subtotal_pkr: pkrTotal,
        subtotal_usd: fxReady && usdToPkr > 0 ? Number((pkrTotal / usdToPkr).toFixed(2)) : undefined,
        payment_method: "payfast",
        transaction_id: basketId,
        utm_source: attribution.utm_source ?? null,
        utm_medium: attribution.utm_medium ?? null,
        utm_campaign: attribution.utm_campaign ?? null,
        referrer: attribution.referrer ?? null,
        landing_page: attribution.landing_page ?? null,
        package_tier,
      }),
    }).then((r) => {
      // Backend assigns an order_number — adopt it as the canonical basket id
      // so the SUCCESS_URL/IPN updates hit the correct row.
      if (!r.ok) return null;
      return r.json().catch(() => null);
    }).then((data) => {
      const orderNumber = (data && typeof data.order_number === "string") ? data.order_number : "";
      if (orderNumber) setOrderId(orderNumber);
    }).catch(() => {}));

    // Record local snapshot as pending before handing off to PayFast.
    cart.recordOrder({
      orderId: basketId,
      placedAt: Date.now(),
      items: orderItemsSnapshot,
      subtotalUsd: orderSubtotalSnapshot,
      pkrTotal,
      paymentProvider: "payfast",
      status: "pending",
    });

    // Per-visitor currency on PayFast:
    //   PK visitor  → PKR amount  + CURRENCY_CODE=PKR  (sees "Rs 1,400" on hosted page)
    //   Foreigner   → USD amount  + CURRENCY_CODE=USD  (sees "$5.00" on hosted page)
    // The cart subtotal is canonical PKR; we convert to USD via the live FX rate.
    const txnCurrency: "PKR" | "USD" = isPK ? "PKR" : "USD";
    const usdAmount = fxReady && usdToPkr > 0
      ? cart.subtotal / usdToPkr
      : pkrTotal / 280; // safe fallback FX if rate hasn't loaded
    const txnAmount = isPK ? pkrTotal.toFixed(2) : usdAmount.toFixed(2);

    // For non-PK visitors restrict the PayFast hosted page to Card only —
    // JazzCash / Easypaisa wallets are PK-only, bank direct-debit needs a
    // Pakistani CNIC, and Raast is a PK-only payment rail.
    const restrictTo = isPK ? undefined : "card";
    try {
      const res = await fetch(apiUrl("/payments/init"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basketId,
          amount: txnAmount,
          currency: txnCurrency,
          customerEmail: email,
          customerMobile: phone.replace(/\s+/g, ""),
          customerName: name,
          description: `SubscribAI order ${basketId}`,
          items: orderItemsSnapshot.slice(0, 10).map((i) => ({
            sku: i.id, name: i.name, price: Math.round(i.price), qty: i.qty,
          })),
          ...(restrictTo ? { restrictTo } : {}),
        }),
      });
      const data = await res.json();
      if (!data?.success || !data?.action || !data?.fields) {
        setStatus("failed");
        setMessage(data?.message || "Couldn't start the payment. Please try again.");
        return;
      }
      setStatus("redirecting");
      setMessage("Redirecting you to the secure PayFast checkout…");
      // Mount the hidden form — the effect above will auto-submit it,
      // which navigates the browser to PayFast's hosted page.
      setPendingPost({ action: String(data.action), fields: data.fields as InitFields });
    } catch (err: unknown) {
      setStatus("failed");
      const msg = err instanceof Error ? err.message : "Couldn't reach the payment gateway.";
      setMessage(msg);
    }
  }

  return (
    <section className="v2-section">
      <div className="v2-container">
        <header className="v2-section-head" style={{ textAlign: "left", maxWidth: "none" }}>
          <p className="v2-eyebrow">Checkout</p>
          <h2>Almost there</h2>
        </header>

        <form onSubmit={placeOrder} style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "var(--space-5)", alignItems: "start" }} className="checkout-grid">
          {/* LEFT: contact */}
          <div style={{ display: "grid", gap: "var(--space-5)" }}>
            <div className="surface-card">
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-xl)", color: "var(--text)", marginBottom: "var(--space-4)" }}>Contact</h3>
              <div className="field">
                <label className="field-label">Full name</label>
                <input className={`input ${errors.name ? "is-invalid" : ""}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                {errors.name && <span className="field-error"><i className="fa-solid fa-circle-exclamation"></i> {errors.name}</span>}
              </div>
              <div className="field">
                <label className="field-label">Email</label>
                <input type="email" className={`input ${errors.email ? "is-invalid" : ""}`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                {errors.email && <span className="field-error"><i className="fa-solid fa-circle-exclamation"></i> {errors.email}</span>}
                <span className="field-help">We&apos;ll send your subscription details here.</span>
              </div>
              <div className="field">
                <label className="field-label">Mobile number</label>
                <input className={`input ${errors.phone ? "is-invalid" : ""}`} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={isPK ? "03XXXXXXXXX" : "+1XXXXXXXXXX"} />
                {errors.phone && <span className="field-error"><i className="fa-solid fa-circle-exclamation"></i> {errors.phone}</span>}
                <span className="field-help">Required by PayFast for payment notifications.</span>
              </div>
            </div>

            <div className="surface-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <i className="fa-solid fa-shield-halved" style={{ color: "var(--accent-600)", fontSize: 22 }}></i>
              <div>
                <strong style={{ color: "var(--text)", display: "block" }}>You&apos;ll choose your payment method on PayFast</strong>
                <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
                  {isPK
                    ? "Card, JazzCash, Easypaisa, bank account or Raast — all on PayFast's secure hosted checkout."
                    : "Pay by international debit or credit card on PayFast's secure hosted checkout."}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: order summary + place order */}
          <aside className="surface-card" style={{ position: "sticky", top: 92 }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-xl)", color: "var(--text)", marginBottom: "var(--space-4)" }}>Order summary</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10, marginBottom: "var(--space-4)" }}>
              {cart.items.map((i) => (
                <li key={i.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "var(--text-soft)", fontSize: "var(--fs-sm)" }}>
                  <span>
                    <span style={{ display: "block" }}>{i.name} × {i.qty}</span>
                    {(i.variation as Record<string, unknown> | undefined)?.summary
                      ? <small className="cart-variation-summary">{String((i.variation as Record<string, unknown>).summary)}</small>
                      : null}
                  </span>
                  <span>{fmtMoney(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "baseline", color: "var(--text)", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "var(--fs-lg)" }}>
              <span>Total</span>
              <span style={{ textAlign: "right" }}>
                {currency === "PKR" ? (
                  <>
                    <span>Rs {pkrFormatted}</span>
                    {fxReady && <small style={{ display: "block", color: "var(--text-muted)", fontSize: "var(--fs-xs)", fontWeight: 500, fontFamily: "var(--font-body)", marginTop: 2 }}>≈ ${usdFormatted} USD</small>}
                  </>
                ) : (
                  <span>{fmtMoney(pkrTotal)} {currency}</span>
                )}
              </span>
            </div>
            {fxReady && (
              <p style={{ marginTop: 10, fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }}></i>
                {isPK
                  ? `Charged in PKR via secure PayFast checkout.`
                  : `Charged in USD via secure card payment on PayFast.`}
              </p>
            )}

            {status !== "idle" && (
              <div style={{ marginTop: "var(--space-4)" }}>
                <span className={`status-pill ${status === "failed" ? "is-failed" : "is-pending"}`}>
                  {status === "submitting" ? "Submitting…" : status === "redirecting" ? "Redirecting…" : "Failed"}
                </span>
                {message && <p style={{ color: "var(--text-soft)", fontSize: "var(--fs-sm)", marginTop: "var(--space-3)" }}>{message}</p>}
                {orderId && <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-xs)", marginTop: 4, fontFamily: "ui-monospace, monospace" }}>Order: {orderId}</p>}
              </div>
            )}

            <button
              type="submit"
              className={`btn btn-primary btn-large ${status === "submitting" ? "is-loading" : ""}`}
              style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-5)" }}
              disabled={!fxReady || status === "submitting" || status === "redirecting"}
            >
              {!fxReady ? "Loading..." : `Pay ${fmtMoney(pkrTotal)} with PayFast`} <i className="fa-solid fa-arrow-right"></i>
            </button>

            <ul style={{ listStyle: "none", padding: 0, margin: "var(--space-5) 0 0", color: "var(--text-muted)", fontSize: "var(--fs-xs)", display: "grid", gap: 6 }}>
              <li><i className="fa-solid fa-shield-halved" style={{ color: "var(--accent-600)" }}></i> Encrypted secure payment gateway</li>
              <li><i className="fa-solid fa-lock" style={{ color: "var(--accent-600)" }}></i> Card details never touch our server</li>
            </ul>
          </aside>
        </form>

        {/* Hidden auto-submit form — populated only after /payments/init succeeds.
            React mounts the inputs, then the useEffect calls .submit(), which
            navigates the browser straight to PayFast's hosted checkout page. */}
        {pendingPost && (
          <form ref={autoSubmitRef} action={pendingPost.action} method="POST" style={{ display: "none" }} aria-hidden>
            {Object.entries(pendingPost.fields).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={String(v)} />
            ))}
          </form>
        )}
      </div>

      <style>{`
        @media (max-width: 880px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
