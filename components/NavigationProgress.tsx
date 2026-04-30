"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/**
 * Shows a top progress bar during Next.js client-side navigation.
 *
 * Why this exists: <Link>-based navigation in App Router triggers async route
 * loading (RSC payloads, server components rendering, etc.). Without feedback,
 * users perceive the brief delay as the page "hanging." This bar:
 *   1. Starts ticking when the user clicks an internal link
 *   2. Fills to 100% and fades out when the new pathname renders
 *
 * Wrapped in Suspense because useSearchParams requires it (Next.js 15).
 */

function ProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const tickRef = useRef<number | null>(null);
  const firstRender = useRef(true);

  // Click interceptor — start the bar on internal link clicks
  useEffect(() => {
    function start() {
      setVisible(true);
      setWidth(8);
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = window.setInterval(() => {
        setWidth((w) => Math.min(w + Math.random() * 9 + 2, 82));
      }, 130);
    }

    function onClick(e: MouseEvent) {
      // Ignore modifier-key clicks (open in new tab, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      const target = e.target as HTMLElement | null;
      const link = target?.closest("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#")) return;
      if (link.target === "_blank") return;
      if (link.hasAttribute("download")) return;

      // External links — let the browser handle them; no bar
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        // Same path + same hash = no navigation
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      } catch {
        return;
      }

      start();
    }

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  // Pathname/searchParams changed → finish the bar
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setWidth(100);
    const hideTimer = window.setTimeout(() => setVisible(false), 280);
    const resetTimer = window.setTimeout(() => setWidth(0), 600);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(resetTimer);
    };
  }, [pathname, searchParams]);

  if (!visible && width === 0) return null;

  return (
    <div
      className="page-progress"
      style={{
        width: `${width}%`,
        opacity: visible ? 1 : 0,
        transition: visible
          ? "width 240ms cubic-bezier(0.4, 0, 0.2, 1)"
          : "width 240ms cubic-bezier(0.4, 0, 0.2, 1), opacity 320ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      aria-hidden
    />
  );
}

export default function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <ProgressInner />
    </Suspense>
  );
}
