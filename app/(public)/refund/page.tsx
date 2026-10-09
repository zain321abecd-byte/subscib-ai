import { getContactLinks } from "@/lib/contact-links";

export const metadata = {
  title: "Refund & Replacement Policy",
  description: "Clear refund, replacement, cancellation, partial-delivery, and refill rules for AI subscriptions, digital products, and SMM panel services.",
  alternates: { canonical: "/refund" },
};

const H2 = { fontFamily: "var(--font-heading)", color: "var(--text)", fontSize: "var(--fs-lg)", letterSpacing: "-0.01em", marginBottom: "var(--space-2)", fontWeight: 600 } as const;
const UL = { listStyle: "disc", paddingLeft: 24, display: "grid", gap: 6, marginTop: 8 } as const;

export default async function RefundPage() {
  const { whatsappUrl, email, mailtoUrl } = await getContactLinks();
  return (
    <section className="v2-section">
      <div className="v2-container" style={{ maxWidth: 760 }}>
        <p className="v2-eyebrow">Policy</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-3xl)", color: "var(--text)", letterSpacing: "-0.02em", marginBottom: "var(--space-2)" }}>
          Refund &amp; replacement policy
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)", marginBottom: "var(--space-6)" }}>
          Last updated: October 2026
        </p>

        <div style={{ color: "var(--text-soft)", lineHeight: 1.7, display: "grid", gap: "var(--space-5)" }}>
          <p>
            We aim to make this dead simple. Most issues are resolved with a free <strong>replacement</strong> rather than a refund.
            Here&rsquo;s exactly what we cover and how it works.
          </p>

          {/* Subscription replacements */}
          <section>
            <h2 style={H2}>1. AI subscription replacements (the main one)</h2>
            <p>If a subscription you bought stops working before its paid period ends, we&rsquo;ll re-issue working credentials within 24 hours, free of charge.</p>
            <p><strong>What&rsquo;s covered:</strong></p>
            <ul style={UL}>
              <li>Account suddenly logged out / password reset by the provider</li>
              <li>Plan downgraded or features removed mid-period</li>
              <li>Login link expired or invite revoked</li>
              <li>Provider changed how access is granted (we re-onboard you)</li>
            </ul>
            <p><strong>What&rsquo;s not covered:</strong></p>
            <ul style={UL}>
              <li>Account locks caused by your use of the tool (terms violations, abusive prompts, bot-like behavior)</li>
              <li>You shared credentials with people outside your household/team</li>
              <li>Your subscription period has ended — that&rsquo;s a renewal, not a replacement</li>
              <li>You changed your mind about a tool that was working as advertised</li>
            </ul>
          </section>

          {/* Refund cases */}
          <section>
            <h2 style={H2}>2. When we issue a real refund (not a replacement)</h2>
            <ul style={UL}>
              <li><strong>Order never delivered.</strong> If 24 hours pass after a confirmed payment and you have nothing in your inbox, we issue a full refund or, if you&rsquo;d rather, the order.</li>
              <li><strong>Wrong product delivered.</strong> If we send Claude Pro when you ordered ChatGPT Plus and we can&rsquo;t fix it within 24 hours, full refund.</li>
              <li><strong>Duplicate charge.</strong> If our payment gateway charges you twice, the duplicate is refunded within 3 working days.</li>
              <li><strong>Discontinued product.</strong> If we have to discontinue a tool mid-period (e.g. provider changes terms), we refund the unused remainder pro-rata.</li>
            </ul>
          </section>

          {/* SMM panel services */}
          <section>
            <h2 style={H2}>3. SMM panel services</h2>
            <p>
              SMM orders begin processing shortly after you submit them, so their refund rules differ from subscriptions and physical goods.
              Refunds for SMM orders are credited to your <strong>panel wallet</strong>, which lets you place another order immediately.
            </p>
            <ul style={UL}>
              <li><strong>Cancelled or failed orders:</strong> the order charge is returned automatically to your panel wallet once the order reaches a cancelled or failed status. The same order cannot be refunded twice.</li>
              <li><strong>Pending orders:</strong> contact support if an order remains pending beyond the service&rsquo;s stated start time. A pending order is not automatically refundable while the provider can still begin delivery.</li>
              <li><strong>Cancellation requests:</strong> cancellation is not guaranteed. It is only possible when the selected service supports cancellation and the provider has not already started or completed delivery.</li>
              <li><strong>Partially delivered orders:</strong> these are reviewed using the provider&rsquo;s final delivered quantity and service terms. Open a support ticket with the order ID if the status is partial or the delivered amount appears incorrect.</li>
              <li><strong>Completed orders:</strong> completed services are non-refundable because delivered followers, likes, views, comments, or other engagement cannot be withdrawn from the target account.</li>
              <li><strong>Drops and refills:</strong> a refill is available only when the service was advertised with a refill guarantee and the request falls within its stated refill period. Natural engagement loss outside that guarantee is not refundable.</li>
              <li><strong>Incorrect, private, deleted, or restricted links:</strong> customers are responsible for submitting the correct public target. Once processing begins, an order placed against an incorrect or inaccessible target is not refundable unless the provider cancels or fails it.</li>
              <li><strong>Processing speed:</strong> start and completion times are estimates, not guarantees. Delays alone do not qualify for a refund while the order remains active with the provider.</li>
            </ul>
            <p>
              To report an SMM order problem, open a ticket inside the panel and include the panel order ID. Do not place a second order for the same target while the first order is still pending or in progress, because overlapping orders can make delivery counts impossible to verify.
            </p>
          </section>

          {/* Non-refundable */}
          <section>
            <h2 style={H2}>4. Other non-refundable items</h2>
            <ul style={UL}>
              <li><strong>Digital downloads</strong> (prompt packs, automation blueprints, course videos). Once delivered, can&rsquo;t be un-delivered.</li>
              <li><strong>Subscriptions you&rsquo;ve already used</strong> for more than 7 days, unless covered by Section 1.</li>
              <li><strong>Custom work</strong> (Business-tier custom automation builds) once development has started.</li>
            </ul>
            <p>If a download link is broken, we re-send it — no question.</p>
          </section>

          {/* Process */}
          <section>
            <h2 style={H2}>5. How to request a refund or replacement</h2>
            <ol style={{ ...UL, listStyle: "decimal" }}>
              <li>Message us on <a href={whatsappUrl} style={{ color: "var(--brand-300)" }}>WhatsApp</a> (fastest) or email <a href={mailtoUrl} style={{ color: "var(--brand-300)" }}>{email}</a></li>
              <li>Include your order ID (in your account dashboard) and a one-line description of what&rsquo;s wrong</li>
              <li>For account issues, a screenshot helps a lot</li>
              <li>We respond within working hours (9 AM &ndash; 11 PM PKT) — usually within 15 minutes</li>
            </ol>
          </section>

          {/* Timing */}
          <section>
            <h2 style={H2}>6. How long refunds take</h2>
            <ul style={UL}>
              <li><strong>Local wallet payments:</strong> 24&ndash;48 hours back to your wallet</li>
              <li><strong>Card refunds:</strong> 5&ndash;10 working days, depending on your bank</li>
              <li><strong>Replacements:</strong> usually within 1 hour, max 24 hours</li>
              <li><strong>SMM order refunds:</strong> credited to the panel wallet automatically when an order is confirmed as cancelled or failed</li>
            </ul>
          </section>

          {/* Chargebacks */}
          <section>
            <h2 style={H2}>7. Chargebacks</h2>
            <p>If you&rsquo;re considering a chargeback against SubscribAI, please reach out first — we resolve nearly every legitimate complaint within a day. Filing a chargeback while we&rsquo;re actively trying to help slows things down for everyone. Fraudulent chargebacks (a confirmed delivery + a contested charge) are subject to Section 10 of our <a href="/terms" style={{ color: "var(--brand-300)" }}>Terms</a>.</p>
          </section>

          <p style={{ marginTop: "var(--space-5)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
            Anything unclear? Email <a href={mailtoUrl} style={{ color: "var(--brand-300)" }}>{email}</a> or
            message us on <a href={whatsappUrl} style={{ color: "var(--brand-300)" }}>WhatsApp</a> — we&rsquo;ll explain.
          </p>
        </div>
      </div>
    </section>
  );
}
