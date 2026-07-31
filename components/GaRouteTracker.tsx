"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Sends a GA4 page_view on client-side route changes.
 *
 * gtag('config') fires a page_view only on a full document load. Next.js
 * navigations are soft (no reload), so without this every in-site journey
 * — home → product → cart → checkout — was recorded as a single page view
 * of the landing page, hiding the entire funnel.
 *
 * The first render is skipped because gtag('config') already counted it;
 * firing here too would double-count every landing.
 */
export default function GaRouteTracker({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window.gtag !== "function") return;

    const query = searchParams?.toString();
    const path = query ? `${pathname}?${query}` : pathname;

    window.gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
      send_to: measurementId,
    });
  }, [pathname, searchParams, measurementId]);

  return null;
}
