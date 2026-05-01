export const metadata = {
  title: "Contact",
  description: "Talk to a human at SubscribAI. WhatsApp for fastest reply, email for everything else.",
  alternates: { canonical: "/contact" },
};
export default function ContactPage() {
  return (
    <section className="v2-section">
      <div className="v2-container contact-grid" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "var(--space-5)" }}>
        <div className="surface-card">
          <p className="v2-eyebrow">Contact</p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-2xl)", color: "var(--text)", marginBottom: "var(--space-3)" }}>Talk to a human</h2>
          <p style={{ color: "var(--text-soft)", marginBottom: "var(--space-5)" }}>Reach out on WhatsApp for the fastest reply, or email and we'll get back within a few hours.</p>
          <form style={{ display: "grid", gap: "var(--space-3)" }}>
            <div className="field"><label className="field-label">Name</label><input className="input" placeholder="Your name" /></div>
            <div className="field"><label className="field-label">Email</label><input className="input" type="email" placeholder="you@example.com" /></div>
            <div className="field"><label className="field-label">Message</label><textarea className="textarea input" rows={5} placeholder="How can we help?" /></div>
            <button type="button" className="btn btn-primary">Send message</button>
          </form>
        </div>
        <aside className="surface-card">
          <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--text)", marginBottom: "var(--space-3)" }}>Reach us</h3>
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
            <li><a href="https://wa.me/15550132026" style={{ color: "var(--brand-600)" }}><i className="fa-brands fa-whatsapp"></i> WhatsApp +1 555 013 2026</a></li>
            <li><a href="mailto:contact@subscribai.com" style={{ color: "var(--brand-600)" }}><i className="fa-solid fa-envelope"></i> contact@subscribai.com</a></li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
