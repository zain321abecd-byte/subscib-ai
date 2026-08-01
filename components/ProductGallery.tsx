"use client";

import { useEffect, useRef, useState } from "react";
import { imageRatioStyle } from "@/lib/image-ratio";

type Props = {
  images: string[];
  alt: string;
  /** Cross-fade interval. 0 disables auto-rotation. */
  autoMs?: number;
  /** "contain" shows the whole logo; "cover" (default) fills and crops. */
  imageFit?: "cover" | "contain";
  /** Crop ratio chosen in the admin; wins over imageFit when set. */
  imageRatio?: string;
};

// Animated product gallery with cross-fade transitions, dot navigation,
// keyboard arrow keys, and thumbnail strip below.
export default function ProductGallery({ images, alt, autoMs = 5000, imageFit = "contain", imageRatio }: Props) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const total = images.length;

  // Auto-rotate
  useEffect(() => {
    if (total <= 1 || paused || !autoMs) return;
    const t = window.setInterval(() => setActive((i) => (i + 1) % total), autoMs);
    return () => window.clearInterval(t);
  }, [total, paused, autoMs]);

  // Keyboard nav when the gallery is focused
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!ref.current?.contains(document.activeElement)) return;
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % total);
      if (e.key === "ArrowLeft")  setActive((i) => (i - 1 + total) % total);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  if (total === 0) return null;

  return (
    <div
      ref={ref}
      className="product-gallery"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label={`${alt} gallery`}
    >
      <div className="product-gallery-stage">
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src + i}
            src={src}
            alt={`${alt} — image ${i + 1} of ${total}`}
            className={`product-gallery-img ${i === active ? "is-active" : ""}`}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            /* A chosen ratio crops the image to that shape. Otherwise fall
               back to fit: .product-gallery-img hard-codes contain + padding,
               so "cover" must override both to actually fill the frame. */
            style={
              imageRatioStyle(imageRatio) ??
              (imageFit === "cover"
                ? { objectFit: "cover", padding: 0 }
                : { objectFit: "contain" })
            }
          />
        ))}

        {total > 1 && (
          <>
            <button
              type="button"
              className="product-gallery-arrow product-gallery-arrow-prev"
              onClick={() => setActive((i) => (i - 1 + total) % total)}
              aria-label="Previous image"
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button
              type="button"
              className="product-gallery-arrow product-gallery-arrow-next"
              onClick={() => setActive((i) => (i + 1) % total)}
              aria-label="Next image"
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>

            <div className="product-gallery-dots" role="tablist">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  className={`product-gallery-dot ${i === active ? "is-active" : ""}`}
                  onClick={() => setActive(i)}
                  aria-label={`Go to image ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="product-gallery-thumbs">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              className={`product-gallery-thumb ${i === active ? "is-active" : ""}`}
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
