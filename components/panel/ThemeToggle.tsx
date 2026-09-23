"use client";

import { useEffect, useState } from "react";

/**
 * Light/dark switch. The layout's inline script has already applied the stored
 * choice before paint; this only has to reflect and change it.
 */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("panel-theme", next ? "dark" : "light");
    } catch {
      // Private browsing — the choice just won't persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="panel-btn panel-btn-ghost !px-3 !py-2"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      // Rendered inert until mounted so the icon can't contradict the theme
      // the inline script already applied.
      suppressHydrationWarning
    >
      <span aria-hidden="true">{mounted ? (dark ? "☀" : "☾") : "☾"}</span>
    </button>
  );
}
