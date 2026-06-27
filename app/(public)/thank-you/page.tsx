import type { Metadata } from "next";
import Link from "next/link";
import ClearCartOnSuccess from "@/components/ClearCartOnSuccess";
import OrderStatusPoller from "@/components/OrderStatusPoller";

export const metadata: Metadata = {
  title: "Thank You — Order Received",
  description: "Your SubscribAI order is confirmed. We'll deliver your subscription details to your email shortly.",
  robots: { index: false, follow: false },
};

type Search = { orderId?: string; status?: string; code?: string; hashOk?: string };

/** PayFast error-code → human-readable message (mirrors api/src/payments/payfast.ts) */
const ERR_DESC: Record<string, string> = {
  "000": "Payment successful",
  "00": "Payment successful",
  "002": "Payment timed out at the gateway. Please try again.",
  "97": "Insufficient balance — please top up and try again.",
  "106": "Transaction limit exceeded — contact your bank.",
  "03": "Account is inactive — please use a different account.",
  "104": "Entered details are incorrect.",
  "55": "Invalid OTP/PIN.",
  "54": "Card has expired.",
  "13": "Invalid amount.",
  "126": "Account details are invalid.",
  "75": "Maximum PIN retries exceeded.",
  "14": "Inactive card number.",
  "15": "Inactive card number.",
  "42": "Invalid CNIC.",
  "423": "We could not process your request right now. Please try again later.",
  "41": "Entered details did not match.",
  "600": "OTP already expired.",
  "309": "Invalid OTP length.",
  "853": "Account details are invalid.",
  "04": "Account is closed.",
  "537": "Account is dormant.",
  "359": "Account is blocked.",
  "880": "Local ecommerce session not activated — please call your bank.",
  "881": "Insufficient funds — please call your bank.",
  "882": "Daily ecommerce transaction limit consumed.",
  "883": "Local e-payment service not activated — please call your bank.",
};

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = (await searchParams) || {};
  const status = (sp.status || "").toLowerCase();
  const orderId = (sp.orderId || "").trim();
  const errCode = (sp.code || "").trim();
  const hashOk = sp.hashOk !== "0"; // /payments/return sets this to "0" only on mismatch

  const isPaid = status === "paid" && hashOk;
  const isFailed = status === "failed" && hashOk;
  const isPending = !isPaid && !isFailed; // hash mismatch OR no status → treat as pending and let the poller resolve it

  const heroBadge = isPaid ? (
    <span className="badge badge-success" style={{ marginBottom: "var(--space-4)" }}>
      <i className="fa-solid fa-circle-check"></i> Payment received
    </span>
  ) : isFailed ? (
    <span className="badge" style={{ background: "var(--danger-soft, #fee)", color: "var(--danger-500, #c1121f)", marginBottom: "var(--space-4)" }}>
      <i className="fa-solid fa-circle-xmark"></i> Payment didn&apos;t go through
    </span>
  ) : (
    <span className="badge" style={{ background: "var(--warning-soft, #fff5e0)", color: "var(--warning-500, #b87800)", marginBottom: "var(--space-4)" }}>
      <i className="fa-solid fa-clock"></i> Payment pending
    </span>
  );

  const heading = isPaid
    ? "Thanks — your order is in!"
    : isFailed
      ? "We couldn't complete your payment"
      : "Confirming your payment…";

  const lede = isPaid
    ? "We've got your payment. Your subscription details will land in your email within 30 minutes — usually faster."
    : isFailed
      ? (ERR_DESC[errCode] || "PayFast couldn't complete this transaction. Your card or wallet was not charged.")
      : "PayFast is still confirming your payment with the bank. This usually clears within a couple of minutes — feel free to refresh.";

  return (
    <section className="v2-section">
      {/* Empty the cart + mark the local order paid on a successful return. */}
      <ClearCartOnSuccess status={isPaid ? "paid" : ""} orderId={orderId} />
      {/* When the redirect arrives in a pending state (wallet flows often do
          this), background-poll /payments/status until the IPN flips it to
          paid/failed, then refresh the page. */}
      {isPending && orderId && <OrderStatusPoller orderId={orderId} />}
      <div className="v2-container" style={{ maxWidth: 720, textAlign: "center" }}>
        {heroBadge}

        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "var(--space-3)" }}>
          {heading}
        </h1>

        <p style={{ color: "var(--text-soft)", fontSize: "var(--fs-lg)", marginBottom: "var(--space-6)" }}>
          {lede}
        </p>

        {orderId && (
          <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)", marginBottom: "var(--space-5)", fontFamily: "ui-monospace, monospace" }}>
            Order reference: <strong style={{ color: "var(--text)" }}>{orderId}</strong>
            {errCode && <> · Code: <strong>{errCode}</strong></>}
          </p>
        )}

        {!hashOk && (
          <p style={{ color: "var(--warning-500, #b87800)", fontSize: "var(--fs-sm)", marginBottom: "var(--space-4)" }}>
            <i className="fa-solid fa-triangle-exclamation"></i> We could not verify the payment signature from PayFast. Please contact support before retrying.
          </p>
        )}

        {isPaid && (
          <div className="surface-card" style={{ textAlign: "left", marginBottom: "var(--space-5)" }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-xl)", color: "var(--text)", marginBottom: "var(--space-4)" }}>
              What happens next
            </h2>
            <ol style={{ listStyle: "none", padding: 0, display: "grid", gap: "var(--space-4)" }}>
              {[
                { n: 1, t: "We verify your payment", d: "PayFast confirms the transaction. You'll get a confirmation email within minutes." },
                { n: 2, t: "We provision your subscription", d: "For subscription plans we activate or share login details. For digital downloads, the file/link is in your inbox." },
                { n: 3, t: "Anything wrong? Reach us", d: "WhatsApp is the fastest. Replacements within 24 hours if a subscription doesn't work." },
              ].map((s) => (
                <li key={s.n} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "var(--space-3)", alignItems: "start" }}>
                  <span className="v2-step-num" style={{ width: 40, height: 40, fontSize: 16 }}>{s.n}</span>
                  <div>
                    <strong style={{ color: "var(--text)", fontFamily: "var(--font-heading)", display: "block", marginBottom: 4 }}>{s.t}</strong>
                    <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>{s.d}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center", flexWrap: "wrap" }}>
          {isFailed ? (
            <>
              <Link className="btn btn-primary btn-large" href="/checkout">Try again</Link>
              <a className="btn btn-outline btn-large" href="https://wa.me/15550132026">
                <i className="fa-brands fa-whatsapp"></i> Get help
              </a>
            </>
          ) : (
            <>
              <Link className="btn btn-primary btn-large" href="/account">View my orders</Link>
              <a className="btn btn-outline btn-large" href="https://wa.me/15550132026">
                <i className="fa-brands fa-whatsapp"></i> WhatsApp support
              </a>
            </>
          )}
        </div>

        <p style={{ marginTop: "var(--space-5)", color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
          Need help? <Link href="/contact" style={{ color: "var(--brand-300)" }}>Contact us</Link> · <Link href="/refund" style={{ color: "var(--brand-300)" }}>Refund policy</Link>
        </p>
      </div>
    </section>
  );
}
