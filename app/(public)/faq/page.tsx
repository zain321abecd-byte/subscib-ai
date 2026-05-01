import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ — Frequently Asked Questions",
  description: "Answers about delivery time, payment methods, refund/replacement guarantees, account legitimacy, and support — all common questions about buying AI subscriptions through SubscribAI.",
  alternates: { canonical: "/faq" },
};

const QUESTIONS: { q: string; a: string; category: string }[] = [
  // Delivery
  { category: "Delivery", q: "How fast will I get my subscription?", a: "Most AI subscription accounts are activated within 30 minutes during business hours (9 AM – 11 PM PKT), and within a few hours overnight. You'll get an email and a WhatsApp confirmation when ready." },
  { category: "Delivery", q: "Where will my login details arrive?", a: "Always to the email address you entered at checkout. Check spam if you don't see it within 30 minutes, then message us on WhatsApp." },
  { category: "Delivery", q: "Can I get my account on a different email later?", a: "Yes — message us on WhatsApp with your order ID and the new email. We'll re-issue the credentials." },

  // Payment
  { category: "Payment", q: "Which payment methods do you accept?", a: "JazzCash, Easypaisa, and any local debit/credit card. All processed securely through SahulatPay's gateway. We never see or store your card number." },
  { category: "Payment", q: "Is there a fee for paying by card vs wallet?", a: "No — the price you see is the price you pay. We absorb the gateway fee on our end." },
  { category: "Payment", q: "I got charged but my order didn't go through?", a: "Forward the SahulatPay confirmation SMS or email to contact@subscribai.com or WhatsApp us. We'll either complete the order or refund within 24 hours." },
  { category: "Payment", q: "Why are prices in USD with PKR conversion?", a: "Industry-standard for AI tools. We charge you in PKR at the live exchange rate at checkout — what you see on the Pay button is what hits your wallet." },

  // Trust
  { category: "Trust", q: "Are these legitimate accounts?", a: "Yes. Every subscription is from an authorized reseller channel, family-plan slot, or our own bulk-purchase pool. We don't sell cracked or shared logins from sketchy sources." },
  { category: "Trust", q: "Will I get banned for using these?", a: "No. The accounts comply with each tool's Terms of Service for the way we sell them. We've sold thousands without a single ban." },
  { category: "Trust", q: "What if my account stops working?", a: "Tell us on WhatsApp or email and we'll replace it within 24 hours. Subscriptions come with full-period replacement guarantees — if you bought one month, you get one month of working access, end of story." },

  // Subscriptions
  { category: "Subscriptions", q: "Can I cancel a bundle anytime?", a: "Yes — bundle subscriptions are month-to-month with no contracts. Cancel any time before your renewal date and you won't be charged again." },
  { category: "Subscriptions", q: "Do you auto-renew my subscription?", a: "We send a renewal reminder 3 days before expiry. You confirm — we don't auto-charge. You stay in control." },
  { category: "Subscriptions", q: "Can I upgrade or downgrade mid-cycle?", a: "Yes. Message us on WhatsApp; we'll prorate the difference and switch you over without losing access." },

  // Support
  { category: "Support", q: "What's the fastest way to reach you?", a: "WhatsApp. We monitor it from 9 AM – 11 PM PKT every day. Average reply time during the day is under 15 minutes." },
  { category: "Support", q: "Do you offer phone support?", a: "Not currently — we keep prices low by being WhatsApp + email only. Most issues resolve in WhatsApp faster than a phone call anyway." },
  { category: "Support", q: "What languages?", a: "English and Urdu both work. Roman-Urdu over WhatsApp is fine too." },
];

export default function FAQPage() {
  // Group by category
  const grouped = QUESTIONS.reduce<Record<string, typeof QUESTIONS>>((acc, q) => {
    (acc[q.category] = acc[q.category] || []).push(q);
    return acc;
  }, {});

  // FAQ JSON-LD for rich Google results
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: QUESTIONS.map((q) => ({
      "@type": "Question",
      name: q.q,
      acceptedAnswer: { "@type": "Answer", text: q.a },
    })),
  };

  return (
    <section className="v2-section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="v2-container" style={{ maxWidth: 800 }}>
        <header style={{ marginBottom: "var(--space-6)", textAlign: "center" }}>
          <p className="v2-eyebrow">Help</p>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem, 3.6vw, 2.5rem)", color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "var(--space-3) 0" }}>
            Frequently asked questions
          </h1>
          <p style={{ color: "var(--text-soft)", fontSize: "var(--fs-md)" }}>
            Everything customers ask before, during, and after they buy. Can't find your answer? <Link href="/contact" style={{ color: "var(--brand-300)" }}>Contact us</Link>.
          </p>
        </header>

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} style={{ marginBottom: "var(--space-7)" }}>
            <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--text)", fontSize: "var(--fs-xl)", marginBottom: "var(--space-4)", letterSpacing: "-0.01em" }}>
              {category}
            </h2>
            <div className="v2-faq" style={{ display: "grid", gap: "var(--space-3)" }}>
              {items.map((q) => (
                <details key={q.q}>
                  <summary>{q.q}</summary>
                  <p>{q.a}</p>
                </details>
              ))}
            </div>
          </div>
        ))}

        <div style={{
          marginTop: "var(--space-7)",
          padding: "var(--space-6)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          textAlign: "center",
        }}>
          <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--text)", fontSize: "var(--fs-xl)", marginBottom: "var(--space-3)" }}>
            Still have questions?
          </h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
            Message us on WhatsApp — we usually reply in under 15 minutes during the day.
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center", flexWrap: "wrap" }}>
            <a className="btn btn-primary" href="https://wa.me/15550132026">
              <i className="fa-brands fa-whatsapp"></i> WhatsApp us
            </a>
            <Link className="btn btn-outline" href="/contact">Send a message</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
