"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { useFx } from "@/lib/fx";

type Provider = "jazzcash" | "easypaisa" | "card";
type StatusPill = "idle" | "submitting" | "pending" | "paid" | "failed";

function newOrderId(): string {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `O${stamp}${random}`.toUpperCase().slice(0, 19);
}

/**
 * Translates SahulatPay's raw gateway error text into plain-English guidance.
 * The gateway returns terse codes like "Insufficient Balance" or
 * "Transaction Cancelled by User" — we turn those into actionable messages.
 */
function humanizeFailureReason(raw: unknown, providerLabel = "wallet"): string {
  const r = String(raw || "").toLowerCase();
  if (!r || r === "payment status retrieved.") {
    return "The payment didn't go through. Please try again, or contact support if it keeps failing.";
  }
  if (/insufficient.*bal|low.*bal|not.*enough.*bal|insufficient.*fund/.test(r)) {
    return `Your ${providerLabel} doesn't have enough balance for this payment. Top it up and try again.`;
  }
  if (/cancel/.test(r)) {
    return `You cancelled the payment in your ${providerLabel} app. Click Pay again whenever you're ready to retry.`;
  }
  if (/time\s*out|timed\s*out|expired|request.*expired/.test(r)) {
    return `The payment request timed out before approval. Please try again and approve quickly in your ${providerLabel} app.`;
  }
  if (/invalid\s*(number|msisdn|phone)|not.*regist/.test(r)) {
    return `This phone number isn't registered with ${providerLabel}. Double-check the number or try a different one.`;
  }
  if (/blocked|fraud/.test(r)) {
    return `This number has been blocked by the wallet provider. Try a different number, or contact support.`;
  }
  if (/declined|reject/.test(r)) {
    return `The bank or wallet declined this payment. Try again, use a different method, or contact your bank.`;
  }
  if (/merchant\s*not\s*found|invalid\s*merchant/.test(r)) {
    return `Payment gateway is misconfigured on our side. Please contact support — we'll fix it ASAP.`;
  }
  if (/network|connect/.test(r)) {
    return `Couldn't reach the payment gateway. Check your internet connection and try again.`;
  }
  // Capitalize first letter as a fallback so the raw reason at least reads like a sentence
  const reason = String(raw).trim();
  return reason ? reason.charAt(0).toUpperCase() + reason.slice(1) : "Payment failed. Please try again.";
}

