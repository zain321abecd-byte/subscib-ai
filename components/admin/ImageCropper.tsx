"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseCrop, serializeCrop, type CropRect } from "@/lib/image-crop";

/** Editor viewport size in px. The window is square — same shape as the
 *  product containers on the storefront, so what you frame is what ships. */
const VIEW = 300;
const MAX_ZOOM = 4;

/**
 * Square crop editor for the product cover image.
 *
 * Drag the picture to choose which part shows; zoom in to fill the frame with
 * just the logo. The visible square is exactly the product container's shape,
 * so the preview is literally what buyers see on every card and tile.
 */
export default function ImageCropper({
  src,
  value,
  onChange,
}: {
  src: string;
  value: string;
  onChange: (crop: string) => void;
}) {
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  // Offset of the image's top-left corner relative to the viewport, in px.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const hydrated = useRef(false);

  /** Scale that makes the image just cover the square viewport. */
  const baseScale = nat ? Math.max(VIEW / nat.w, VIEW / nat.h) : 1;
  const scale = baseScale * zoom;
  const dispW = nat ? nat.w * scale : 0;
  const dispH = nat ? nat.h * scale : 0;

  /** Keep the image covering the viewport — no empty gaps at the edges. */
  const clamp = useCallback(
    (o: { x: number; y: number }) => ({
      x: Math.min(0, Math.max(VIEW - dispW, o.x)),
      y: Math.min(0, Math.max(VIEW - dispH, o.y)),
    }),
    [dispW, dispH],
  );

  /* Load natural size, then restore a saved crop (or centre the image). */
  useEffect(() => {
    if (!src) return;
    hydrated.current = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setNat({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);

  useEffect(() => {
    if (!nat || hydrated.current) return;
    hydrated.current = true;
    const saved = parseCrop(value);
    if (saved && saved.w > 0) {
      const z = Math.min(MAX_ZOOM, Math.max(1, VIEW / (saved.w * baseScale)));
      const s = baseScale * z;
      setZoom(z);
      setOffset({ x: -saved.x * s, y: -saved.y * s });
    } else {
      setZoom(1);
      setOffset({ x: (VIEW - nat.w * baseScale) / 2, y: (VIEW - nat.h * baseScale) / 2 });
    }
  }, [nat, value, baseScale]);

  /* Publish the crop rect (in source pixels) whenever the framing changes. */
  useEffect(() => {
    if (!nat || !hydrated.current) return;
    const rect: CropRect = {
      x: -offset.x / scale,
      y: -offset.y / scale,
      w: VIEW / scale,
      h: VIEW / scale,
    };
    // Never let rounding push the window past the image edges.
    rect.x = Math.max(0, Math.min(rect.x, nat.w - rect.w));
    rect.y = Math.max(0, Math.min(rect.y, nat.h - rect.h));
    const next = serializeCrop(rect);
    if (next !== value) onChange(next);
    // `value`/`onChange` intentionally excluded: including them re-runs this
    // effect from its own update and loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset.x, offset.y, scale, nat]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setOffset(clamp({
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    }));
  }
  function onPointerUp() { drag.current = null; }

  function applyZoom(z: number) {
    if (!nat) return;
    const next = Math.min(MAX_ZOOM, Math.max(1, z));
    const s = baseScale * next;
    // Zoom about the centre of the frame so the subject stays put.
    const cx = (VIEW / 2 - offset.x) / scale;
    const cy = (VIEW / 2 - offset.y) / scale;
    setZoom(next);
    setOffset({
      x: Math.min(0, Math.max(VIEW - nat.w * s, VIEW / 2 - cx * s)),
      y: Math.min(0, Math.max(VIEW - nat.h * s, VIEW / 2 - cy * s)),
    });
  }

  function reset() {
    if (!nat) return;
    setZoom(1);
    setOffset({ x: (VIEW - nat.w * baseScale) / 2, y: (VIEW - nat.h * baseScale) / 2 });
  }

  if (!src) return null;

  return (
    <div className="admin-cropper">
      <div
        className="admin-cropper-view"
        style={{ width: VIEW, height: VIEW }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        role="application"
        aria-label="Drag to choose the visible part of the image"
      >
        {nat && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: offset.x,
              top: offset.y,
              width: dispW,
              height: dispH,
              maxWidth: "none",
              userSelect: "none",
            }}
          />
        )}
      </div>

      <div className="admin-cropper-controls">
        <label className="admin-cropper-zoom">
          <i className="fa-solid fa-magnifying-glass-minus" aria-hidden />
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => applyZoom(Number(e.target.value))}
            aria-label="Zoom"
          />
          <i className="fa-solid fa-magnifying-glass-plus" aria-hidden />
        </label>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={reset}>
          Reset
        </button>
      </div>
      <p className="admin-help" style={{ marginTop: 6 }}>
        Drag the image to reposition and zoom to frame the logo. This square is
        the exact shape used on the shop, homepage and product page.
      </p>
    </div>
  );
}
