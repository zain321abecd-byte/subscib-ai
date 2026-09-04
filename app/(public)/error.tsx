"use client";

/**
 * Error boundary for the whole public segment.
 *
 * Before this, only /product/[id] had one — a throw anywhere else (shop,
 * blog, cart, checkout, prices, contact) fell through to Next's default error
 * screen. This keeps the site chrome, says something a shopper can act on, and
 * shows only the `digest` hash — never the message or stack, which can carry
 * internal details.
 */
import Link from "next/link";
import { useEffect } from "react";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[public segment error]", error);
  }, [error]);

  return (
    <section className="v2-section">
      <div className="v2-container">
        <div className="surface-card" style={{ maxWidth: 620, margin: "0 auto" }}>
          <div className="empty-state">
            <div
              className="empty-state-icon"
              aria-hidden="true"
              style={{ background: "rgba(245, 72, 72, 0.12)", color: "#F54848" }}
            >
              <i className="fa-solid fa-triangle-exclamation" />
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
              Something went wrong
            </h1>
            <p>
              This page didn&rsquo;t load properly. It&rsquo;s on our side, not yours — try again in a
              moment. Any order you&rsquo;ve already placed is unaffected.
            </p>
            {error?.digest && (
              <p style={{ fontSize: "var(--fs-xs)" }}>
                Reference: <code>{error.digest}</code>
              </p>
            )}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-3)",
                justifyContent: "center",
                marginTop: "var(--space-4)",
              }}
            >
              <button type="button" onClick={reset} className="btn btn-primary">
                Try again
              </button>
              <Link href="/shop" className="btn btn-outline">
                Back to shop
              </Link>
              <Link href="/contact" className="btn btn-outline">
                Contact support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
