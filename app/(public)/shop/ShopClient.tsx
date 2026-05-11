"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import MobileHeroProductCard from "@/components/MobileHeroProductCard";
import ProductCard from "@/components/ProductCard";
import Select from "@/components/Select";
import { useFx, formatPriceFromPKR } from "@/lib/fx";
import type { Product } from "@/lib/products";

const CATEGORIES = [
  { id: "ai-subscriptions", label: "AI Subs" },
  { id: "design-tools",     label: "Design" },
  { id: "productivity",     label: "Productivity" },
  { id: "automation",       label: "Automation" },
  { id: "courses",          label: "Courses" },
] as const;

const SORTS = [
  { value: "popular",    label: "Most popular" },
  { value: "price-asc",  label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name",       label: "Name A → Z" },
] as const;

type SortKey = (typeof SORTS)[number]["value"];

export default function ShopClient({ products: PRODUCTS }: { products: Product[] }) {
  const PRICE_BOUNDS = useMemo(() => {
    if (PRODUCTS.length === 0) return { min: 0, max: 100 };
    const prices = PRODUCTS.map((p) => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [PRODUCTS]);

  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>("popular");
  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState(PRICE_BOUNDS.max);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { currency, usdToPkr, ready: fxReady } = useFx();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

  const fmtFilterPrice = (pkr: number) => formatPriceFromPKR(pkr, currency, usdToPkr, fxReady);
  const fmtPriceLabel = (pkr: number) => formatPriceFromPKR(pkr, currency, usdToPkr, fxReady) + " / mo";

  const items = useMemo(() => {
    let list = PRODUCTS.slice();
    if (selectedCats.size > 0) list = list.filter((p) => selectedCats.has(p.category));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.tag.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    list = list.filter((p) => p.price <= maxPrice);
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    return list;
  }, [selectedCats, sort, search, maxPrice]);

  const activeFilterCount =
    selectedCats.size +
    (maxPrice < PRICE_BOUNDS.max ? 1 : 0) +
    (search ? 1 : 0);

  const toggleCat = (id: string) => {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const reset = () => {
    setSelectedCats(new Set());
    setSearch("");
    setMaxPrice(PRICE_BOUNDS.max);
    setSort("popular");
  };

  /* ─── Desktop filter sidebar (unchanged styling for ≥1024px) ──────────── */
  const DesktopFilterPanel = (
    <aside className="surface-card shop-filters-card">
      <div className="shop-filter-head">
        <h3>Filters</h3>
        {activeFilterCount > 0 && (
          <button type="button" className="shop-reset" onClick={reset}>
            Reset <span>({activeFilterCount})</span>
          </button>
        )}
      </div>

      <div className="shop-filter-block">
        <label className="field-label">Categories</label>
        <div className="shop-filter-checks">
          {CATEGORIES.map((c) => (
            <label key={c.id} className={`shop-check ${selectedCats.has(c.id) ? "is-on" : ""}`}>
              <input type="checkbox" checked={selectedCats.has(c.id)} onChange={() => toggleCat(c.id)} />
              <span className="shop-check-box"><i className="fa-solid fa-check"></i></span>
              <span>{c.label}</span>
              <small>{PRODUCTS.filter((p) => p.category === c.id).length}</small>
            </label>
          ))}
        </div>
      </div>

      <div className="shop-filter-block">
        <label className="field-label">Max price: <strong style={{ color: "var(--text)" }}>{fmtFilterPrice(maxPrice)}</strong></label>
        <input
          type="range"
          min={PRICE_BOUNDS.min}
          max={PRICE_BOUNDS.max}
          step={1}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="shop-range"
        />
        <div className="shop-range-bounds">
          <span>{fmtFilterPrice(PRICE_BOUNDS.min)}</span>
          <span>{fmtFilterPrice(PRICE_BOUNDS.max)}</span>
        </div>
      </div>

      <div className="shop-filter-block">
        <label className="field-label">Sort by</label>
        <Select
          value={sort}
          onChange={(v) => setSort(v as SortKey)}
          options={SORTS as unknown as { value: SortKey; label: string }[]}
          ariaLabel="Sort"
        />
      </div>
    </aside>
  );

  return (
    <>
      {/* ───────────────────────────────────────────────────────────────
       *  MOBILE SHOP  (md:hidden) — matches home page hero language:
       *  ambient brand glow, trust pill, large gradient-accented headline,
       *  full-bleed sticky search/filter, premium chip rail.
       * ─────────────────────────────────────────────────────────────── */}
      <section className="md:hidden relative overflow-hidden bg-ink-1000">
        {/* Ambient brand glow — matches home hero */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-20 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="absolute top-40 -left-24 h-64 w-64 rounded-full bg-accent-500/12 blur-3xl" />
        </div>

        {/* Hero — visually consistent with the home page mobile hero */}
        <div className="relative px-5 pt-7 pb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/12 ring-1 ring-brand-500/25 px-3 py-1.5 text-[12px] font-medium text-brand-300">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 7h18M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7M9 7V5a3 3 0 0 1 6 0v2"/>
            </svg>
            {PRODUCTS.length}+ premium AI tools in stock
          </span>

          <h1 className="mt-5 font-heading font-bold text-[clamp(1.875rem,7.6vw,2.5rem)] leading-[1.08] tracking-tight text-ink-50 wrap-anywhere">
            Every AI tool,<br />
            <span className="text-brand-500">one cart.</span>
          </h1>

          <p className="mt-5 text-[15px] leading-relaxed text-ink-200">
            <strong className="text-ink-50 font-semibold">Subscriptions, courses & automation packs</strong>
            {" "}— search, filter, and add to cart in seconds. Activated to your inbox in under 30 minutes.
          </p>

          {/* Trust chips — horizontal scroll, matches home hero */}
          <div className="mt-5 -mx-5 overflow-x-auto hide-scrollbar">
            <div className="flex gap-2 px-5 pb-1 whitespace-nowrap">
              {[
                { i: "M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z", t: "Secure checkout" },
                { i: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",  t: "Activated < 30 min" },
                { i: "M21 12a8 8 0 0 1-11.6 7.1L4 20l.9-5.4A8 8 0 1 1 21 12Z", t: "WhatsApp support" },
              ].map((chip) => (
                <span key={chip.t} className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] ring-1 ring-white/10 px-3 py-2 text-[12px] text-ink-200">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-accent-500">
                    <path d={chip.i}/>
                  </svg>
                  {chip.t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky search + filter — sits under the fixed site header.
            Background tinted with a faint brand wash to feel "alive". */}
        <div
          className="sticky z-40 bg-ink-1000/95 backdrop-blur-xl border-y border-white/8"
          style={{ top: 60 }}
        >
          <div className="px-5 pt-3 pb-2 flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
                </svg>
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tools, courses…"
                className="
                  w-full h-12 pl-10 pr-10
                  rounded-md
                  bg-white/[0.04] border border-white/10
                  text-[15px] text-ink-50 placeholder:text-ink-400
                  focus:outline-none focus:border-brand-500 focus:bg-white/[0.06]
                  transition-colors
                "
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-full bg-white/5 text-ink-200 active:bg-white/10 appearance-none border-0 cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
              className="
                relative inline-flex items-center justify-center
                h-12 w-12 shrink-0
                appearance-none cursor-pointer
                rounded-md
                bg-white/[0.04] border border-white/10
                text-ink-50 active:bg-white/10 transition-colors
              "
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h12M18 7h2M4 12h2M8 12h12M4 17h12M18 17h2"/>
                <circle cx="17" cy="7" r="1.5"/><circle cx="7" cy="12" r="1.5"/><circle cx="17" cy="17" r="1.5"/>
              </svg>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-brand-500 text-white text-[10px] font-semibold leading-4.5 text-center ring-2 ring-ink-1000">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Category chip rail */}
          <div className="overflow-x-auto hide-scrollbar px-5 pb-3 pt-1">
            <div className="flex gap-2 whitespace-nowrap">
              <button
                type="button"
                onClick={() => setSelectedCats(new Set())}
                className={`
                  inline-flex items-center h-9 px-4 rounded-full text-[13px] font-semibold
                  appearance-none border cursor-pointer transition-colors
                  ${selectedCats.size === 0
                    ? "bg-brand-500 border-brand-500 text-white shadow-[0_8px_24px_-10px_rgba(255,122,26,0.7)]"
                    : "bg-white/[0.04] border-white/10 text-ink-200 active:bg-white/10"}
                `}
              >
                All
              </button>
              {CATEGORIES.map((c) => {
                const active = selectedCats.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCat(c.id)}
                    className={`
                      inline-flex items-center h-9 px-4 rounded-full text-[13px] font-semibold
                      appearance-none border cursor-pointer transition-colors
                      ${active
                        ? "bg-brand-500 border-brand-500 text-white shadow-[0_8px_24px_-10px_rgba(255,122,26,0.7)]"
                        : "bg-white/[0.04] border-white/10 text-ink-200 active:bg-white/10"}
                    `}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Result summary + clear */}
        <div className="px-5 pt-4 pb-1 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-ink-400">
            <span className="text-ink-50">{items.length}</span> {items.length === 1 ? "result" : "results"}
          </p>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={reset}
              className="appearance-none bg-transparent border-0 cursor-pointer text-[13px] font-semibold text-brand-500 active:opacity-70"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Product grid */}
        {items.length === 0 ? (
          <div className="px-5 py-10">
            <div className="rounded-md ring-1 ring-white/10 bg-white/[0.02] p-8 text-center">
              <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-white/5 grid place-items-center text-ink-400">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
                </svg>
              </div>
              <h3 className="text-[16px] font-semibold text-ink-50">No matches</h3>
              <p className="mt-1 text-[14px] text-ink-200">Try fewer filters or a different search.</p>
              <button
                type="button"
                onClick={reset}
                className="mt-4 inline-flex items-center justify-center h-11 px-5 rounded-md bg-brand-500 active:bg-brand-700 text-white font-semibold text-[14px] appearance-none cursor-pointer border-0 shadow-[0_8px_24px_-10px_rgba(255,122,26,0.7)]"
              >
                Reset filters
              </button>
            </div>
          </div>
        ) : (
          <div className="relative px-5 pt-3 pb-8 grid grid-cols-2 gap-3">
            {items.map((p) => (
              <MobileHeroProductCard
                key={p.id}
                product={p}
                priceLabel={fmtPriceLabel(p.price)}
              />
            ))}
          </div>
        )}

        {/* ─── Filter bottom sheet ─── */}
        {mounted && createPortal(
          <FilterSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            categories={CATEGORIES}
            selectedCats={selectedCats}
            toggleCat={toggleCat}
            sort={sort}
            setSort={setSort}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            priceBounds={PRICE_BOUNDS}
            counts={(id) => PRODUCTS.filter((p) => p.category === id).length}
            fmtFilterPrice={fmtFilterPrice}
            activeFilterCount={activeFilterCount}
            onReset={reset}
          />,
          document.body
        )}
      </section>

      {/* ───────────────────────────────────────────────────────────────
       *  DESKTOP SHOP  (hidden md:block) — keep the existing layout
       * ─────────────────────────────────────────────────────────────── */}
      <section className="hidden md:block shop-page">
        <div className="v2-container">
          <header className="shop-head">
            <p className="v2-eyebrow">Shop</p>
            <h1>Every AI tool, one cart</h1>
            <p>Filter by category, search by name, sort by price.</p>
          </header>

          <div className="shop-layout">
            <div className="shop-sidebar-desktop">{DesktopFilterPanel}</div>

            <div>
              <div className="shop-topbar">
                <div className="shop-search">
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <input
                    className="input"
                    placeholder="Search tools, courses, packs…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <span className="shop-count">{items.length} {items.length === 1 ? "result" : "results"}</span>
              </div>

              {items.length === 0 ? (
                <div className="surface-card">
                  <div className="empty-state">
                    <div className="empty-state-icon"><i className="fa-solid fa-magnifying-glass"></i></div>
                    <h3>No matches</h3>
                    <p>Try fewer filters or a different search.</p>
                    <button type="button" className="btn btn-outline" onClick={reset} style={{ marginTop: "var(--space-3)" }}>Reset filters</button>
                  </div>
                </div>
              ) : (
                <div className="shop-grid">
                  {items.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* -----------------------------------------------------------------------------
 * Filter bottom sheet (mobile only).
 * ---------------------------------------------------------------------------*/
function FilterSheet({
  open,
  onClose,
  categories,
  selectedCats,
  toggleCat,
  sort,
  setSort,
  maxPrice,
  setMaxPrice,
  priceBounds,
  counts,
  fmtFilterPrice,
  activeFilterCount,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  categories: readonly { id: string; label: string }[];
  selectedCats: Set<string>;
  toggleCat: (id: string) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  maxPrice: number;
  setMaxPrice: (n: number) => void;
  priceBounds: { min: number; max: number };
  counts: (id: string) => number;
  fmtFilterPrice: (n: number) => string;
  activeFilterCount: number;
  onReset: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm
          transition-opacity duration-200
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
        aria-hidden
      />
      {/* Sheet */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        aria-hidden={!open}
        className={`
          fixed inset-x-0 bottom-0 z-[81]
          max-h-[88vh]
          bg-ink-1000 text-ink-50
          rounded-t-xl
          border-t border-white/10
          shadow-2xl
          transition-transform duration-300 ease-out
          pb-[env(safe-area-inset-bottom)]
          flex flex-col
          ${open ? "translate-y-0" : "translate-y-full"}
        `}
      >
        {/* Grabber */}
        <div className="flex justify-center pt-3 pb-1.5 shrink-0">
          <span className="h-1 w-10 rounded-full bg-white/20" aria-hidden />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[17px] font-bold text-ink-50">Filters</h3>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-brand-500 text-white text-[11px] font-semibold">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="h-10 w-10 grid place-items-center rounded-full appearance-none bg-transparent border-0 cursor-pointer text-ink-50 active:bg-white/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Categories */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-ink-400 mb-3">Categories</p>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => {
                const active = selectedCats.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCat(c.id)}
                    className={`
                      flex items-center justify-between
                      px-3 py-2.5 rounded-md
                      appearance-none border cursor-pointer transition-colors text-left
                      ${active
                        ? "bg-brand-500/15 border-brand-500/50 text-brand-500"
                        : "bg-white/[0.03] border-white/10 text-ink-50 active:bg-white/[0.06]"}
                    `}
                  >
                    <span className="text-[14px] font-semibold">{c.label}</span>
                    <span className={`text-[11px] ${active ? "text-brand-500" : "text-ink-400"}`}>{counts(c.id)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Max price */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-ink-400">Max price</p>
              <p className="text-[14px] font-semibold text-ink-50">{fmtFilterPrice(maxPrice)}</p>
            </div>
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              step={1}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex items-center justify-between mt-1 text-[11px] text-ink-400">
              <span>{fmtFilterPrice(priceBounds.min)}</span>
              <span>{fmtFilterPrice(priceBounds.max)}</span>
            </div>
          </div>

          {/* Sort */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-ink-400 mb-3">Sort by</p>
            <div className="flex flex-col gap-2">
              {SORTS.map((s) => {
                const active = sort === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSort(s.value)}
                    className={`
                      flex items-center justify-between
                      px-4 py-3 rounded-md
                      appearance-none border cursor-pointer transition-colors text-left
                      ${active
                        ? "bg-brand-500/15 border-brand-500/50"
                        : "bg-white/[0.03] border-white/10 active:bg-white/[0.06]"}
                    `}
                  >
                    <span className={`text-[14px] font-semibold ${active ? "text-brand-500" : "text-ink-50"}`}>{s.label}</span>
                    {active && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
                        <path d="M5 12l5 5 9-11"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky footer with reset + apply */}
        <div className="px-5 pt-3 pb-4 border-t border-white/8 grid grid-cols-2 gap-3 shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="
              flex items-center justify-center h-12 rounded-md
              appearance-none bg-white/[0.04] border border-white/10 cursor-pointer
              text-ink-50 font-semibold text-[14px]
              active:bg-white/10
            "
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="
              flex items-center justify-center h-12 rounded-md
              appearance-none border-0 cursor-pointer
              bg-brand-500 active:bg-brand-700
              text-white font-semibold text-[14px]
              shadow-[0_8px_24px_-10px_rgba(255,122,26,0.7)]
            "
          >
            Show results
          </button>
        </div>
      </aside>
    </>
  );
}
