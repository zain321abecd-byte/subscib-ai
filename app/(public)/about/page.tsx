import Link from "next/link";
import { getContactLinks } from "@/lib/contact-links";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "About SubscribAI",
  description:
    "SubscribAI is a Pakistan-based store for premium AI subscriptions — ChatGPT Plus, Claude Pro, Midjourney, and more — paid in local currency and delivered by email in minutes.",
  alternates: { canonical: "/about" },
};

const H2 = { fontFamily: "var(--font-heading)", color: "var(--text)", fontSize: "var(--fs-lg)", letterSpacing: "-0.01em", marginBottom: "var(--space-2)", fontWeight: 600 } as const;
const UL = { listStyle: "disc", paddingLeft: 24, display: "grid", gap: 6, marginTop: 8 } as const;

export default async function AboutPage() {
  const { whatsappUrl, email, mailtoUrl } = await getContactLinks();

  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About SubscribAI",
    url: absoluteUrl("/about"),
    mainEntity: {
      "@type": "Organization",
      name: "SubscribAI",
      url: absoluteUrl("/"),
      description:
        "Pakistan-based store for premium AI subscriptions and digital tools, paid in local currency and delivered by email.",
    },
  };

  return (
    <section className="v2-section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }} />
      <div className="v2-container" style={{ maxWidth: 760 }}>
        <p className="v2-eyebrow">About us</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-3xl)", color: "var(--text)", letterSpacing: "-0.02em", marginBottom: "var(--space-6)" }}>
          About SubscribAI
        </h1>

        <div style={{ color: "var(--text-soft)", lineHeight: 1.7, display: "grid", gap: "var(--space-5)" }}>
          <p>
            SubscribAI makes premium AI tools practical to buy in Pakistan. International subscriptions
            usually require foreign credit cards and dollar billing — we remove that barrier. You pick a
            plan, pay in <strong>PKR with local payment methods</strong>, and receive working access by
            email, usually <strong>within 30 minutes</strong> of payment confirmation during business hours.
          </p>

          <section>
            <h2 style={H2}>What we sell</h2>
            <ul style={UL}>
              <li><strong>AI subscriptions</strong> — ChatGPT Plus, Claude Pro, Gemini, Perplexity and more</li>
              <li><strong>Design &amp; image AI</strong> — Midjourney, Leonardo, Firefly, Canva Pro</li>
              <li><strong>Productivity tools</strong> — Notion AI, Grammarly, ClickUp AI</li>
              <li><strong>Automation</strong> — Make.com, Zapier, n8n flows</li>
              <li><strong>Courses</strong> — self-paced AI courses and templates</li>
            </ul>
            <p style={{ marginTop: 8 }}>
              Browse the full catalog in the <Link href="/shop">shop</Link> or compare plans on the{" "}
              <Link href="/prices">price list</Link>.
            </p>
          </section>

          <section>
            <h2 style={H2}>How buying works</h2>
            <ul style={UL}>
              <li>Choose a product, plan, account type, and duration — prices are shown up front in PKR (USD and INR views available).</li>
              <li>Pay with a supported local payment method at checkout.</li>
              <li>Your subscription details arrive by email, typically in under 30 minutes, with a WhatsApp confirmation.</li>
            </ul>
          </section>

          <section>
            <h2 style={H2}>Why customers trust us</h2>
            <ul style={UL}>
              <li><strong>Replacement guarantee</strong> — if access stops working during the paid period, we re-issue it free. See the <Link href="/refund">refund &amp; replacement policy</Link>.</li>
              <li><strong>Human support</strong> — WhatsApp and email support from a real person, not a bot.</li>
              <li><strong>Verified reviews</strong> — the reviews on our homepage and product pages come from real orders.</li>
            </ul>
          </section>

          <section>
            <h2 style={H2}>Talk to us</h2>
            <p>
              Questions before you buy? Message us on <a href={whatsappUrl} target="_blank" rel="noopener">WhatsApp</a>{" "}
              or email <a href={mailtoUrl}>{email}</a>. You can also use the <Link href="/contact">contact page</Link>.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
