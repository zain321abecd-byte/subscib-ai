import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How SubscribAI collects, stores, and uses your data. We don't sell or share customer data with third parties.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <section className="v2-section">
      <div className="v2-container" style={{ maxWidth: 760 }}>
        <p className="v2-eyebrow">Legal</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-3xl)", color: "var(--text)", letterSpacing: "-0.02em", marginBottom: "var(--space-2)" }}>
          Privacy Policy
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)", marginBottom: "var(--space-6)" }}>
          Last updated: April 2026
        </p>

        <div style={{ color: "var(--text-soft)", lineHeight: 1.7, display: "grid", gap: "var(--space-5)" }}>
          <section>
            <h2 style={H2}>1. What we collect</h2>
            <p>When you place an order we collect: your <strong>name, email, and (where applicable) phone number</strong> for local wallet payments, and the items in your order. Payment details (card numbers, wallet PINs) are handled directly by our payment gateway — we never see or store them.</p>
          </section>

          <section>
            <h2 style={H2}>2. Why we collect it</h2>
            <ul style={UL}>
              <li>To deliver your subscription / digital file to your email</li>
              <li>To send replacement credentials if a subscription stops working</li>
              <li>To respond to your support messages on WhatsApp or email</li>
              <li>To prevent fraud and abuse</li>
            </ul>
          </section>

          <section>
            <h2 style={H2}>3. Who we share it with</h2>
            <p>We do <strong>not</strong> sell or rent your data. We share only what's strictly necessary with these processors:</p>
            <ul style={UL}>
              <li><strong>Our payment gateway</strong> — to process your payment securely</li>
              <li><strong>Vercel</strong> — to host this website</li>
              <li><strong>Email providers</strong> — to deliver order confirmations and login details</li>
            </ul>
          </section>

          <section>
            <h2 style={H2}>4. How long we keep it</h2>
            <p>Order records: 5 years (for accounting and tax purposes). Email addresses: until you ask us to delete them. Wallet phone numbers used only at checkout, not retained beyond order fulfilment.</p>
          </section>

          <section>
            <h2 style={H2}>5. Your rights</h2>
            <p>You can email <a href="mailto:contact@subscribai.com" style={{ color: "var(--brand-300)" }}>contact@subscribai.com</a> any time to request a copy of your data, request correction, or request deletion. We respond within 7 days.</p>
          </section>

          <section>
            <h2 style={H2}>6. Cookies & analytics</h2>
            <p>We use a single cookie to remember your shopping cart between visits. We do not run third-party advertising or tracking pixels. If we add analytics later (e.g. Vercel Analytics), this policy will be updated to disclose it.</p>
          </section>

          <section>
            <h2 style={H2}>7. Changes</h2>
            <p>If we materially change this policy, we'll update the "Last updated" date above and post a notice on the homepage for 14 days.</p>
          </section>

          <p style={{ marginTop: "var(--space-5)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
            Questions? Email <a href="mailto:contact@subscribai.com" style={{ color: "var(--brand-300)" }}>contact@subscribai.com</a> or
            message us on <a href="https://wa.me/15550132026" style={{ color: "var(--brand-300)" }}>WhatsApp</a>.
          </p>

          <p style={{ marginTop: "var(--space-3)" }}>
            <Link href="/terms" style={{ color: "var(--brand-300)" }}>Read our Terms &amp; Conditions →</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

const H2: React.CSSProperties = {
  fontFamily: "var(--font-heading)", color: "var(--text)", fontSize: "var(--fs-lg)",
  letterSpacing: "-0.01em", marginBottom: "var(--space-2)", fontWeight: 600,
};
const UL: React.CSSProperties = {
  listStyle: "disc", paddingLeft: 24, display: "grid", gap: 6, marginTop: 8,
};
