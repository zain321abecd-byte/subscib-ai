import { getContactLinks } from "@/lib/contact-links";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata = {
  title: "Contact",
  description: "Talk to a human at SubscribAI. WhatsApp for fastest reply, email for everything else.",
  alternates: { canonical: "/contact" },
};
export default async function ContactPage() {
  const [{ whatsappUrl, whatsappDigits, email, mailtoUrl }, s] = await Promise.all([
    getContactLinks(),
    getSiteSettings(),
  ]);
  // Format the phone number for display: "+1 555 013 2026" from raw
  // digits. The link uses the raw digits so wa.me works reliably.
  const phoneDisplay = whatsappDigits ? `+${whatsappDigits}` : "";
  const supportPhone = s.support_phone?.trim();
  return (
    <section className="v2-section">
      <div className="v2-container contact-grid" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "var(--space-5)" }}>
        <div className="surface-card">
          <p className="v2-eyebrow">Contact</p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-2xl)", color: "var(--text)", marginBottom: "var(--space-3)" }}>Talk to a human</h2>
          <p style={{ color: "var(--text-soft)", marginBottom: "var(--space-5)" }}>Reach out on WhatsApp for the fastest reply, or email and we&apos;ll get back within a few hours.</p>
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
            {whatsappDigits && (
              <li><a href={whatsappUrl} style={{ color: "var(--brand-600)" }}><i className="fa-brands fa-whatsapp"></i> WhatsApp {phoneDisplay}</a></li>
            )}
            {supportPhone && (
              <li><a href={`tel:${supportPhone.replace(/[^\d+]/g, "")}`} style={{ color: "var(--brand-600)" }}><i className="fa-solid fa-phone"></i> {supportPhone}</a></li>
            )}
            {email && (
              <li><a href={mailtoUrl} style={{ color: "var(--brand-600)" }}><i className="fa-solid fa-envelope"></i> {email}</a></li>
            )}
          </ul>
        </aside>
      </div>
    </section>
  );
}
