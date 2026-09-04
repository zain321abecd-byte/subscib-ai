"use client";

/**
 * Error boundary for the admin portal. A throw in any admin screen (a failed
 * Supabase read, a backend timeout) used to render Next's default error page,
 * which tells a teammate nothing and loses the sidebar. This keeps them in the
 * portal with a retry, and surfaces only the `digest` — the matching stack
 * trace stays in the server logs.
 */
import Link from "next/link";
import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[admin error]", error);
  }, [error]);

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "60vh", padding: 24, textAlign: "center" }}>
      <div style={{ maxWidth: 460 }}>
        <div
          aria-hidden="true"
          style={{
            width: 56, height: 56, borderRadius: "50%", margin: "0 auto 16px",
            display: "grid", placeItems: "center",
            background: "rgba(245, 72, 72, 0.12)", color: "#F54848",
          }}
        >
          <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 22 }} />
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", margin: "0 0 8px" }}>
          This screen failed to load
        </h1>
        <p style={{ color: "var(--text-muted)", margin: "0 0 6px", lineHeight: 1.55 }}>
          The data behind this page couldn&apos;t be fetched. Retry, and if it keeps failing check
          the API and Supabase status.
        </p>
        {error?.digest && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", margin: "0 0 18px" }}>
            Reference: <code>{error.digest}</code>
          </p>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" onClick={reset} className="admin-btn admin-btn-primary">
            Try again
          </button>
          <Link href="/admin" className="admin-btn admin-btn-ghost">
            Back to dashboard
          </Link>
          <Link href="/admin/diagnostics" className="admin-btn admin-btn-ghost">
            Diagnostics
          </Link>
        </div>
      </div>
    </div>
  );
}
