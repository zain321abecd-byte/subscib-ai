"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReviewFullModal from "./ReviewFullModal";

/** Above this length, the review card is clamped and "Read more" opens the modal. */
const READ_MORE_THRESHOLD = 160;

/** Max pagination dots shown at once; the window slides with the current page. */
const MAX_DOTS = 7;

/* ─────────────────────────────────────────────────────────────────────────────
   TESTIMONIAL DATA
   ─ rating: 1–5, supports 0.5 steps.
   ─ slides prop: review rows passed from the server/admin database.
───────────────────────────────────────────────────────────────────────────── */
export type Testimonial = {
  id: number;
  name: string;
  role: string;
  rating: number;
  text: string;
  mainImage?: string;
  mainInitials?: string;
  mainBg?: string;
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/** First letters of the first and last name ("Hamza Siddiqui" → "HS"). */
function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StarRating({ rating, size = "text-lg" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-px" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => {
        if (rating >= s) return <span key={s} className={`text-[#4884FF] ${size} select-none leading-none`}>★</span>;
        if (rating >= s - 0.5) return (
          <span key={s} className={`relative inline-block ${size} select-none leading-none`}>
            <span className="text-gray-600">★</span>
            <span className="absolute inset-0 overflow-hidden text-[#4884FF]" style={{ width: "50%" }} aria-hidden="true">★</span>
          </span>
        );
        return <span key={s} className={`text-gray-600 ${size} select-none leading-none`}>★</span>;
      })}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function PremiumTestimonials({ slides = [] }: { slides?: Testimonial[] }) {
  if (slides.length === 0) return null;

  return <PremiumTestimonialsContent data={slides} />;
}

