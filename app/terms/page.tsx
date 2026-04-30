export const metadata = {
  title: "Terms & Conditions",
  description: "SubscribAI terms of service for AI subscriptions, payments, and disputes.",
  alternates: { canonical: "/terms" },
};
export default function TermsPage() {
  return (
    <section className="v2-section">
      <div className="v2-container" style={{ maxWidth: 760 }}>
        <p className="v2-eyebrow">Legal</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-3xl)", color: "var(--text)", letterSpacing: "-0.02em", marginBottom: "var(--space-4)" }}>Terms &amp; conditions</h1>
        <p style={{ color: "var(--text-soft)" }}>By using SubscribAI you agree that subscriptions are sold &ldquo;as-is&rdquo; from authorized resale channels, that payment is final once a transaction is confirmed by SahulatPay, and that any disputes are resolved per Pakistani law.</p>
      </div>
    </section>
  );
}
