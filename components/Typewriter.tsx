"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Typewriter with no layout shift and smooth phrase transitions.
 *
 * Layout-stability: the component renders the longest phrase invisibly (the
 * "ghost") to reserve max width/height. The active text overlays absolutely
 * on top, so the parent line-box never resizes during animation.
 *
 * Smoothness:
 *   - Types forward with per-character jitter (±15ms) so it feels human
 *   - Brief beat after punctuation (.,!?)
 *   - On phrase end: fades out the whole phrase (300ms), swaps, fades in
 *     and types the next one — no character-by-character deletion
 *   - Caret fades softly via opacity (no hard step blink)
 *
 * Gradient: the gradient styles are applied INSIDE this component (on
 * .tw-active and .tw-ghost) — wrapping the component in another
 * `.v2-text-gradient` parent would break the gradient on the absolutely
 * positioned active text.
 */
export default function Typewriter({
  phrases,
  className,
  typingMs = 60,
  holdMs = 1800,
  fadeMs = 320,
}: {
  phrases: string[];
  className?: string;
  typingMs?: number;
  holdMs?: number;
  fadeMs?: number;
}) {
  const longest = useMemo(
    () => phrases.reduce((a, b) => (b.length > a.length ? b : a), ""),
    [phrases],
  );
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"type" | "hold" | "fade-out">("type");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setText(phrases[0]);
      return;
    }
    const current = phrases[phraseIdx % phrases.length];
    let timer: number;
    const jitter = (base: number) => base + (Math.random() * 30 - 15);

    if (phase === "type") {
      if (text.length < current.length) {
        const lastChar = current[text.length - 1] || "";
        const delay = /[.,!?]/.test(lastChar) ? jitter(typingMs) + 140 : jitter(typingMs);
        timer = window.setTimeout(() => setText(current.slice(0, text.length + 1)), delay);
      } else {
        timer = window.setTimeout(() => setPhase("hold"), 60);
      }
    } else if (phase === "hold") {
      timer = window.setTimeout(() => setPhase("fade-out"), holdMs);
    } else if (phase === "fade-out") {
      // Wait for CSS opacity transition to finish, then swap to next phrase.
      timer = window.setTimeout(() => {
        setText("");
        setPhraseIdx((i) => (i + 1) % phrases.length);
        setPhase("type");
      }, fadeMs);
    }
    return () => window.clearTimeout(timer);
  }, [text, phase, phraseIdx, phrases, typingMs, holdMs, fadeMs]);

  return (
    <span className={`tw-wrap ${className || ""}`}>
      {/* Ghost reserves max width/height; never visible. */}
      <span className="tw-ghost" aria-hidden>{longest}</span>
      <span
        className={`tw-active ${phase === "fade-out" ? "is-fading" : ""}`}
        style={{ transitionDuration: `${fadeMs}ms` }}
        aria-live="polite"
      >
        {text}
        <span className="typewriter-caret" aria-hidden>|</span>
      </span>
    </span>
  );
}
