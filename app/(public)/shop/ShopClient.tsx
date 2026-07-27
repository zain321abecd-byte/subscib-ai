"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import ProductTile from "@/components/ProductTile";
import Select from "@/components/Select";
import type { Product } from "@/lib/products";

const CATEGORIES = [
  { id: "ai-subscriptions", label: "AI subscriptions" },
  { id: "design-tools",     label: "Design & image AI" },
  { id: "productivity",     label: "Productivity" },
  { id: "automation",       label: "Automation" },
  { id: "courses",          label: "Courses" },
] as const;

const SORTS = [
  { value: "popular",    label: "Popular" },
  { value: "name",       label: "Name A → Z" },
  { value: "price-asc",  label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

type SortKey = (typeof SORTS)[number]["value"];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
/** Categories shown before the "Show all" link appears. */
const CATEGORY_FOLD = 6;

export default function ShopClient({ products: PRODUCTS }: { products: Product[] }) {
  // Single-select category (radio list, like the reference) rather than the
  // previous multi-select checkboxes.
  const [category, setCategory] = useState<string>("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [letter, setLetter] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  // Seed the search box from the header search form (/shop?q=...).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSearch(q);
  }, []);
  useEffect(() => {
    document.body.style.overflow = sheetOpen || sortSheetOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen, sortSheetOpen]);

  const countFor = (id: string) => PRODUCTS.filter((p) => p.category === id).length;

  /** Letters that actually have products — the rest render disabled. */
  const activeLetters = useMemo(
    () => new Set(PRODUCTS.map((p) => p.name.trim().charAt(0).toUpperCase())),
    [PRODUCTS]
  );

  const visibleCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    const list = q ? CATEGORIES.filter((c) => c.label.toLowerCase().includes(q)) : [...CATEGORIES];
    return showAllCategories || q ? list : list.slice(0, CATEGORY_FOLD);
  }, [categoryQuery, showAllCategories]);

  const foldedCount = categoryQuery.trim() ? 0 : Math.max(0, CATEGORIES.length - CATEGORY_FOLD);

  const items = useMemo(() => {
    let list = PRODUCTS.slice();
    if (category) list = list.filter((p) => p.category === category);
    if (inStockOnly) list = list.filter((p) => p.inStock !== false);
    if (letter) list = list.filter((p) => p.name.trim().charAt(0).toUpperCase() === letter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.tag.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    return list;
  }, [PRODUCTS, category, inStockOnly, letter, search, sort]);

  const activeFilterCount =
    (category ? 1 : 0) + (inStockOnly ? 1 : 0) + (letter ? 1 : 0) + (search ? 1 : 0);

  const reset = () => {
    setCategory("");
    setCategoryQuery("");
    setInStockOnly(false);
    setLetter("");
    setSearch("");
    setSort("popular");
  };

  /* ─── Sidebar — rendered inline on desktop, inside the sheet on mobile.
   *   `variant` scopes the radio group name: radios sharing a name form ONE
   *   document-wide group, so two copies of this panel would fight over
   *   which input is checked. ─────────────────────────────────────────── */
  const filterPanel = (variant: "desktop" | "sheet") => (
    <div className="cat-filters">
      <section className="cat-filter-block">
        <h3 className="cat-filter-title">Categories</h3>
        <input
          type="search"
          className="cat-filter-search"
          placeholder="Search by category"
          value={categoryQuery}
          onChange={(e) => setCategoryQuery(e.target.value)}
          aria-label="Search by category"
        />

        <div className="cat-radio-list" role="radiogroup" aria-label="Category">
          <label className={`cat-radio ${category === "" ? "is-on" : ""}`}>
            <input
              type="radio"
              name={`shop-category-${variant}`}
              checked={category === ""}
              onChange={() => setCategory("")}
            />
            <span className="cat-radio-dot" aria-hidden />
            <span className="cat-radio-label">All categories</span>
            <small>{PRODUCTS.length}</small>
          </label>

          {visibleCategories.map((c) => (
            <label key={c.id} className={`cat-radio ${category === c.id ? "is-on" : ""}`}>
              <input
                type="radio"
                name={`shop-category-${variant}`}
                checked={category === c.id}
                onChange={() => setCategory(c.id)}
              />
              <span className="cat-radio-dot" aria-hidden />
              <span className="cat-radio-label">{c.label}</span>
              <small>{countFor(c.id)}</small>
            </label>
          ))}

          {visibleCategories.length === 0 && (
            <p className="cat-filter-empty">No category matches “{categoryQuery}”.</p>
          )}
        </div>

        {foldedCount > 0 && (
          <button
            type="button"
            className="cat-show-all"
            onClick={() => setShowAllCategories((v) => !v)}
          >
            {showAllCategories ? "Show less" : "Show all"}
          </button>
        )}
      </section>

      <section className="cat-filter-block">
        <label className="cat-toggle-row">
          <span className="cat-filter-title">In stock</span>
          <button
            type="button"
            role="switch"
            aria-checked={inStockOnly}
            aria-label="In stock only"
            className={`cat-switch ${inStockOnly ? "is-on" : ""}`}
            onClick={() => setInStockOnly((v) => !v)}
          >
            <span className="cat-switch-knob" aria-hidden />
          </button>
        </label>
      </section>

      <section className="cat-filter-block">
        <h3 className="cat-filter-title">Alphabetical index</h3>
        <div className="cat-alpha">
          <button
            type="button"
            className={`cat-alpha-btn cat-alpha-all ${letter === "" ? "is-on" : ""}`}
            onClick={() => setLetter("")}
            aria-label="All letters"
            title="All letters"
          >
            <i className="fa-solid fa-globe"></i>
          </button>
          {LETTERS.map((l) => {
            const has = activeLetters.has(l);
            return (
              <button
                key={l}
                type="button"
                className={`cat-alpha-btn ${letter === l ? "is-on" : ""}`}
                onClick={() => setLetter(letter === l ? "" : l)}
                disabled={!has}
                title={has ? `Products starting with ${l}` : `No products starting with ${l}`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </section>

      {activeFilterCount > 0 && (
        <button type="button" className="cat-reset" onClick={reset}>
          Reset filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <section className="cat-page">
      <div className="v2-container">
        {/* Breadcrumb + title */}
        <nav className="cat-crumbs" aria-label="Breadcrumb">
          <Link href="/"><i className="fa-solid fa-house"></i> Home</Link>
          <i className="fa-solid fa-chevron-right" aria-hidden></i>
          <span aria-current="page">Catalog</span>
        </nav>
        <h1 className="cat-title">All AI tools</h1>

        <div className="cat-layout">
          {/* Desktop sidebar */}
          <aside className="cat-sidebar">{filterPanel("desktop")}</aside>

          <div className="cat-main">
            {/* Result bar — count + sort, plus the mobile filter trigger */}
            <div className="cat-resultbar">
              <span className="cat-found">
                Products found: <strong>{items.length}</strong>
              </span>

              <div className="cat-resultbar-actions">
                {/* Mobile: compact icon triggers. Hidden on desktop, where the
                    sidebar and the sort dropdown are both already visible. */}
                <button
                  type="button"
                  className="cat-icon-btn"
                  onClick={() => setSheetOpen(true)}
                  aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
                >
                  <i className="fa-solid fa-sliders" aria-hidden></i>
                  {activeFilterCount > 0 && <span className="cat-filter-badge">{activeFilterCount}</span>}
                </button>
                <button
                  type="button"
                  className="cat-icon-btn"
                  onClick={() => setSortSheetOpen(true)}
                  aria-label={`Sort: ${SORTS.find((s) => s.value === sort)?.label}`}
                >
                  <i className="fa-solid fa-arrow-down-wide-short" aria-hidden></i>
                </button>

                <div className="cat-sort">
                  <i className="fa-solid fa-arrow-down-wide-short" aria-hidden></i>
                  <Select
                    value={sort}
                    onChange={(v) => setSort(v as SortKey)}
                    options={SORTS as unknown as { value: SortKey; label: string }[]}
                    ariaLabel="Sort"
                  />
                </div>
              </div>
            </div>

            {/* Product search */}
            <div className="cat-search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden></i>
              <input
                type="search"
                placeholder="Product search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Product search"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="cat-empty">
                <div className="cat-empty-icon"><i className="fa-solid fa-magnifying-glass"></i></div>
                <h3>No matches</h3>
                <p>Try fewer filters or a different search.</p>
                <button type="button" className="btn btn-outline" onClick={reset}>Reset filters</button>
              </div>
            ) : (
              <div className="cat-tile-grid">
                {items.map((p) => <ProductTile key={p.id} product={p} iconSize={64} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter sheet — same panel, different container. Hidden with
          `display: none` above 1024px so its copy of the panel stays out of
          the accessibility tree on desktop (a JS breakpoint listener can miss
          a resize and go stale; CSS cannot). */}
      {mounted && createPortal(
        <>
          <div
            className={`cat-sheet-backdrop ${sheetOpen ? "is-open" : ""}`}
            onClick={() => setSheetOpen(false)}
            aria-hidden
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            aria-hidden={!sheetOpen}
            className={`cat-sheet ${sheetOpen ? "is-open" : ""}`}
          >
            <div className="cat-sheet-grabber" aria-hidden><span /></div>
            <div className="cat-sheet-head">
              <h3>Filters</h3>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close filters">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="cat-sheet-body">{filterPanel("sheet")}</div>
            <div className="cat-sheet-foot">
              <button type="button" className="cat-sheet-reset" onClick={reset}>Reset</button>
              <button type="button" className="cat-sheet-apply" onClick={() => setSheetOpen(false)}>
                Show {items.length} {items.length === 1 ? "result" : "results"}
              </button>
            </div>
          </aside>

          {/* Sort sheet — the second icon in the result bar */}
          <div
            className={`cat-sheet-backdrop ${sortSheetOpen ? "is-open" : ""}`}
            onClick={() => setSortSheetOpen(false)}
            aria-hidden
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Sort"
            aria-hidden={!sortSheetOpen}
            className={`cat-sheet cat-sheet-compact ${sortSheetOpen ? "is-open" : ""}`}
          >
            <div className="cat-sheet-grabber" aria-hidden><span /></div>
            <div className="cat-sheet-head">
              <h3>Sort by</h3>
              <button type="button" onClick={() => setSortSheetOpen(false)} aria-label="Close sort">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="cat-sheet-body">
              <div className="cat-radio-list" role="radiogroup" aria-label="Sort by">
                {SORTS.map((s) => (
                  <label key={s.value} className={`cat-radio ${sort === s.value ? "is-on" : ""}`}>
                    <input
                      type="radio"
                      name="shop-sort-sheet"
                      checked={sort === s.value}
                      onChange={() => { setSort(s.value); setSortSheetOpen(false); }}
                    />
                    <span className="cat-radio-dot" aria-hidden />
                    <span className="cat-radio-label">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>
        </>,
        document.body
      )}
    </section>
  );
}
