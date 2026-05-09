"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import Select from "@/components/Select";
import { useFx, formatPriceFromPKR } from "@/lib/fx";
import type { Product } from "@/lib/products";

const CATEGORIES = [
  { id: "ai-subscriptions", label: "AI Subscriptions" },
  { id: "design-tools", label: "Design & Image" },
  { id: "productivity", label: "Productivity" },
  { id: "automation", label: "Automation" },
  { id: "courses", label: "Courses" },
] as const;

const SORTS = [
  { value: "popular", label: "Most popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name A → Z" },
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { currency, usdToPkr, ready: fxReady } = useFx();
  // The slider holds raw PKR (the canonical product price). Show the visitor
  // their preferred currency in the label / bounds so the filter feels native.
  const fmtFilterPrice = (pkr: number) => formatPriceFromPKR(pkr, currency, usdToPkr, fxReady);

  const items = useMemo(() => {
    let list = PRODUCTS.slice();
    if (selectedCats.size > 0) list = list.filter((p) => selectedCats.has(p.category));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.tag.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    list = list.filter((p) => p.price <= maxPrice);
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    return list;
  }, [selectedCats, sort, search, maxPrice]);

  const activeFilterCount = selectedCats.size + (maxPrice < PRICE_BOUNDS.max ? 1 : 0) + (search ? 1 : 0);

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

  const FilterPanel = (
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
    <section className="shop-page">
      <div className="v2-container">
        <header className="shop-head">
          <p className="v2-eyebrow">Shop</p>
          <h1>Every AI tool, one cart</h1>
          <p>Filter by category, search by name, sort by price.</p>
        </header>

        <div className="shop-layout">
          {/* Sidebar — desktop */}
          <div className="shop-sidebar-desktop">{FilterPanel}</div>

          {/* Main grid area */}
          <div>
            {/* Top bar with search + mobile filter trigger */}
            <div className="shop-topbar">
              <div className="shop-search">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input className="input" placeholder="Search tools, courses, packs…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <button type="button" className="btn btn-outline shop-filters-toggle" onClick={() => setFiltersOpen((o) => !o)}>
                <i className="fa-solid fa-sliders"></i> Filters {activeFilterCount > 0 && <span className="shop-filter-badge">{activeFilterCount}</span>}
              </button>
              <span className="shop-count">{items.length} {items.length === 1 ? "result" : "results"}</span>
            </div>

            {/* Sidebar — mobile (slides down) */}
            {filtersOpen && <div className="shop-sidebar-mobile">{FilterPanel}</div>}

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="shop-active-chips">
                {[...selectedCats].map((id) => {
                  const cat = CATEGORIES.find((c) => c.id === id);
                  return (
                    <span key={id} className="shop-chip">
                      {cat?.label}
                      <button type="button" onClick={() => toggleCat(id)} aria-label={`Remove ${cat?.label}`}>
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </span>
                  );
                })}
                {maxPrice < PRICE_BOUNDS.max && (
                  <span className="shop-chip">
                    Up to ${maxPrice}
                    <button type="button" onClick={() => setMaxPrice(PRICE_BOUNDS.max)} aria-label="Clear price filter">
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </span>
                )}
                {search && (
                  <span className="shop-chip">
                    “{search}”
                    <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </span>
                )}
              </div>
            )}

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
  );
}
