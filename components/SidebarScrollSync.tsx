"use client";

import { useEffect } from "react";

const HEADER_OFFSET = 92; // sticky header clearance, matches .pl-pd-side top
const BOTTOM_GAP = 16;

/**
 * Renders nothing; adjusts the product page sidebar's sticky `top` so a
 * panel taller than the viewport scrolls with the page and sticks once its
 * bottom is visible, instead of trapping the rest behind an inner scrollbar.
 */
export default function SidebarScrollSync() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".pl-pd-side");
    if (!el) return;

    const apply = () => {
      // Mobile/tablet layouts aren't sticky — leave the stylesheet in charge.
      if (window.innerWidth < 1024) {
        el.style.top = "";
        return;
      }
      const overflow = el.offsetHeight + HEADER_OFFSET + BOTTOM_GAP - window.innerHeight;
      el.style.top = overflow > 0 ? `${HEADER_OFFSET - overflow}px` : "";
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  return null;
}
