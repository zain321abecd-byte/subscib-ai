"use client";

import { useEffect, useRef, useState } from "react";

/** Collapsed height in px; content shorter than this renders untouched. */
const COLLAPSED_HEIGHT = 340;

/**
 * Collapses long product descriptions behind a gradient fade with a
 * "Read more" toggle, so the page stays scannable while the full text
 * remains one click away. Short descriptions render exactly as before.
 */
export default function DescriptionExpander({ children }: { children: React.ReactNode }) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [collapsible, setCollapsible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setCollapsible(el.scrollHeight > COLLAPSED_HEIGHT + 80);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const collapsed = collapsible && !expanded;

  return (
    <div className={`pl-desc-expander ${collapsed ? "is-collapsed" : ""}`}>
      <div
        className="pl-desc-expander-body"
        ref={innerRef}
        style={collapsed ? { maxHeight: COLLAPSED_HEIGHT } : undefined}
      >
        {children}
      </div>
      {collapsible && (
        <button
          type="button"
          className="pl-desc-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <>Show less <i className="fa-solid fa-chevron-up" aria-hidden="true"></i></>
          ) : (
            <>Read more <i className="fa-solid fa-chevron-down" aria-hidden="true"></i></>
          )}
        </button>
      )}
    </div>
  );
}
