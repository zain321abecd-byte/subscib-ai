"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Animated top progress bar. Starts on a custom `admin-nav-start` event
// (dispatched by AdminShell when a sidebar link is clicked) so the user sees
// instant feedback. Fills out completely when pathname/search changes (i.e.
// the new route has actually mounted).
export default function AdminNavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(false);
  const trickleTimer = useRef<number | null>(null);

  function clearTrickle() {
    if (trickleTimer.current) {
      window.clearInterval(trickleTimer.current);
      trickleTimer.current = null;
    }
  }

  function start() {
    setActive(true);
    setWidth(15);
    // Trickle up to 80% slowly while the route is loading.
    clearTrickle();
    trickleTimer.current = window.setInterval(() => {
      setWidth((w) => (w < 80 ? w + Math.max(1, (80 - w) / 6) : w));
    }, 220);
  }

  function finish() {
    clearTrickle();
    setWidth(100);
    window.setTimeout(() => {
      setActive(false);
      setWidth(0);
    }, 220);
  }

  // Listen for click-triggered start.
  useEffect(() => {
    const onStart = () => start();
    window.addEventListener("admin-nav-start", onStart);
    return () => {
      window.removeEventListener("admin-nav-start", onStart);
      clearTrickle();
    };
  }, []);

  // Finish whenever the route actually changes (new pathname or search).
  // We skip the very first mount.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    finish();
  }, [pathname, search]);

  return (
    <div
      className={`admin-nav-progress ${active ? "is-active" : ""}`}
      style={{ width: `${width}%` }}
      aria-hidden
    />
  );
}
