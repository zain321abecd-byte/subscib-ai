import Link from "next/link";

export const metadata = {
  title: "Email confirmed — SubscribAI",
  description: "Your SubscribAI account is ready. Sign in to continue.",
  robots: { index: false, follow: false },
};

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const next = params.next || "/account";
  const email = (params.email || "").trim();
  const error = params.error_description || params.error;

  // ── Error branch ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <section className="auth-section">
        <div className="auth-card">
          <div className="confirm-hero confirm-hero-error">
            <i className="fa-solid fa-circle-xmark"></i>
          </div>
          <h1>Couldn&rsquo;t verify your email</h1>
          <p className="auth-tagline">{decodeURIComponent(error as string)}</p>
          <p className="auth-tagline" style={{ marginTop: 8 }}>
            The link may have expired. Try signing in — if your account exists, we&rsquo;ll
            send a new verification email.
          </p>
          <Link href="/login" className="btn btn-primary btn-large auth-submit">
            Try signing in <i className="fa-solid fa-arrow-right"></i>
          </Link>
          <p style={{ marginTop: 18, textAlign: "center", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
            Still stuck? <Link href="/contact" style={{ color: "var(--brand-300)" }}>Contact support</Link>.
          </p>
        </div>
      </section>
    );
  }

  // ── Success branch — account is verified and ready to use ────────────────
  return (
    <section className="auth-section">
      <div className="auth-card">
        <div className="confirm-hero">
          <i className="fa-solid fa-circle-check"></i>
        </div>

        <h1>Your account is ready</h1>
        <p className="auth-tagline">
          {email
            ? <>We&rsquo;ve verified <strong style={{ color: "var(--text)" }}>{email}</strong>. Your SubscribAI account is active.</>
            : <>Your email is verified and your SubscribAI account is active.</>}
        </p>

        {/* Next-step guide */}
        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: "var(--space-5) 0",
            display: "grid",
            gap: "var(--space-3)",
            textAlign: "left",
          }}
        >
          {[
            { n: 1, t: "Sign in", d: "Use the same email and password you signed up with." },
            { n: 2, t: "Browse the shop", d: "Pick from premium AI subscriptions, courses & automation packs." },
            { n: 3, t: "Pay your way", d: "JazzCash, Easypaisa, bank or card on PayFast's secure checkout." },
          ].map((s) => (
            <li
              key={s.n}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "var(--space-3)",
                alignItems: "start",
                padding: "var(--space-3)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                background: "var(--surface)",
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--brand-soft)",
                  color: "var(--brand-300)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {s.n}
              </span>
              <div>
                <strong style={{ color: "var(--text)", display: "block", marginBottom: 2, fontFamily: "var(--font-heading)" }}>
                  {s.t}
                </strong>
                <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>{s.d}</span>
              </div>
            </li>
          ))}
        </ol>

        {/* Primary CTA — pre-fills email so the user lands on a partially-completed form */}
        <Link
          href={`/login?next=${encodeURIComponent(next)}${email ? `&email=${encodeURIComponent(email)}` : ""}`}
          className="btn btn-primary btn-large auth-submit"
        >
          Sign in to my account <i className="fa-solid fa-arrow-right"></i>
        </Link>

        {/* Secondary action */}
        <div style={{ marginTop: "var(--space-3)", textAlign: "center" }}>
          <Link
            href="/shop"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              color: "var(--text-soft)",
              fontSize: "var(--fs-sm)",
            }}
          >
            Browse the shop first →
          </Link>
        </div>

        <p
          style={{
            marginTop: "var(--space-4)",
            textAlign: "center",
            fontSize: "var(--fs-xs)",
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          Need help? <Link href="/contact" style={{ color: "var(--brand-300)" }}>Contact support</Link> or
          message us on <a href="https://wa.me/15550132026" style={{ color: "var(--brand-300)" }}>WhatsApp</a>.
        </p>
      </div>
    </section>
  );
}
