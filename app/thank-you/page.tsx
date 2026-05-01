import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Thank You — Order Received",
  description: "Your SubscribAI order is confirmed. We'll deliver your subscription details to your email shortly.",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <section className="v2-section">
      <div className="v2-container" style={{ maxWidth: 720, textAlign: "center" }}>
        <span className="badge badge-success" style={{ marginBottom: "var(--space-4)" }}>
          <i className="fa-solid fa-circle-check"></i> Payment received
        </span>

        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "var(--space-3)" }}>
          Thanks — your order is in!
        </h1>

        <p style={{ color: "var(--text-soft)", fontSize: "var(--fs-lg)", marginBottom: "var(--space-6)" }}>
          We've got your payment. Your subscription details will land in your email within 30 minutes — usually faster.
        </p>

        <div className="surface-card" style={{ textAlign: "left", marginBottom: "var(--space-5)" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-xl)", color: "var(--text)", marginBottom: "var(--space-4)" }}>
            What happens next
          </h2>
          <ol style={{ listStyle: "none", padding: 0, display: "grid", gap: "var(--space-4)" }}>
            {[
              { n: 1, t: "We verify your payment", d: "SahulatPay confirms the transaction on our end. You'll get a confirmation email within minutes." },
              { n: 2, t: "We provision your subscription", d: "For wallet/card subscriptions, we activate or share login details. For digital downloads, the file/link is in your inbox." },
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

        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn btn-primary btn-large" href="/account">View my orders</Link>
          <a className="btn btn-outline btn-large" href="https://wa.me/15550132026">
            <i className="fa-brands fa-whatsapp"></i> WhatsApp support
          </a>
        </div>

        <p style={{ marginTop: "var(--space-5)", color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
          Need help? <Link href="/contact" style={{ color: "var(--brand-300)" }}>Contact us</Link> · <Link href="/refund" style={{ color: "var(--brand-300)" }}>Refund policy</Link>
        </p>
      </div>
    </section>
  );
}
