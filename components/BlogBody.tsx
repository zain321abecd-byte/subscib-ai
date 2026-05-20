"use client";

import { useEffect, useRef, useState } from "react";

const INITIAL_HEIGHT = 700;
const STEP = 1200;

export default function BlogBody({ children }: { children: React.ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState(INITIAL_HEIGHT);
  const [contentHeight, setContentHeight] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!innerRef.current) return;
    const measure = () => {
      if (innerRef.current) setContentHeight(innerRef.current.scrollHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, []);

  const overflowsInitial = contentHeight > INITIAL_HEIGHT + 16;
  const isTruncated = !expanded && contentHeight > maxHeight + 16;

  const onShowMore = () => {
    const next = maxHeight + STEP;
    if (next >= contentHeight) {
      setExpanded(true);
    } else {
      setMaxHeight(next);
    }
  };

  const onShowLess = () => {
    setExpanded(false);
    setMaxHeight(INITIAL_HEIGHT);
    requestAnimationFrame(() => {
      innerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="blog-post-body">
      <div
        ref={innerRef}
        className={`blog-post-body-inner ${isTruncated ? "is-truncated" : ""}`}
        style={isTruncated ? { maxHeight: `${maxHeight}px`, overflow: "hidden" } : undefined}
      >
        {children}
      </div>
      {isTruncated && (
        <button type="button" onClick={onShowMore} className="blog-show-more">
          Show more
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}
      {expanded && overflowsInitial && (
        <button type="button" onClick={onShowLess} className="blog-show-more">
          Show less
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(180deg)" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}
