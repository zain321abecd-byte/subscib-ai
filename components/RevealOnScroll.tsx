"use client";

import { useEffect } from "react";

/**
 * Mounts an IntersectionObserver that adds `.is-visible` to anything with the
 * `.reveal` class as it scrolls into view. Mirrors the inline JS in the legacy
 * index.html. Drop one instance in app/layout.tsx and every page benefits.
 */
export default function RevealOnScroll() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });

    const observed = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll(".reveal").forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el);
          obs.observe(el);
        }
      });
    };
    scan();

    // Re-scan on route changes (Next App Router doesn't re-run useEffect deps for nav).
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      obs.disconnect();
    };
  }, []);
  return null;
}
