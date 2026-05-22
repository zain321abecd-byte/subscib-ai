"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   TESTIMONIAL DATA
   ─ To replace content: edit name, role, text, rating below.
   ─ To replace images: set mainImage / leftImage / rightImage to paths under
     /public/ (e.g. "/images/t1-main.jpg"). When an image is absent the
     component renders a colour swatch with initials instead.
   ─ rating: supports half-steps (e.g. 4.5). Range 1–5.
───────────────────────────────────────────────────────────────────────────── */
type Testimonial = {
  id: number;
  name: string;
  role: string;
  rating: number;
  text: string;
  mainImage?: string;
  leftImage?: string;
  rightImage?: string;
  mainInitials?: string;
  leftInitials?: string;
  rightInitials?: string;
  mainBg?: string;
  leftBg?: string;
  rightBg?: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: "Hamza Ahmed",        // ← replace name
    role: "Freelancer",          // ← replace role
    rating: 4.5,                 // ← replace rating (1–5, supports 0.5 steps)
    text: "As a freelancer, I rely on tools and resources that save me time and money. SubscribAI keeps delivering exactly that, with new updates every time I visit. It's my top source for reliable and useful digital solutions.",
    mainImage: "/images/testimonials/t1-main.jpg",   // ← replace image paths
    leftImage: "/images/testimonials/t1-left.jpg",
    rightImage: "/images/testimonials/t1-right.jpg",
    mainInitials: "HA", mainBg: "#c2410c",
    leftInitials: "SA", leftBg: "#1e3a5f",
    rightInitials: "MR", rightBg: "#312e81",
  },
  {
    id: 2,
    name: "Sara Khan",
    role: "Content Creator",
    rating: 5,
    text: "The AI tools from SubscribAI completely transformed my content workflow. I save hours every week and my audience engagement has doubled since I started using these premium subscriptions.",
    mainImage: "/images/testimonials/t2-main.jpg",
    leftImage: "/images/testimonials/t2-left.jpg",
    rightImage: "/images/testimonials/t2-right.jpg",
    mainInitials: "SK", mainBg: "#166534",
    leftInitials: "AR", leftBg: "#7c3aed",
    rightInitials: "BT", rightBg: "#c2410c",
  },
  {
    id: 3,
    name: "Ali Raza",
    role: "Agency Owner",
    rating: 5,
    text: "I run a digital agency and SubscribAI is my go-to for premium AI tools. Reliable credentials, instant delivery, and support that actually responds. My team is impressed with every single order.",
    mainImage: "/images/testimonials/t3-main.jpg",
    leftImage: "/images/testimonials/t3-left.jpg",
    rightImage: "/images/testimonials/t3-right.jpg",
    mainInitials: "AR", mainBg: "#1e3a5f",
    leftInitials: "FM", leftBg: "#c2410c",
    rightInitials: "NZ", rightBg: "#166534",
  },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/** Inner content of every diamond — image or initials swatch. */
function DiamondContent({
  src,
  alt,
  initials,
  bg,
}: {
  src?: string;
  alt: string;
  initials?: string;
  bg?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover -rotate-45 scale-150"
        draggable={false}
      />
    );
  }
  return (
    <div
      className="w-full h-full flex items-center justify-center font-bold text-white"
      style={{ background: bg ?? "#374151" }}
    >
      <span className="-rotate-45 text-sm md:text-base select-none">{initials}</span>
    </div>
  );
}

/** 1–5 stars with half-star support. */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-px" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => {
        if (rating >= s) {
          return (
            <span key={s} className="text-orange-500 text-2xl md:text-3xl select-none leading-none">
              ★
            </span>
          );
        }
        if (rating >= s - 0.5) {
          return (
            <span key={s} className="relative inline-block text-2xl md:text-3xl select-none leading-none">
              <span className="text-gray-600">★</span>
              <span
                className="absolute inset-0 overflow-hidden text-orange-500"
                style={{ width: "50%" }}
                aria-hidden="true"
              >
                ★
              </span>
            </span>
          );
        }
        return (
          <span key={s} className="text-gray-600 text-2xl md:text-3xl select-none leading-none">
            ★
          </span>
        );
      })}
    </div>
  );
}

