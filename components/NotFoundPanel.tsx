import Link from "next/link";

/**
 * Shared body of the 404 page.
 *
 * Rendered by two boundaries:
 *   • app/(public)/not-found.tsx — inside the public chrome (header + footer),
 *     which is what a notFound() from a product / blog route hits.
 *   • app/not-found.tsx — for URLs that match no route at all, where the
 *     public layout (and its providers) never mount, so the page brings its
 *     own lightweight header.
 *
 * Uses the existing design system only (.v2-section, .surface-card,
 * .empty-state, .btn) so it inherits the site's spacing, radii, and colours.
 */
export default function NotFoundPanel() {
  return (
    <section className="v2-section">
      <div className="v2-container">
        <div className="surface-card" style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">
              <i className="fa-solid fa-compass" />
            </div>
            <h1
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--fs-2xl)",
                color: "var(--text)",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              We couldn&rsquo;t find that page
            </h1>
            <p>
              The link may be out of date, or the page may have moved. Nothing is wrong with your
              account or any order you&rsquo;ve placed.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-3)",
                justifyContent: "center",
                marginTop: "var(--space-4)",
              }}
            >
              <Link href="/" className="btn btn-primary">
                Back to homepage
              </Link>
              <Link href="/shop" className="btn btn-outline">
                Browse the shop
              </Link>
            </div>

            <nav
              aria-label="Helpful links"
              style={{
                marginTop: "var(--space-6)",
                paddingTop: "var(--space-5)",
                borderTop: "1px solid var(--border)",
                width: "100%",
              }}
            >
              <p style={{ marginBottom: "var(--space-3)", fontSize: "var(--fs-sm)" }}>
                Looking for something specific?
              </p>
              <ul
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--space-4)",
                  justifyContent: "center",
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  fontSize: "var(--fs-sm)",
                }}
              >
                <li><Link href="/prices" style={{ color: "var(--brand-300)" }}>Pricing &amp; bundles</Link></li>
                <li><Link href="/blog" style={{ color: "var(--brand-300)" }}>Blog</Link></li>
                <li><Link href="/faq" style={{ color: "var(--brand-300)" }}>FAQ</Link></li>
                <li><Link href="/contact" style={{ color: "var(--brand-300)" }}>Contact support</Link></li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}
