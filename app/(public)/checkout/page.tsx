"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCountries, getCountryCallingCode, isValidPhoneNumber, type CountryCode } from "libphonenumber-js";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { formatPriceFromPKR, formatUSD, useFx } from "@/lib/fx";
import { readAttribution } from "@/components/TrafficCapture";
import { apiUrl, authHeaders } from "@/lib/api-client";
import { redeemCoupon } from "@/lib/coupon-actions";
import { trackBeginCheckout } from "@/lib/analytics";
import { paymentFeatureDescription, paymentFeatureTitle } from "@/lib/payment-messaging";
import type { CartItem } from "@/lib/cart";

type StatusPill = "idle" | "submitting" | "redirecting" | "failed";

/**
 * Every country libphonenumber-js knows about (245), sorted by display name.
 *
 * Dial codes come from the library rather than a hand-written table — the
 * awkward ones (+211 South Sudan, +599 Curaçao, +383 Kosovo, the +1 territories)
 * are exactly where a transcribed list goes wrong. Names come from
 * Intl.DisplayNames, which is built into the runtime.
 *
 * No flag emoji on purpose: Windows renders regional-indicator pairs as bare
 * letters ("PK") rather than a flag, so it would look broken for a large share
 * of visitors.
 */
const COUNTRY_OPTIONS: { iso: CountryCode; name: string; dial: string }[] = (() => {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return getCountries()
    .map((iso) => ({
      iso,
      name: (() => {
        try {
          return names.of(iso) ?? iso;
        } catch {
          return iso;
        }
      })(),
      dial: getCountryCallingCode(iso),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
})();

/** PayFast BASKET_ID must be <= 20 chars, alphanumeric (+ _ -). */
function newBasketId(): string {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `O${stamp}${random}`.toUpperCase().slice(0, 19);
}

type InitFields = Record<string, string>;

async function canonicalizePlanItems(items: CartItem[]): Promise<CartItem[]> {
  const out: CartItem[] = [];
  for (const item of items) {
    const plan = item.variation?.pricingPlan;
    if (!plan?.planId || !plan.billingCycle) {
      out.push(item);
      continue;
    }

    const res = await fetch("/api/pricing-plans/checkout-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.planId, billingCycle: plan.billingCycle }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.item) {
      throw new Error(body?.error || "Could not verify the selected plan price.");
    }
    out.push({
      ...body.item,
      qty: item.qty || 1,
      variation: {
        ...(body.item.variation || {}),
        bundle: item.variation?.bundle,
        summary: item.variation?.summary || body.item.variation?.summary,
      },
    });
  }
  return out;
}

export default function CheckoutPage() {
  const { user, ready: authReady } = useAuth();
  const cart = useCart();
  const { currency, usdToPkr, usdToInr, ready: fxReady, region } = useFx();
  const isPK = region === "PK";

  // begin_checkout — once per visit to this page, after the cart has
  // hydrated from storage (guard prevents a re-fire on every edit).
  const beganCheckout = useRef(false);
  useEffect(() => {
    if (beganCheckout.current || cart.items.length === 0) return;
    beganCheckout.current = true;
    trackBeginCheckout(
      cart.items.map((i) => ({
        item_id: i.id,
        item_name: i.name,
        price: i.price,
        quantity: i.qty || 1,
        item_variant: i.variation?.summary,
      })),
      cart.subtotal,
    );
  }, [cart.items, cart.subtotal]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  /** ISO country for the dial code. `phone` now holds the national part only. */
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>("PK");
  /** Set once the visitor picks a country, so geo detection stops overriding it. */
  const [countryTouched, setCountryTouched] = useState(false);

  const [status, setStatus] = useState<StatusPill>("idle");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const autoSubmitRef = useRef<HTMLFormElement | null>(null);
  const [pendingPost, setPendingPost] = useState<{ action: string; fields: InitFields } | null>(null);

  // Prefill name + email from the authenticated user so the checkout form is
  // pre-populated for logged-in customers while guests can still continue.
  useEffect(() => {
    if (!user) return;
    if (user.email) setEmail(user.email);
    if (user.name) setName(user.name);
  }, [user]);

  // Submit the hidden form to PayFast as soon as it's mounted with fields.
  useEffect(() => {
    if (pendingPost && autoSubmitRef.current) {
      autoSubmitRef.current.submit();
    }
  }, [pendingPost]);

  /**
   * Pre-select the visitor's country once geo resolves, without fighting a
   * manual choice: only applies while the number field is still empty.
   *
   * Must stay above the empty-cart early return below — a hook after a
   * conditional return breaks the Rules of Hooks and React throws
   * "rendered fewer hooks than expected" the moment the cart fills.
   */
  useEffect(() => {
    // Gate on an explicit "touched" flag, not on the number being empty: most
    // people pick the country first, and keying off `phone` would snap their
    // choice back to the geo default before they had typed anything.
    if (countryTouched) return;
    if (region === "PK") setPhoneCountry("PK");
    else if (region === "IN") setPhoneCountry("IN");
    else setPhoneCountry("US");
  }, [region, countryTouched]);

  const selectedCountry = COUNTRY_OPTIONS.find((c) => c.iso === phoneCountry);

  /**
   * E.164 for the gateway and the order record — always `+<dial><national>`.
   * PayFast passes CUSTOMER_MOBILE_NO straight through with only a presence
   * check, so normalising here is what keeps stored numbers dialable.
   */
  const phoneE164 = useMemo(() => {
    const national = phone.replace(/\D/g, "").replace(/^0+/, "");
    if (!national || !selectedCountry) return "";
    return `+${selectedCountry.dial}${national}`;
  }, [phone, selectedCountry]);

  // Coupon-aware totals — cart.total = subtotal - discount (PKR canonical).
  const pkrTotal = Math.round(cart.total);
  const pkrFormatted = pkrTotal.toLocaleString("en-PK");
  const usdTotal = fxReady && usdToPkr > 0 ? cart.total / usdToPkr : 0;
  const usdFormatted = usdTotal.toFixed(2);
  const fmtMoney = (pkr: number) => formatPriceFromPKR(pkr, currency, usdToPkr, fxReady, usdToInr);

  /* Non-Asian buyers are charged the admin's fixed USD prices, so the summary
     has to quote those exact figures — converting the rupee total here would
     show one number and charge another. */
  const fxRate = fxReady && usdToPkr > 0 ? usdToPkr : 280;
  const useIntlPricing = region === "OTHER";
  const lineUsd = (i: CartItem) => (i.priceUsd != null ? i.priceUsd : i.price / fxRate) * (i.qty || 1);
  const intlSubtotal = cart.items.reduce((sum, i) => sum + lineUsd(i), 0);
  const intlDiscount = cart.discount > 0 ? cart.discount / fxRate : 0;
  const intlTotal = Math.max(0, intlSubtotal - intlDiscount);
  /** Line/total money in the summary, honouring fixed international prices. */
  const fmtLine = (i: CartItem) => (useIntlPricing ? formatUSD(lineUsd(i)) : fmtMoney(i.price * (i.qty || 1)));
  const fmtDiscount = () => (useIntlPricing ? formatUSD(intlDiscount) : fmtMoney(cart.discount));
  const fmtTotal = () => (useIntlPricing ? formatUSD(intlTotal) : fmtMoney(pkrTotal));

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
    // Validate against the chosen country's numbering plan, so a wrong-length
    // number is caught here rather than becoming an undeliverable order.
    if (!phone.trim()) e.phone = "Mobile number is required.";
    else if (!isValidPhoneNumber(phoneE164 || phone, phoneCountry)) {
      e.phone = `That doesn't look like a valid ${selectedCountry?.name ?? "mobile"} number.`;
    }
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
    // Temporary local id — replaced with the server-issued order_number once
    // POST /orders returns. PayFast's BASKET_ID must be the SAME id we use to
    // look the order up in the IPN/return path, so we always prefer the
    // server-issued value.
    let basketId = newBasketId();
    setOrderId(basketId);

    // Snapshot — keep history visible after the cart is cleared on return.
    let orderItemsSnapshot = cart.items.map((i) => ({ ...i }));
    try {
      orderItemsSnapshot = await canonicalizePlanItems(orderItemsSnapshot);
    } catch (err) {
      setStatus("failed");
      setMessage(err instanceof Error ? err.message : "Could not verify the selected plan price.");
      return;
    }
    // Applied promo code → negative-price line item, so the recorded order,
    // the charged amount, and the admin order view all agree on the discount.
    if (cart.coupon && cart.discount > 0) {
      const preDiscount = orderItemsSnapshot.reduce((sum, item) => sum + Number(item.price) * Number(item.qty || 1), 0);
      const discountAmount = Math.min(
        Math.round(preDiscount),
        Math.round(cart.coupon.discountType === "percent" ? (preDiscount * cart.coupon.value) / 100 : cart.coupon.value),
      );
      if (discountAmount > 0) {
        orderItemsSnapshot.push({
          id: `promo-${cart.coupon.code.toLowerCase()}`,
          name: `Promo code ${cart.coupon.code}`,
          price: -discountAmount,
          qty: 1,
        });
      }
    }
    const orderSubtotalSnapshot = orderItemsSnapshot.reduce((sum, item) => sum + Number(item.price) * Number(item.qty || 1), 0);
    const checkoutPkrTotal = Math.round(orderSubtotalSnapshot);

    // Best-effort: record the pending order. Payment proceeds even on DB outage.
    const attribution = readAttribution();
    const tiers = new Set<string>();
    for (const i of orderItemsSnapshot) {
      const v = i.variation as Record<string, unknown> | undefined;
      const t = v && typeof v.accountType === "string" ? v.accountType : "";
      if (t) tiers.add(t);
    }
    const package_tier = tiers.size === 1 ? [...tiers][0] : tiers.size > 1 ? "mixed" : null;

    const orderPayload = {
      items: orderItemsSnapshot.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price, variation: i.variation })),
      customer_email: email,
      customer_phone: phoneE164,
      customer_name: name,
      subtotal_pkr: checkoutPkrTotal,
      subtotal_usd: fxReady && usdToPkr > 0 ? Number((checkoutPkrTotal / usdToPkr).toFixed(2)) : undefined,
      payment_method: "payfast",
      transaction_id: basketId,
      utm_source: attribution.utm_source ?? null,
      utm_medium: attribution.utm_medium ?? null,
      utm_campaign: attribution.utm_campaign ?? null,
      referrer: attribution.referrer ?? null,
      landing_page: attribution.landing_page ?? null,
      package_tier,
    };
    const orderApiUrl = apiUrl("/orders");
    console.log("Creating order via API:", orderApiUrl);
    console.log("Order payload:", orderPayload);

    try {
      const auth = await authHeaders();
      const orderRes = await fetch(orderApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify(orderPayload),
      });
      if (!orderRes.ok) {
        const errorText = await orderRes.text().catch(() => "");
        throw new Error(errorText || `Order creation failed (${orderRes.status})`);
      }
      const data = await orderRes.json().catch(() => null);
      const orderNumber = (data && typeof data.order_number === "string") ? data.order_number : "";
      if (orderNumber) {
        // From here on, use the server-issued order_number as the PayFast
        // BASKET_ID. PayFast echoes it back in the return / IPN payload, and
        // the backend's syncOrder() looks up orders by order_number — so this
        // keeps the round-trip identifiers aligned.
        basketId = orderNumber;
        setOrderId(orderNumber);
      }
    } catch (err) {
      console.warn("Order creation request failed before payment init.", err);
      setStatus("failed");
      setMessage(err instanceof Error ? err.message : "Could not create the order. Please try again.");
      return;
    }

    // Count the promo redemption (best-effort — never blocks payment).
    if (cart.coupon && cart.discount > 0) {
      redeemCoupon(cart.coupon.code).catch(() => {});
    }

    // Record local snapshot as pending before handing off to PayFast.
    cart.recordOrder({
      orderId: basketId,
      placedAt: Date.now(),
      items: orderItemsSnapshot,
      subtotalUsd: orderSubtotalSnapshot,
      pkrTotal: checkoutPkrTotal,
      paymentProvider: "payfast",
      status: "pending",
    });

    // Per-visitor currency on PayFast:
    //   PK visitor  → PKR amount  + CURRENCY_CODE=PKR  (sees "Rs 1,400" on hosted page)
    //   Foreigner   → USD amount  + CURRENCY_CODE=USD  (sees "$5.00" on hosted page)
    // The cart subtotal is canonical PKR; we convert to USD via the live FX rate.
    const txnCurrency: "PKR" | "USD" = isPK ? "PKR" : "USD";
    /* Non-Asian buyers pay the admin's fixed USD price where one is set, so
       the gateway charges exactly what the product page quoted. Lines without
       an international price still convert from PKR at the live rate. */
    const fxRate = fxReady && usdToPkr > 0 ? usdToPkr : 280;
    const useIntlPricing = region === "OTHER";
    const convertedUsd = checkoutPkrTotal / fxRate;
    const intlUsd = orderItemsSnapshot.reduce((sum, i) => {
      // Coerce everything: a NaN here produced an empty TXNAMT and PayFast
      // rejected the request, so non-Asian checkouts never redirected.
      const qty = Number(i.qty) > 0 ? Number(i.qty) : 1;
      const unit = Number(i.priceUsd) > 0 ? Number(i.priceUsd) : Number(i.price) / fxRate;
      return sum + (Number.isFinite(unit) ? unit * qty : 0);
    }, 0);
    const usdAmount = useIntlPricing && Number.isFinite(intlUsd) && intlUsd > 0
      ? intlUsd
      : convertedUsd;
    const txnAmount = isPK ? checkoutPkrTotal.toFixed(2) : usdAmount.toFixed(2);

    // Never hand PayFast a zero/NaN amount — it fails with a generic error.
    if (!Number.isFinite(Number(txnAmount)) || Number(txnAmount) <= 0) {
      setStatus("failed");
      setMessage("Could not work out the payment amount. Please refresh and try again.");
      return;
    }

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
          customerMobile: phoneE164,
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
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-soft)", color: "var(--text-soft)", fontSize: "var(--fs-sm)", marginBottom: "var(--space-4)" }}>
                <i className={`fa-solid ${authReady && user ? "fa-circle-check" : "fa-user-check"}`} style={{ color: "var(--accent-600)", marginTop: 2 }}></i>
                <div>
                  <strong style={{ display: "block", color: "var(--text)", marginBottom: 2 }}>
                    {authReady && user ? "Checking out with your account" : "Guest checkout available"}
                  </strong>
                  {authReady && user ? (
                    <span>Your order will stay linked to this account and the contact details below.</span>
                  ) : (
                    <span>
                      No account needed. Want saved order history?{" "}
                      <Link href={`/login?mode=signup&next=${encodeURIComponent("/checkout")}`}>Create an account</Link>
                      {" "}or{" "}
                      <Link href={`/login?next=${encodeURIComponent("/checkout")}`}>sign in</Link>.
                    </span>
                  )}
                </div>
              </div>
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
                <label className="field-label" htmlFor="checkout-phone">Mobile number</label>
                <div className="checkout-phone-row">
                  {/* Native select rather than the custom Select component: 245
                      options with no search box is painful, and native selects
                      give free type-ahead ("pak" jumps to Pakistan). */}
                  <select
                    className="input checkout-phone-country"
                    aria-label="Country dialling code"
                    value={phoneCountry}
                    onChange={(e) => {
                      setPhoneCountry(e.target.value as CountryCode);
                      setCountryTouched(true);
                    }}
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.iso} value={c.iso}>
                        {c.name} (+{c.dial})
                      </option>
                    ))}
                  </select>
                  <input
                    id="checkout-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    className={`input ${errors.phone ? "is-invalid" : ""}`}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={phoneCountry === "PK" ? "3001234567" : "Mobile number"}
                  />
                </div>
                {errors.phone && <span className="field-error"><i className="fa-solid fa-circle-exclamation"></i> {errors.phone}</span>}
                <span className="field-help">
                  {phoneE164
                    ? `Will be sent as ${phoneE164}`
                    : `Enter the number without the leading 0 or +${selectedCountry?.dial ?? ""}. Required by PayFast for payment notifications.`}
                </span>
              </div>
            </div>

            <div className="surface-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <i className="fa-solid fa-shield-halved" style={{ color: "var(--accent-600)", fontSize: 22 }}></i>
              <div>
                <strong style={{ color: "var(--text)", display: "block" }}>{paymentFeatureTitle}</strong>
                <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
                  {paymentFeatureDescription}
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
                  <span>{fmtLine(i)}</span>
                </li>
              ))}
            </ul>
            {cart.coupon && cart.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10, color: "var(--success-500)", fontSize: "var(--fs-sm)" }}>
                <span>
                  <i className="fa-solid fa-ticket" style={{ marginRight: 6 }}></i>
                  Promo {cart.coupon.code}
                  <button
                    type="button"
                    onClick={() => cart.removeCoupon()}
                    aria-label="Remove promo code"
                    style={{ marginLeft: 8, background: "none", border: 0, color: "var(--text-muted)", cursor: "pointer", fontSize: "var(--fs-xs)" }}
                  >
                    remove
                  </button>
                </span>
                <span>−{fmtDiscount()}</span>
              </div>
            )}
            <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "baseline", color: "var(--text)", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "var(--fs-lg)" }}>
              <span>Total</span>
              <span style={{ textAlign: "right" }}>
                {currency === "PKR" ? (
                  <>
                    <span>Rs {pkrFormatted}</span>
                    {fxReady && <small style={{ display: "block", color: "var(--text-muted)", fontSize: "var(--fs-xs)", fontWeight: 500, fontFamily: "var(--font-body)", marginTop: 2 }}>≈ ${usdFormatted} USD</small>}
                  </>
                ) : (
                  <span>{fmtTotal()} {currency}</span>
                )}
              </span>
            </div>
            {fxReady && (
              <p style={{ marginTop: 10, fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }}></i>
                Charged securely via PayFast checkout.
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
              {!fxReady ? "Loading..." : `Pay ${fmtTotal()} with PayFast`} <i className="fa-solid fa-arrow-right"></i>
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
