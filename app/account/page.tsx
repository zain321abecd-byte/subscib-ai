import Link from "next/link";

export const metadata = { title: "Your account · SubscribAI" };

export default function AccountPage() {
  return (
    <section className="v2-section">
      <div className="v2-container">
        <header className="v2-section-head" style={{ textAlign: "left", maxWidth: "none" }}>
          <p className="v2-eyebrow">Account</p>
          <h2>Welcome back</h2>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "var(--space-5)" }} className="acct-grid">
          <div className="surface-card">
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-xl)", color: "var(--text)", marginBottom: "var(--space-3)" }}>Recent orders</h3>
            <div className="empty-state">
              <div className="empty-state-icon"><i className="fa-solid fa-receipt"></i></div>
              <h3>No orders yet</h3>
              <p>Once you complete a checkout, your order history and active subscriptions will appear here.</p>
              <Link className="btn btn-primary" href="/shop" style={{ marginTop: "var(--space-3)" }}>Start shopping</Link>
            </div>
          </div>

          <aside style={{ display: "grid", gap: "var(--space-4)" }}>
            <div className="surface-card">
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-lg)", color: "var(--text)", marginBottom: "var(--space-3)" }}>Need help?</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10, fontSize: "var(--fs-sm)" }}>
                <li><a href="https://wa.me/15550132026" style={{ color: "var(--brand-600)" }}><i className="fa-brands fa-whatsapp"></i> WhatsApp support</a></li>
                <li><a href="mailto:contact@subscribai.com" style={{ color: "var(--brand-600)" }}><i className="fa-solid fa-envelope"></i> Email us</a></li>
                <li><Link href="/refund" style={{ color: "var(--brand-600)" }}><i className="fa-solid fa-rotate"></i> Refund policy</Link></li>
              </ul>
            </div>
            <div className="surface-card">
              <span className="badge badge-brand" style={{ marginBottom: "var(--space-3)" }}>Tip</span>
              <p style={{ color: "var(--text-soft)", fontSize: "var(--fs-sm)" }}>Subscribed already? Forward your activation email to <strong>contact@subscribai.com</strong> and we'll link it to your account.</p>
            </div>
          </aside>
        </div>
      </div>

      <style>{`@media (max-width: 880px) { .acct-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}
