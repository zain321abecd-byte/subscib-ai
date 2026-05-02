"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StyledSelectField from "../StyledSelectField";

const STATUSES = ["all", "pending", "paid", "delivered", "failed", "refunded", "cancelled"];

const STATUS_OPTIONS = STATUSES.map((s) => ({
  value: s,
  label: s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1),
}));

// Live filter bar — no submit button. Search is debounced (350ms) and the
// status select fires immediately on change. URL updates via router.replace
// so the back button isn't polluted by every keystroke.
export default function OrdersFilters({ count }: { count: number }) {
  const router = useRouter();
  const params = useSearchParams();

  const initialQ = params.get("q") || "";
  const initialStatus = params.get("status") || "all";

  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<number | null>(null);

  // Debounced URL writer. Also fires the AdminNavProgress event so the top
  // bar animates while the server re-renders the filtered list.
  function pushParams(nextQ: string, nextStatus: string) {
    const next = new URLSearchParams();
    if (nextQ.trim()) next.set("q", nextQ.trim());
    if (nextStatus && nextStatus !== "all") next.set("status", nextStatus);
    const qs = next.toString();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("admin-nav-start"));
    }
    startTransition(() => {
      router.replace(qs ? `/admin/orders?${qs}` : "/admin/orders", { scroll: false });
    });
  }

  // Debounce the search input.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      pushParams(q, status);
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Status fires immediately.
  function onStatusChange(next: string) {
    setStatus(next);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    pushParams(q, next);
  }

  function clear() {
    setQ("");
    setStatus("all");
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    pushParams("", "all");
  }

  const hasFilters = q.trim() !== "" || status !== "all";

  return (
    <div className={`admin-toolbar ${isPending ? "is-loading" : ""}`}>
      <div className="admin-orders-search">
        {isPending ? (
          <span className="admin-spinner" aria-label="Loading" />
        ) : (
          <i className="fa-solid fa-magnifying-glass"></i>
        )}
        <input
          type="text"
          className="admin-input"
          placeholder="Search by order #, email, name, phone, txn ID, UTM…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
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

      <div style={{ minWidth: 180 }}>
        {/* Re-mount when status changes externally so StyledSelectField picks up the new default. */}
        <StyledSelectField
          key={status}
          name="status_display"
          defaultValue={status}
          options={STATUS_OPTIONS}
          ariaLabel="Status filter"
          onChange={onStatusChange}
        />
      </div>

      {hasFilters && (
        <button type="button" className="admin-btn admin-btn-ghost" onClick={clear}>
          <i className="fa-solid fa-rotate-left"></i> Clear
        </button>
      )}

      <div className="admin-toolbar-spacer" />
      <span style={{ color: "var(--text-muted)", fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: 8 }}>
        {isPending && <span className="admin-spinner" />}
        {isPending ? "Searching…" : `${count} ${count === 1 ? "order" : "orders"}`}
      </span>
    </div>
  );
}
