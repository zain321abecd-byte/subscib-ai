"use client";

/**
 * Route-level error boundary for /product/[id]. Any throw inside the
 * server component (data fetch, component render) is caught here and
 * shown as a friendly fallback with a "try again" affordance. Without
 * this file Next.js falls back to a blank 500 page which is what the
 * user was seeing.
 *
 * The `error.digest` (present in production builds) is a hash Next
 * writes into the server logs alongside the real stack trace — surface
 * it so it's easy to correlate a user report with the exact log line.
 */
import Link from "next/link";
import { useEffect } from "react";

export default function ProductError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Client-side sink so the browser console at least has *something*
    // — useful when the user shares a screenshot but not the server logs.
    // eslint-disable-next-line no-console
    console.error("[product/[id] error]", error);
  }, [error]);

  return (
    <section className="v2-section" style={{ padding: "80px 20px" }}>
      <div className="v2-container" style={{ maxWidth: 620, textAlign: "center" }}>
        <div
          aria-hidden
          style={{
            width: 64, height: 64, borderRadius: "50%",
            margin: "0 auto 20px",
            display: "grid", placeItems: "center",
            background: "rgba(245, 72, 72, 0.12)",
            color: "#F54848",
          }}
        >
          <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 24 }} />
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", marginBottom: 8 }}>
          Couldn&apos;t load this product
        </h1>
        <p style={{ color: "var(--text-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
          Something went wrong on our side. Refresh in a moment, or head back to the shop
          to browse everything else.
        </p>
        {error?.digest && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: 20 }}>
            Reference: <code>{error.digest}</code>
          </p>
        )}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={reset}
            className="admin-btn admin-btn-primary"
            style={{ padding: "10px 18px" }}
          >
            Try again
          </button>
          <Link href="/shop" className="admin-btn admin-btn-ghost" style={{ padding: "10px 18px" }}>
            Back to shop
          </Link>
        </div>
      </div>
    </section>
  );
}
