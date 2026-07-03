"use client";

/**
 * App-wide fallback for uncaught Server Component / route errors.
 * Renders its own <html>/<body> because at this point the normal
 * layout tree has failed. Keep it minimal — inline styles only,
 * no dependency on providers that might themselves be broken.
 */
import { useEffect } from "react";

export default function GlobalError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        margin: 0, minHeight: "100vh", display: "grid", placeItems: "center",
        background: "#0b0b0e", color: "#eaeaef", fontFamily: "system-ui, sans-serif",
        padding: 24,
      }}>
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div
            aria-hidden
            style={{
              width: 64, height: 64, borderRadius: "50%",
              margin: "0 auto 20px",
              display: "grid", placeItems: "center",
              background: "rgba(239, 68, 68, 0.12)",
              color: "#ef4444",
              fontSize: 24,
            }}
          >
            ⚠
          </div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "rgba(234, 234, 239, 0.7)", marginBottom: 20, lineHeight: 1.5 }}>
            We hit an unexpected error rendering this page. Refreshing usually helps.
          </p>
          {error?.digest && (
            <p style={{ color: "rgba(234, 234, 239, 0.5)", fontSize: "0.75rem", marginBottom: 20 }}>
              Reference: <code>{error.digest}</code>
            </p>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#f97316", color: "#fff", border: "none",
                padding: "10px 22px", borderRadius: 8, cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#eaeaef",
                padding: "10px 22px", borderRadius: 8, textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
