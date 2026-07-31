"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** Auto-hide in case a navigation stalls or was cancelled. */
const SAFETY_TIMEOUT_MS = 10000;

/**
 * Site-wide navigation feedback: whenever the user clicks a link (or the
 * page starts a full navigation), the brand favicon appears centered on a
 * dimmed backdrop with a spinning ring around it, and disappears as soon
 * as the new route has rendered.
 */
export default function RouteLoadingIndicator() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLoading(false), SAFETY_TIMEOUT_MS);
  };

  /* Route rendered — navigation is over. */
  useEffect(() => {
    setLoading(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      // Same-page hash jumps and clicks on the current URL don't navigate.
      if (url.pathname === location.pathname && url.search === location.search) return;
      show();
    };
    /* Full page loads (e.g. Buy now uses location.assign) — the browser is
       leaving this document, keep the ring up until the new page paints. */
    const onBeforeUnload = () => show();
    /* Restored from bfcache with the overlay up — hide it. */
    const onPageShow = () => setLoading(false);

    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pageshow", onPageShow);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="route-loading" role="status" aria-live="polite" aria-label="Loading page">
      <div className="route-loading-badge">
        <span className="route-loading-ring" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/favicon.png" alt="" width={44} height={44} draggable={false} />
      </div>
    </div>
  );
}