function PremiumTestimonialsContent({ data }: { data: Testimonial[] }) {
  const [page, setPage] = useState(0);
  const [visible, setVisible] = useState(true);
  const [pageSize, setPageSize] = useState(3);
  const [openReview, setOpenReview] = useState<Testimonial | null>(null);

  const busyRef  = useRef(false);
  const pageRef  = useRef(0);
  const pausedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* One card per page on phones, three on md+ screens. */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setPageSize(mq.matches ? 3 : 1);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const pageCount = Math.max(1, Math.ceil(data.length / pageSize));

  /* Keep the page in range when the page size flips (e.g. rotate). */
  useEffect(() => {
    if (pageRef.current > pageCount - 1) {
      pageRef.current = pageCount - 1;
      setPage(pageCount - 1);
    }
  }, [pageCount]);

  const transition = useCallback((nextPage: number) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setVisible(false);
    timerRef.current = setTimeout(() => {
      setPage(nextPage);
      pageRef.current = nextPage;
      setVisible(true);
      busyRef.current = false;
    }, 280);
  }, []);

  const goNext = useCallback(
    () => transition((pageRef.current + 1) % pageCount),
    [transition, pageCount]
  );
  const goPrev = useCallback(
    () => transition((pageRef.current - 1 + pageCount) % pageCount),
    [transition, pageCount]
  );
  const goTo = useCallback((i: number) => transition(i), [transition]);

  /* Autoplay, paused while the pointer is over the cards or a modal is open. */
  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) goNext();
    }, 6000);
    return () => clearInterval(id);
  }, [goNext]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  useEffect(() => { pausedRef.current = openReview != null; }, [openReview]);

  const shown = data.slice(page * pageSize, page * pageSize + pageSize);

  const average = data.reduce((sum, r) => sum + (r.rating ?? 5), 0) / data.length;
  const averageLabel = (Math.round(average * 10) / 10).toFixed(1);

  /* Windowed dot indices over pages (same sliding-window idea as before). */
  const windowStart = Math.max(
    0,
    Math.min(page - Math.floor(MAX_DOTS / 2), pageCount - MAX_DOTS)
  );
  const dotWindow = Array.from(
    { length: Math.min(MAX_DOTS, pageCount) },
    (_, k) => windowStart + k
  );
  const isEdgeDot = (i: number) => {
    if (pageCount <= MAX_DOTS) return false;
    if (i === windowStart && windowStart > 0) return true;
    return i === windowStart + MAX_DOTS - 1 && windowStart + MAX_DOTS < pageCount;
  };

  const cardsAnim: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0px)" : "translateY(10px)",
    transition: "opacity 0.28s ease, transform 0.28s ease",
  };

  return (
    <section className="relative bg-[#0B1019] overflow-hidden py-14 sm:py-16 md:py-20">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[#4884FF]/5 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 lg:px-12">

        {/* ── Header: what this section is + at-a-glance trust summary ── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <p className="text-[#4884FF] text-xs font-bold uppercase tracking-[0.18em] mb-2">Customer Reviews</p>
            <h2 className="text-white font-bold text-2xl sm:text-3xl md:text-4xl leading-tight">
              What our customers say
            </h2>
            <p className="text-gray-400 mt-2 text-sm sm:text-base max-w-xl">
              Real feedback from people who bought subscriptions on SubscribAI.
            </p>
          </div>

          {/* Average rating summary */}
          <div className="flex items-center gap-4 bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 self-start md:self-auto">
            <span className="text-white font-bold text-4xl leading-none tabular-nums">{averageLabel}</span>
            <div>
              <StarRating rating={average} size="text-xl" />
              <p className="text-gray-400 text-xs mt-1.5">
                Based on <span className="text-white font-semibold">{data.length}</span> reviews
              </p>
            </div>
          </div>
        </div>

        {/* ── Review cards ── */}
        <div
          style={cardsAnim}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5"
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { if (!openReview) pausedRef.current = false; }}
        >
          {shown.map((r) => {
            const clamped = r.text.length > READ_MORE_THRESHOLD;
            return (
              <article
                key={r.id}
                className="flex flex-col bg-white/[0.04] border border-white/10 rounded-2xl p-5 sm:p-6 transition-colors duration-200 hover:border-[#4884FF]/45"
              >
                {/* Who */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 border border-[#4884FF]/40"
                    style={{ background: r.mainBg ?? "#374151" }}
                    aria-hidden="true"
                  >
                    <span className="text-white font-bold text-sm select-none">{nameInitials(r.name)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{r.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5 truncate">
                      Purchased: <span className="text-[#4884FF] font-medium">{r.role}</span>
                    </p>
                  </div>
                </div>

                {/* Rating */}
                <div className="mt-3">
                  <StarRating rating={r.rating} />
                </div>

                {/* What they said */}
                <p
                  className="text-gray-200 text-sm leading-relaxed mt-3 flex-1"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 5,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  &ldquo;{r.text}&rdquo;
                </p>

                {clamped && (
                  <button
                    type="button"
                    onClick={() => setOpenReview(r)}
                    className="mt-3 self-start text-[#4884FF] hover:text-[#6B9CFF] font-semibold text-xs inline-flex items-center gap-1.5 transition-colors"
                  >
                    Read full review <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" />
                  </button>
                )}
              </article>
            );
          })}
        </div>

        {/* ── Navigation ── */}
        <div className="flex items-center justify-between mt-8">

          {/* Dot indicators (windowed) + page counter */}
          <div className="flex items-center gap-3" aria-label="Review page indicators">
            <div className="flex items-center gap-2">
              {dotWindow.map((i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to review page ${i + 1}`}
                  aria-current={i === page ? "true" : undefined}
                  style={{ appearance: "none", WebkitAppearance: "none" }}
                  className={`border-0 p-0 cursor-pointer rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4884FF] ${
                    i === page
                      ? "w-5 h-2 bg-[#4884FF]"
                      : isEdgeDot(i)
                      ? "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
                      : "w-2 h-2 bg-white/25 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
            {pageCount > MAX_DOTS && (
              <span className="text-gray-500 text-xs font-medium tabular-nums select-none">
                {page + 1} / {pageCount}
              </span>
            )}
          </div>

          {/* Prev / Next arrow buttons */}
          <div className="flex gap-3">
            <button
              onClick={goPrev}
              aria-label="Previous reviews"
              className="w-11 h-11 rounded-xl bg-white/5 border border-white/20 text-white flex items-center justify-center text-lg hover:bg-[#4884FF] hover:border-[#4884FF] active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4884FF]"
            >
              &#8592;
            </button>
            <button
              onClick={goNext}
              aria-label="Next reviews"
              className="w-11 h-11 rounded-xl bg-[#4884FF] border border-[#4884FF] text-white flex items-center justify-center text-lg hover:bg-[#6B9CFF] hover:border-[#6B9CFF] active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4884FF]"
            >
              &#8594;
            </button>
          </div>
        </div>
      </div>

      <ReviewFullModal
        open={openReview != null}
        onClose={() => setOpenReview(null)}
        name={openReview?.name ?? ""}
        role={openReview?.role ?? ""}
        rating={openReview?.rating ?? 5}
        text={openReview?.text ?? ""}
        photoUrl={openReview?.mainImage}
        initials={openReview?.mainInitials}
        color={openReview?.mainBg}
      />
    </section>
  );
}
