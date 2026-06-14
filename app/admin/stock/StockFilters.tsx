"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StyledSelectField from "../StyledSelectField";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "expiringSoon", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
  { value: "renewed", label: "Renewed" },
];

const SORTS = [
  { value: "expiry_asc", label: "Expiry date: soonest" },
  { value: "expiry_desc", label: "Expiry date: latest" },
];

export default function StockFilters({ count }: { count: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [filter, setFilter] = useState(params.get("filter") || "all");
  const [sort, setSort] = useState(params.get("sort") || "expiry_asc");
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<number | null>(null);

  function pushParams(nextQ: string, nextFilter: string, nextSort: string) {
    const next = new URLSearchParams();
    if (nextQ.trim()) next.set("q", nextQ.trim());
    if (nextFilter !== "all") next.set("filter", nextFilter);
    if (nextSort !== "expiry_asc") next.set("sort", nextSort);
    if (typeof window !== "undefined") window.dispatchEvent(new Event("admin-nav-start"));
    startTransition(() => {
      const qs = next.toString();
      router.replace(qs ? `/admin/stock?${qs}` : "/admin/stock", { scroll: false });
    });
  }

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => pushParams(q, filter, sort), 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function changeFilter(next: string) {
    setFilter(next);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    pushParams(q, next, sort);
  }

  function changeSort(next: string) {
    setSort(next);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    pushParams(q, filter, next);
  }

  function clear() {
    setQ("");
    setFilter("all");
    setSort("expiry_asc");
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    pushParams("", "all", "expiry_asc");
  }

  const hasFilters = q.trim() || filter !== "all" || sort !== "expiry_asc";

  return (
    <div className={`admin-toolbar ${isPending ? "is-loading" : ""}`}>
      <div className="admin-orders-search">
        {isPending ? <span className="admin-spinner" aria-label="Loading" /> : <i className="fa-solid fa-magnifying-glass"></i>}
        <input
          type="text"
          className="admin-input"
          placeholder="Search item or supplier..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && !isPending && (
          <button type="button" className="admin-orders-search-clear" onClick={() => setQ("")} aria-label="Clear search">
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>
      <div style={{ minWidth: 180 }}>
        <StyledSelectField key={filter} name="filter_display" defaultValue={filter} options={FILTERS} ariaLabel="Stock filter" onChange={changeFilter} />
      </div>
      <div style={{ minWidth: 210 }}>
        <StyledSelectField key={sort} name="sort_display" defaultValue={sort} options={SORTS} ariaLabel="Sort stock" onChange={changeSort} />
      </div>
      {hasFilters && (
        <button type="button" className="admin-btn admin-btn-ghost" onClick={clear}>
          <i className="fa-solid fa-rotate-left"></i> Clear
        </button>
      )}
      <div className="admin-toolbar-spacer" />
      <span style={{ color: "var(--text-muted)", fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: 8 }}>
        {isPending && <span className="admin-spinner" />}
        {isPending ? "Filtering..." : `${count} ${count === 1 ? "item" : "items"}`}
      </span>
    </div>
  );
}
