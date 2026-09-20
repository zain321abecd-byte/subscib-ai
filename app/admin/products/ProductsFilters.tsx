"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Live search for the product list — same shape as OrdersFilters: no submit
 * button, 350ms debounce, URL written with router.replace so the back button
 * isn't polluted by every keystroke, and the server page does the filtering.
 */
export default function ProductsFilters({ count }: { count: number }) {
  const router = useRouter();
  const params = useSearchParams();

  const urlQ = params.get("q") || "";
  const [q, setQ] = useState(urlQ);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<number | null>(null);

  function pushParams(nextQ: string) {
    const next = new URLSearchParams();
    if (nextQ.trim()) next.set("q", nextQ.trim());
    const qs = next.toString();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("admin-nav-start"));
    }
    startTransition(() => {
      router.replace(qs ? `/admin/products?${qs}` : "/admin/products", { scroll: false });
    });
  }

  useEffect(() => {
    // Only touch the URL when the box actually differs from it. Without this
    // the effect fires on mount and replaces the URL with a bare
    // /admin/products, which would wipe the ?created=/?updated=/?deleted=
    // success banner about a third of a second after a save.
    if (q.trim() === urlQ.trim()) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      pushParams(q);
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, urlQ]);

  return (
    <div className={`admin-toolbar ${isPending ? "is-loading" : ""}`}>
      <div className="admin-orders-search">
        {isPending ? (
          <span className="admin-spinner" aria-label="Loading" />
        ) : (
          <i className="fa-solid fa-magnifying-glass"></i>
        )}
        <input
          type="search"
          className="admin-input"
          placeholder="Search by name, id, brand, tag, or category…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search products"
        />
        {q && !isPending && (
          <button
            type="button"
            className="admin-orders-search-clear"
            onClick={() => setQ("")}
            aria-label="Clear search"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>

      {q.trim() !== "" && (
        <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setQ("")}>
          <i className="fa-solid fa-rotate-left"></i> Clear
        </button>
      )}

      <div className="admin-toolbar-spacer" />
      <span
        style={{ color: "var(--text-muted)", fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: 8 }}
        role="status"
        aria-live="polite"
      >
        {isPending && <span className="admin-spinner" />}
        {isPending ? "Searching…" : `${count} ${count === 1 ? "product" : "products"}`}
      </span>
    </div>
  );
}
