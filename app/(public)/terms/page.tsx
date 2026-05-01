export const metadata = {
  title: "Terms & Conditions",
  description: "SubscribAI terms of service for AI subscriptions, payments, replacements, and disputes.",
  alternates: { canonical: "/terms" },
};

const H2 = { fontFamily: "var(--font-heading)", color: "var(--text)", fontSize: "var(--fs-lg)", letterSpacing: "-0.01em", marginBottom: "var(--space-2)", fontWeight: 600 } as const;
const UL = { listStyle: "disc", paddingLeft: 24, display: "grid", gap: 6, marginTop: 8 } as const;

export default function TermsPage() {
  return (
    <section className="v2-section">
      <div className="v2-container" style={{ maxWidth: 760 }}>
        <p className="v2-eyebrow">Legal</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-3xl)", color: "var(--text)", letterSpacing: "-0.02em", marginBottom: "var(--space-2)" }}>
          Terms &amp; conditions
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)", marginBottom: "var(--space-6)" }}>
          Last updated: April 2026
        </p>

        <div style={{ color: "var(--text-soft)", lineHeight: 1.7, display: "grid", gap: "var(--space-5)" }}>
          <p>
            Welcome to SubscribAI. By placing an order or using this website you agree to these terms.
            If you don&rsquo;t agree, please don&rsquo;t use the service.
          </p>

          <section>
            <h2 style={H2}>1. Who we are</h2>
            <p>SubscribAI is a Pakistan-based reseller of premium AI subscriptions, automation packs, and digital courses. We don&rsquo;t build the AI tools listed in our shop — we resell access from authorized channels.</p>
          </section>

          <section>
            <h2 style={H2}>2. What you&rsquo;re buying</h2>
            <ul style={UL}>
              <li><strong>AI subscription access</strong> — login credentials or invite to a plan we operate. Period of access matches what you paid for.</li>
              <li><strong>Automation packs</strong> — files (Make.com / Zapier blueprints) you import into your own account. One-time purchase, lifetime access to the files you bought.</li>
              <li><strong>Courses</strong> — streaming video access plus downloadable templates. One-time purchase, lifetime access.</li>
              <li><strong>Freebies</strong> — free downloads delivered via WhatsApp or email.</li>
            </ul>
          </section>

          <section>
            <h2 style={H2}>3. Payment</h2>
            <ul style={UL}>
              <li>Prices shown in USD and converted to PKR at today&rsquo;s rate at checkout.</li>
              <li>Payment is processed by SahulatPay (JazzCash, Easypaisa, or local card). We never see or store card numbers.</li>
              <li>Once a transaction is confirmed by SahulatPay, payment is final unless covered by Section 5 (Replacements) or our Refund Policy.</li>
            </ul>
          </section>

          <section>
            <h2 style={H2}>4. Delivery</h2>
            <p>We aim to deliver every order within 30 minutes during 9 AM &ndash; 11 PM PKT, and within a few hours overnight. Credentials and download links go to the email you provided at checkout.</p>
          </section>

          <section>
            <h2 style={H2}>5. Replacements</h2>
            <p>If a subscription you bought stops working before its end date, message us on WhatsApp or email within 24 hours. We&rsquo;ll re-issue credentials free of charge for the remainder of your paid period.</p>
            <p>Replacements don&rsquo;t cover: account locks caused by terms-of-service violations on the AI tool itself (abusive prompts, bot use, etc.), shared/leaked credentials, or expired periods.</p>
          </section>

          <section>
            <h2 style={H2}>6. Refunds</h2>
            <p>See our <a href="/refund" style={{ color: "var(--brand-300)" }}>Refund Policy</a> for the full breakdown. In short: digital downloads are non-refundable once delivered; subscriptions are covered by the replacement guarantee in Section 5.</p>
          </section>

          <section>
            <h2 style={H2}>7. Acceptable use</h2>
            <p>By buying a subscription you agree not to:</p>
            <ul style={UL}>
              <li>Resell or share access with people outside your household / team beyond what the underlying tool allows</li>
              <li>Use credentials to violate the AI tool&rsquo;s own Terms of Service</li>
              <li>Attempt to extract data, abuse rate limits, or run unauthorized automation against the AI provider</li>
            </ul>
          </section>

          <section>
            <h2 style={H2}>8. Third-party tools — disclaimer</h2>
            <p>The AI tools we resell (ChatGPT, Claude, Midjourney, Canva, etc.) are owned and operated by their respective companies. We&rsquo;re not affiliated with them. All trademarks belong to their owners. Tool features, pricing, and availability can change without notice — when they do, we&rsquo;ll honor what was promised at the time of your purchase.</p>
          </section>

          <section>
            <h2 style={H2}>9. Liability</h2>
            <p>Our liability is limited to the price you paid us. We&rsquo;re not liable for indirect losses (lost revenue, lost data, downstream business decisions) caused by the AI tool itself, by our delay in activation, or by any other cause.</p>
          </section>

          <section>
            <h2 style={H2}>10. Termination</h2>
            <p>You can stop using the service any time. We can terminate access if you violate these terms or the underlying AI tool&rsquo;s ToS — in egregious cases (fraud, chargebacks, abuse) without refund.</p>
          </section>

          <section>
            <h2 style={H2}>11. Changes to these terms</h2>
            <p>We may update these terms occasionally. Material changes will trigger a notice on the homepage for 14 days. Continuing to use the service after changes means you accept them.</p>
          </section>

          <section>
            <h2 style={H2}>12. Governing law</h2>
            <p>These terms are governed by Pakistani law. Disputes are resolved in courts in Karachi unless mutually agreed otherwise.</p>
          </section>

          <p style={{ marginTop: "var(--space-5)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
            Questions? Email <a href="mailto:contact@subscribai.com" style={{ color: "var(--brand-300)" }}>contact@subscribai.com</a> or
            message us on <a href="https://wa.me/15550132026" style={{ color: "var(--brand-300)" }}>WhatsApp</a>.
          </p>
        </div>
      </div>
    </section>
  );
}
