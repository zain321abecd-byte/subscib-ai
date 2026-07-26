"use client";

/**
 * Modal shown when a shopper clicks "Read more" on a review card.
 * Cards clamp the text to a fixed number of lines so every card has
 * the same height; this modal is the escape hatch for long reviews.
 *
 * Rendered as a portal-style fixed overlay so it works from inside
 * carousels, grids, and the animated PremiumTestimonials — none of
 * which have room to expand a card inline.
 */
import { useEffect } from "react";

export type ReviewModalProps = {
  open: boolean;
  onClose: () => void;
  name: string;
  role?: string;
  product?: string;
  rating?: number;
  text: string;
  photoUrl?: string;
  initials?: string;
  color?: string;
};

function Stars({ rating = 5 }: { rating?: number }) {
  // Renders 5 stars total. Whole + half stars supported, defaults to 5.
  const clamped = Math.max(0, Math.min(5, rating));
  return (
    <div style={{ display: "inline-flex", gap: 2, color: "#4884FF", fontSize: 18, lineHeight: 1 }} aria-label={`${clamped} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => {
        if (clamped >= s) return <span key={s}>★</span>;
        if (clamped >= s - 0.5) return (
          <span key={s} style={{ position: "relative", display: "inline-block" }}>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>★</span>
            <span style={{ position: "absolute", inset: 0, overflow: "hidden", width: "50%", color: "#4884FF" }}>★</span>
          </span>
        );
        return <span key={s} style={{ color: "rgba(255,255,255,0.2)" }}>★</span>;
      })}
    </div>
  );
}

export default function ReviewFullModal({
  open, onClose, name, role, product, rating, text, photoUrl, initials, color,
}: ReviewModalProps) {
  // Lock body scroll + Escape-to-close while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)",
        display: "grid", placeItems: "center",
        padding: 20, zIndex: 200,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="admin-scroll"
        style={{
          background:
            "radial-gradient(circle at 74% 13%, rgba(255, 92, 35, 0.10), transparent 40%)," +
            " linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018)),#0b0d12",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 20,
          maxWidth: 560, width: "100%", maxHeight: "88vh",
          overflowY: "auto",
          padding: "26px 26px 22px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          color: "var(--text)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" width={56} height={56}
              style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 56, height: 56, borderRadius: 14, flexShrink: 0,
              background: color || "linear-gradient(135deg, #4884FF, #8FB4FF)",
              display: "grid", placeItems: "center",
              color: "#fff", fontWeight: 700, fontSize: 18,
            }}>
              {initials || name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{name}</div>
            {(role || product) && (
              <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 2 }}>
                {[role, product].filter(Boolean).join(" · ")}
              </div>
            )}
            <div style={{ marginTop: 4 }}><Stars rating={rating ?? 5} /></div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-muted)", cursor: "pointer",
              display: "grid", placeItems: "center", fontSize: 16,
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <p style={{
          margin: 0, color: "var(--text-soft)",
          fontSize: "1rem", lineHeight: 1.7,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {text}
        </p>
      </div>
    </div>
  );
}
