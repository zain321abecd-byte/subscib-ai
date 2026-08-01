"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ProductTile from "@/components/ProductTile";
import type { Product } from "@/lib/products";

/**
 * Horizontally scrollable product rail, two rows deep.
 *
 * The CSS lays items out with `grid-auto-flow: column` over two rows, so each
 * column holds two products and six columns are visible at a time. Anything
 * beyond that scrolls sideways instead of pushing the page taller.
 *
 * The arrows page by exactly one viewport width and disable at either end, so
 * the control never suggests a scroll that will not happen. The header lives
 * here rather than in the page so the buttons can share the scroll state.
 */
export default function ProductRail({
  products,
  title,
  allHref,
}: {
  products: Product[];
  title: string;
  /** Optional "All" link rendered beside the arrows. */
  allHref?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    // 1px slack: fractional column widths stop scrollLeft reaching the exact max.
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync, products.length]);

  function page(direction: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  }

  return (
    <>
      <header className="pl-section-head">
        <h2>{title}</h2>
        <div className="pl-section-head-actions">
          <div className="pl-rail-nav" role="group" aria-label={`Scroll ${title} products`}>
            <button
              type="button"
              className="pl-rail-btn"
              onClick={() => page(-1)}
              disabled={atStart}
              aria-label="Scroll to previous products"
            >
              <i className="fa-solid fa-chevron-left" aria-hidden />
            </button>
            <button
              type="button"
              className="pl-rail-btn"
              onClick={() => page(1)}
              disabled={atEnd}
              aria-label="Scroll to more products"
            >
              <i className="fa-solid fa-chevron-right" aria-hidden />
            </button>
          </div>
          {allHref && <Link className="pl-all-btn" href={allHref}>All</Link>}
        </div>
      </header>

      <div className="pl-rail" ref={scroller}>
        {products.map((p) => (
          <ProductTile key={p.id} product={p} />
        ))}
      </div>
    </>
  );
}