/** Orange dot-grid decoration shown in the top-right on desktop. */
function DotGrid() {
  return (
    <div
      className="absolute -top-2 -right-2 hidden md:grid grid-cols-5 gap-[7px] pointer-events-none"
      aria-hidden="true"
    >
      {Array.from({ length: 20 }).map((_, i) => (
        <span key={i} className="block w-1.5 h-1.5 rounded-full bg-orange-500/55" />
      ))}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function PremiumTestimonials() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  const busyRef = useRef(false);
  const currentRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Fade out → swap content → fade in. */
  const transition = useCallback((nextIndex: number) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setVisible(false);
    timerRef.current = setTimeout(() => {
      setCurrent(nextIndex);
      currentRef.current = nextIndex;
      setVisible(true);
      busyRef.current = false;
    }, 320);
  }, []);

  const goNext = useCallback(() => {
    transition((currentRef.current + 1) % TESTIMONIALS.length);
  }, [transition]);

  const goPrev = useCallback(() => {
    transition((currentRef.current - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  }, [transition]);

  /* Auto-advance every 5 s. Interval is set once; uses ref for current index. */
  useEffect(() => {
    const id = setInterval(goNext, 5000);
    return () => clearInterval(id);
  }, [goNext]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const t = TESTIMONIALS[current];

  const fadeStyle: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateX(0px)" : "translateX(14px)",
    transition: "opacity 0.3s ease, transform 0.3s ease",
  };

  const clusterStyle: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? "scale(1)" : "scale(0.96)",
    transition: "opacity 0.3s ease, transform 0.3s ease",
  };

  return (
    <section className="relative bg-black overflow-hidden py-16 sm:py-20 md:py-24 lg:py-28">
      {/* Subtle radial glow behind the image cluster */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-orange-600/6 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col md:flex-row md:items-center gap-10 sm:gap-12 md:gap-16 lg:gap-24 md:min-h-[420px]">

          {/* ── IMAGE CLUSTER ───────────────────────────────────────────── */}
          <div className="flex-shrink-0 flex justify-center" aria-hidden="true">
            <div style={clusterStyle} className="flex items-center justify-center">

              {/* Left side diamond — smaller, behind */}
              <div className="relative z-10" style={{ marginRight: "-22px" }}>
                <div
                  className="
                    w-[76px]  h-[76px]
                    sm:w-[88px] sm:h-[88px]
                    md:w-[108px] md:h-[108px]
                    rotate-45 overflow-hidden rounded-md
                    border border-white/15
                  "
                >
                  <DiamondContent
                    src={t.leftImage}
                    alt="reviewer"
                    initials={t.leftInitials}
                    bg={t.leftBg}
                  />
                </div>
              </div>

              {/* Center diamond — largest, in front, orange border accent */}
              <div className="relative z-20">
                <div
                  className="
                    w-[148px] h-[148px]
                    sm:w-[164px] sm:h-[164px]
                    md:w-[186px] md:h-[186px]
                    rotate-45 overflow-hidden rounded-xl
                    border-2 border-orange-500/45
                    shadow-[0_0_40px_rgba(249,115,22,0.18)]
                  "
                >
                  <DiamondContent
                    src={t.mainImage}
                    alt={t.name}
                    initials={t.mainInitials}
                    bg={t.mainBg}
                  />
                </div>
              </div>

              {/* Right side diamond — smaller, behind */}
              <div className="relative z-10" style={{ marginLeft: "-22px" }}>
                <div
                  className="
                    w-[76px]  h-[76px]
                    sm:w-[88px] sm:h-[88px]
                    md:w-[108px] md:h-[108px]
                    rotate-45 overflow-hidden rounded-md
                    border border-white/15
                  "
                >
                  <DiamondContent
                    src={t.rightImage}
                    alt="reviewer"
                    initials={t.rightInitials}
                    bg={t.rightBg}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── CONTENT ─────────────────────────────────────────────────── */}
          <div className="relative flex-1 min-w-0">
            <DotGrid />

            <div style={fadeStyle}>
              {/* Large opening quote mark */}
              <p
                className="text-[72px] md:text-[96px] text-white leading-none font-serif -mb-3 md:-mb-4 select-none"
                aria-hidden="true"
              >
                &ldquo;
              </p>

              {/* Review text */}
              <p
                className="
                  text-[17px] sm:text-[19px] md:text-[21px] lg:text-[23px]
                  font-bold text-white leading-relaxed
                "
              >
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Star rating */}
              <div className="mt-5 md:mt-6">
                <StarRating rating={t.rating} />
              </div>

              {/* Name + role */}
              <div className="mt-5 md:mt-6">
                <p className="font-bold text-white text-lg md:text-xl">{t.name}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="block w-8 h-px bg-orange-500 flex-shrink-0" aria-hidden="true" />
                  <p className="text-gray-400 text-[11px] md:text-xs uppercase tracking-[0.12em] font-medium">
                    {t.role}
                  </p>
                </div>
              </div>

              {/* Prev / Next arrows */}
              <div className="flex gap-3 mt-8 justify-center md:justify-end">
                <button
                  onClick={goPrev}
                  aria-label="Previous testimonial"
                  className="
                    w-11 h-11 border border-white/30 text-white text-base
                    flex items-center justify-center
                    hover:bg-white hover:text-black hover:border-white
                    active:scale-95
                    transition-all duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60
                  "
                >
                  &#8592;
                </button>
                <button
                  onClick={goNext}
                  aria-label="Next testimonial"
                  className="
                    w-11 h-11 border border-white/30 text-white text-base
                    flex items-center justify-center
                    hover:bg-white hover:text-black hover:border-white
                    active:scale-95
                    transition-all duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60
                  "
                >
                  &#8594;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