function extractFailureReason(data: any): string {
  return (
    data?.gatewayResponse?.data?.responseDesc ||
    data?.gatewayResponse?.data?.transactionStatus ||
    data?.gatewayResponse?.message?.message ||
    data?.gatewayResponse?.message ||
    data?.gatewayMessage ||
    data?.message ||
    ""
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const { usdToPkr, ready: fxReady } = useFx();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState<Provider>("jazzcash");
  const [status, setStatus] = useState<StatusPill>("idle");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const pollRef = useRef<number | null>(null);

  // SahulatPay's gateway charges in PKR. Convert USD subtotal → PKR using the
  // live FX rate at checkout time, lock it in, and that's what we send.
  const pkrTotal = Math.round(cart.subtotal * usdToPkr);
  const pkrFormatted = pkrTotal.toLocaleString("en-PK");

  useEffect(() => {
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, []);

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
    if (provider !== "card" && !/^03\d{9}$/.test(phone)) e.phone = "Wallet phone must be 03XXXXXXXXX.";
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
    setMessage("Creating payment with SahulatPay…");
    const id = newOrderId();
    setOrderId(id);

    // Snapshot the cart contents — once we record the order we still want
    // to show the items in account history even after the cart is cleared.
    const orderItemsSnapshot = cart.items.map((i) => ({ ...i }));
    const orderSubtotalSnapshot = cart.subtotal;

    // Best-effort: record the order to Supabase (non-blocking — payment proceeds
    // even if the DB write fails, so a Supabase outage can't break checkout).
    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: orderItemsSnapshot.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        customer_email: email,
        customer_phone: phone,
        subtotal_pkr: pkrTotal,
        payment_method: provider,
        transaction_id: id,
      }),
    }).catch(() => {});

    try {
      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          amount: String(pkrTotal),
          phone,
          email,
          orderId: id,
          storeName: "SubscribAI",
        }),
      });
      const data = await res.json();
      setTransactionId(data.transactionId || id);
      setRedirectUrl(data.redirectUrl || null);

      if (data.success && data.paymentStatus === "pending") {
        setStatus("pending");
        setMessage(data.message || `Open your ${provider === "easypaisa" ? "Easypaisa" : "JazzCash"} app and approve the payment.`);
        // Record as pending so the user sees it in /account immediately
        cart.recordOrder({
          orderId: id, placedAt: Date.now(),
          items: orderItemsSnapshot,
          subtotalUsd: orderSubtotalSnapshot,
          pkrTotal,
          paymentProvider: provider,
          status: "pending",
        });
        startPolling(id, provider);
      } else if (data.success && data.paymentStatus === "paid") {
        setStatus("paid");
        setMessage("Payment confirmed.");
        cart.recordOrder({
          orderId: id, placedAt: Date.now(),
          items: orderItemsSnapshot,
          subtotalUsd: orderSubtotalSnapshot,
          pkrTotal,
          paymentProvider: provider,
          status: "paid",
        });
        cart.clear();
      } else {
        setStatus("failed");
        const providerLabel = provider === "easypaisa" ? "Easypaisa" : provider === "jazzcash" ? "JazzCash" : "card";
        setMessage(humanizeFailureReason(extractFailureReason(data), providerLabel));
        cart.recordOrder({
          orderId: id, placedAt: Date.now(),
          items: orderItemsSnapshot,
          subtotalUsd: orderSubtotalSnapshot,
          pkrTotal,
          paymentProvider: provider,
          status: "failed",
        });
      }
    } catch (err: any) {
      setStatus("failed");
      setMessage(err?.message ? humanizeFailureReason(err.message) : "Couldn't reach the payment gateway. Check your internet and try again.");
    }
  }

  function startPolling(id: string, prov: Provider) {
    if (pollRef.current) window.clearInterval(pollRef.current);
    let attempts = 0;
    const MAX = 40; // ~4 minutes at 6s intervals
    pollRef.current = window.setInterval(async () => {
      attempts += 1;
      try {
        const r = await fetch(`/api/payment-status?orderId=${encodeURIComponent(id)}&transactionId=${encodeURIComponent(id)}&provider=${prov}`);
        const data = await r.json();
        if (data.paymentStatus === "paid") {
          window.clearInterval(pollRef.current!); pollRef.current = null;
          setStatus("paid");
          setMessage("Payment confirmed. We'll email your access details shortly.");
          cart.updateOrderStatus(id, "paid");
          cart.clear();
          window.setTimeout(() => router.push("/thank-you"), 1500);
        } else if (data.paymentStatus === "failed") {
          window.clearInterval(pollRef.current!); pollRef.current = null;
          setStatus("failed");
          const providerLabel = prov === "easypaisa" ? "Easypaisa" : "JazzCash";
          setMessage(humanizeFailureReason(extractFailureReason(data), providerLabel));
          cart.updateOrderStatus(id, "failed");
        }
      } catch {}
      if (attempts >= MAX && pollRef.current) {
        window.clearInterval(pollRef.current); pollRef.current = null;
        setStatus("failed");
        setMessage(`We didn't get a confirmation from ${prov === "easypaisa" ? "Easypaisa" : "JazzCash"} in time. If you approved the payment, click "Check status now" to retry.`);
      }
    }, 6000);
  }

  async function checkStatusNow() {
    if (!orderId) return;
    setMessage("Checking with SahulatPay…");
    try {
      const r = await fetch(`/api/payment-status?orderId=${encodeURIComponent(orderId)}&transactionId=${encodeURIComponent(transactionId || orderId)}&provider=${provider}`);
      const data = await r.json();
      const providerLabel = provider === "easypaisa" ? "Easypaisa" : provider === "jazzcash" ? "JazzCash" : "card";
      if (data.paymentStatus === "paid") {
        setStatus("paid");
        setMessage("Payment confirmed.");
        cart.clear();
      } else if (data.paymentStatus === "failed") {
        setStatus("failed");
        setMessage(humanizeFailureReason(extractFailureReason(data), providerLabel));
      } else {
        setMessage(`Still pending. Open your ${providerLabel} app and approve the payment request.`);
      }
    } catch (e: any) {
      setMessage("Couldn't reach the gateway. Check your connection and try again.");
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
          {/* LEFT: contact + payment */}
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
                <span className="field-help">We'll send your subscription details here.</span>
              </div>
            </div>

            <div className="surface-card">
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-xl)", color: "var(--text)", marginBottom: "var(--space-4)" }}>Payment method</h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)" }}>
                {([
                  ["jazzcash", "JazzCash Wallet", "fa-mobile-screen"],
                  ["easypaisa", "Easypaisa Wallet", "fa-mobile-screen"],
                  ["card", "Card", "fa-credit-card"],
                ] as const).map(([id, label, icon]) => (
                  <label key={id} style={{
                    display: "block", cursor: "pointer", padding: "var(--space-4)",
                    border: "1px solid " + (provider === id ? "var(--brand-500)" : "var(--border)"),
                    borderRadius: "var(--radius-md)",
                    background: provider === id ? "var(--brand-soft)" : "transparent",
                    textAlign: "center",
                    transition: "all var(--dur)",
                  }}>
                    <input type="radio" name="provider" value={id} checked={provider === id} onChange={() => setProvider(id)} style={{ display: "none" }} />
                    <i className={`fa-solid ${icon}`} style={{ fontSize: 24, color: provider === id ? "var(--brand-600)" : "var(--text-muted)", marginBottom: 8, display: "block" }}></i>
                    <strong style={{ color: "var(--text)", fontSize: "var(--fs-sm)" }}>{label}</strong>
                  </label>
                ))}
              </div>

              {provider !== "card" && (
                <div className="field" style={{ marginTop: "var(--space-4)" }}>
                  <label className="field-label">Wallet phone</label>
                  <input className={`input ${errors.phone ? "is-invalid" : ""}`} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03XXXXXXXXX" />
                  {errors.phone && <span className="field-error"><i className="fa-solid fa-circle-exclamation"></i> {errors.phone}</span>}
                  <span className="field-help">We'll push the payment request to this {provider === "jazzcash" ? "JazzCash" : "Easypaisa"} wallet.</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: order summary + place order */}
          <aside className="surface-card" style={{ position: "sticky", top: 92 }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-xl)", color: "var(--text)", marginBottom: "var(--space-4)" }}>Order summary</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10, marginBottom: "var(--space-4)" }}>
              {cart.items.map((i) => (
                <li key={i.id} style={{ display: "flex", justifyContent: "space-between", color: "var(--text-soft)", fontSize: "var(--fs-sm)" }}>
                  <span>{i.name} × {i.qty}</span>
                  <span>${(i.price * i.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "baseline", color: "var(--text)", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "var(--fs-lg)" }}>
              <span>Total</span>
              <span style={{ textAlign: "right" }}>
                <span>Rs {pkrFormatted}</span>
                <small style={{ display: "block", color: "var(--text-muted)", fontSize: "var(--fs-xs)", fontWeight: 500, fontFamily: "var(--font-body)", marginTop: 2 }}>≈ ${cart.subtotal.toFixed(2)} USD</small>
              </span>
            </div>
            {fxReady && (
              <p style={{ marginTop: 10, fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }}></i>
                Charged in PKR at today&rsquo;s rate (1 USD ≈ Rs {Math.round(usdToPkr).toLocaleString("en-PK")}).
              </p>
            )}

            {status !== "idle" && (
              <div style={{ marginTop: "var(--space-4)" }}>
                <span className={`status-pill ${status === "paid" ? "is-paid" : status === "failed" ? "is-failed" : "is-pending"}`}>
                  {status === "submitting" ? "Submitting…" : status === "paid" ? "Paid" : status === "failed" ? "Failed" : "Pending — approve in app"}
                </span>
                {message && <p style={{ color: "var(--text-soft)", fontSize: "var(--fs-sm)", marginTop: "var(--space-3)" }}>{message}</p>}
                {orderId && <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-xs)", marginTop: 4, fontFamily: "ui-monospace, monospace" }}>Order: {orderId}</p>}
              </div>
            )}

            <button
              type="submit"
              className={`btn btn-primary btn-large ${status === "submitting" ? "is-loading" : ""}`}
              style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-5)" }}
              disabled={!fxReady || status === "submitting" || status === "pending" || status === "paid"}
            >
              {fxReady ? `Pay Rs ${pkrFormatted}` : "Loading rate…"} <i className="fa-solid fa-arrow-right"></i>
            </button>

            {status === "pending" && (
              <button type="button" onClick={checkStatusNow} className="btn btn-outline" style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-3)" }}>
                Check status now
              </button>
            )}

            {status === "pending" && redirectUrl && (
              <a href={redirectUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-3)" }}>
                Open secure payment page
              </a>
            )}

            <ul style={{ listStyle: "none", padding: 0, margin: "var(--space-5) 0 0", color: "var(--text-muted)", fontSize: "var(--fs-xs)", display: "grid", gap: 6 }}>
              <li><i className="fa-solid fa-shield-halved" style={{ color: "var(--accent-600)" }}></i> Encrypted SahulatPay gateway</li>
              <li><i className="fa-solid fa-lock" style={{ color: "var(--accent-600)" }}></i> Card details never touch our server</li>
            </ul>
          </aside>
        </form>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
