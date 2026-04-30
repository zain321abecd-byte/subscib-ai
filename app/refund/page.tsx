export const metadata = {
  title: "Refund Policy",
  description: "Replacement guarantees on every AI subscription. Digital downloads are non-refundable once delivered.",
  alternates: { canonical: "/refund" },
};
export default function RefundPage() {
  return (
    <section className="v2-section">
      <div className="v2-container" style={{ maxWidth: 760 }}>
        <p className="v2-eyebrow">Policy</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-3xl)", color: "var(--text)", letterSpacing: "-0.02em", marginBottom: "var(--space-4)" }}>Refund policy</h1>
        <p style={{ color: "var(--text-soft)", marginBottom: "var(--space-4)" }}>If a subscription you bought stops working before its end date, message us on WhatsApp or email and we&apos;ll replace it within 24 hours. Subscriptions come with full-period replacement guarantees.</p>
        <p style={{ color: "var(--text-soft)" }}>Digital downloads (courses, prompt packs, automation templates) are non-refundable once delivered. If a download link is broken, we&apos;ll re-send it.</p>
      </div>
    </section>
  );
}
