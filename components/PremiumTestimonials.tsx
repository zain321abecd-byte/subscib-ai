"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   TESTIMONIAL DATA
   ─ mainImage : any URL or /public/ path.
   ─ Initials + bg are shown when the image fails to load or is absent.
   ─ rating: 1–5, supports 0.5 steps.
   ─ slides prop: DB rows passed from the server override the static array.
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

/* 3 testimonials — 3 real people reused across slides as main / side characters */
const MAN1  = "https://randomuser.me/api/portraits/men/32.jpg";   // Hamza
const WOMAN1 = "https://randomuser.me/api/portraits/women/44.jpg"; // Sara
const MAN2  = "https://randomuser.me/api/portraits/men/68.jpg";   // Ali
const WOMAN2 = "https://randomuser.me/api/portraits/women/68.jpg"; // Fatima
const MAN3  = "https://randomuser.me/api/portraits/men/75.jpg";   // Bilal
const WOMAN3 = "https://randomuser.me/api/portraits/women/22.jpg"; // Aisha

const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: "Hamza Ahmed",
    role: "Freelancer",
    rating: 4.5,
    text: "As a freelancer, I rely on tools that save me time and money. SubscribAI keeps delivering exactly that — new updates every visit, reliable credentials, and instant delivery. It's my top source for premium digital tools.",
    mainImage: MAN1,
    mainInitials: "HA", mainBg: "#c2410c",
  },
  {
    id: 2,
    name: "Sara Khan",
    role: "Content Creator",
    rating: 5,
    text: "SubscribAI completely transformed my content workflow. I save hours every week and my audience engagement has doubled since I started using these AI subscriptions. The support is also incredibly fast.",
    mainImage: WOMAN1,
    mainInitials: "SK", mainBg: "#166534",
  },
  {
    id: 3,
    name: "Ali Raza",
    role: "Agency Owner",
    rating: 5,
    text: "I run a digital agency and SubscribAI is my go-to for premium AI tools. Reliable credentials, instant delivery, and support that actually responds. My team is impressed with every single order we place.",
    mainImage: MAN2,
    mainInitials: "AR", mainBg: "#1e3a5f",
  },
  {
    id: 4,
    name: "Fatima Malik",
    role: "MBA Student",
    rating: 5,
    text: "I was paying for ChatGPT through a friend abroad. SubscribAI is half the hassle — I get my own credentials and the support team replies within minutes. Wish I had switched months ago.",
    mainImage: WOMAN2,
    mainInitials: "FM", mainBg: "#7c3aed",
  },
  {
    id: 5,
    name: "Bilal Siddiqui",
    role: "YouTube Creator",
    rating: 5,
    text: "Canva Pro went live in eight minutes. I run a content channel and needed it the same day — it worked perfectly. SubscribAI is the most reliable place I've found for AI and creative tools.",
    mainImage: MAN3,
    mainInitials: "BS", mainBg: "#c2410c",
  },
  {
    id: 6,
    name: "Aisha Imtiaz",
    role: "Boutique Owner",
    rating: 4.5,
    text: "I run a small clothing brand. The social auto-poster cut my Instagram time from two hours a day to thirty minutes. Worth ten times what I paid — and the Canva Pro access made my posts look professional instantly.",
    mainImage: WOMAN3,
    mainInitials: "AI", mainBg: "#7c3aed",
  },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function DiamondContent({ src, alt, initials, bg }: { src?: string; alt: string; initials?: string; bg?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className="w-full h-full object-cover -rotate-45 scale-150" draggable={false} />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center font-bold text-white" style={{ background: bg ?? "#374151" }}>
      <span className="-rotate-45 text-sm md:text-base select-none">{initials}</span>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-px" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => {
        if (rating >= s) return <span key={s} className="text-orange-500 text-2xl md:text-3xl select-none leading-none">★</span>;
        if (rating >= s - 0.5) return (
          <span key={s} className="relative inline-block text-2xl md:text-3xl select-none leading-none">
            <span className="text-gray-600">★</span>
            <span className="absolute inset-0 overflow-hidden text-orange-500" style={{ width: "50%" }} aria-hidden="true">★</span>
          </span>
        );
        return <span key={s} className="text-gray-600 text-2xl md:text-3xl select-none leading-none">★</span>;
      })}
    </div>
  );
}

function DotGrid() {
  return (
    <div className="absolute -top-2 -right-2 hidden md:grid grid-cols-5 gap-[7px] pointer-events-none" aria-hidden="true">
      {Array.from({ length: 20 }).map((_, i) => (
        <span key={i} className="block w-1.5 h-1.5 rounded-full bg-orange-500/55" />
      ))}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function PremiumTestimonials({ slides }: { slides?: Testimonial[] }) {
  const data = slides && slides.length > 0 ? slides : TESTIMONIALS;

  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  const busyRef    = useRef(false);
  const currentRef = useRef(0);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const goNext = useCallback(() => transition((currentRef.current + 1) % data.length), [transition, data.length]);
  const goPrev = useCallback(() => transition((currentRef.current - 1 + data.length) % data.length), [transition, data.length]);
  const goTo   = useCallback((i: number) => transition(i), [transition]);

  useEffect(() => { const id = setInterval(goNext, 5000); return () => clearInterval(id); }, [goNext]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const t = data[current] ?? data[0];

  const contentAnim: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateX(0px)" : "translateX(16px)",
    transition: "opacity 0.32s ease, transform 0.32s ease",
  };
  const clusterAnim: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? "scale(1)" : "scale(0.95)",
    transition: "opacity 0.32s ease, transform 0.32s ease",
  };

  return (
    <section className="relative bg-black overflow-hidden py-14 sm:py-18 md:py-20">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-orange-600/5 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 lg:px-12">

        {/* ── Two-column row. Fixed min-height keeps buttons from jumping. ── */}
        <div
          className="flex flex-col md:flex-row md:items-stretch gap-10 sm:gap-12 md:gap-16 lg:gap-24"
          style={{ minHeight: "clamp(420px, 55vw, 560px)" }}
        >

          {/* ── LEFT: image cluster (vertically centered) ─────────────── */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <div style={clusterAnim} className="flex items-center justify-center">

              {/* Customer diamond */}
              <div className="relative z-20">
                <div className="w-[156px] h-[156px] sm:w-[178px] sm:h-[178px] md:w-[204px] md:h-[204px] rotate-45 overflow-hidden rounded-xl border-2 border-orange-500/55 shadow-[0_0_54px_rgba(249,115,22,0.24)]">
                  <DiamondContent src={t.mainImage} alt={t.name} initials={t.mainInitials} bg={t.mainBg} />
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: content + buttons in a stable flex column ──────── */}
          <div className="relative flex-1 min-w-0 flex flex-col justify-between">
            <DotGrid />

            {/* Animated content block (quote → text → stars → name) */}
            <div style={contentAnim} className="flex-1 flex flex-col justify-center">
              {/* Opening quote mark */}
              <p className="text-[68px] md:text-[88px] text-white leading-none font-serif -mb-2 md:-mb-3 select-none" aria-hidden="true">
                &ldquo;
              </p>

              {/* Review text */}
              <p className="text-[16px] sm:text-[18px] md:text-[20px] lg:text-[22px] font-bold text-white leading-relaxed">
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Stars */}
              <div className="mt-5">
                <StarRating rating={t.rating} />
              </div>

              {/* Name + role */}
              <div className="mt-4">
                <p className="font-bold text-white text-lg md:text-xl">{t.name}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="block w-8 h-px bg-orange-500 flex-shrink-0" aria-hidden="true" />
                  <p className="text-gray-400 text-[11px] md:text-xs uppercase tracking-[0.13em] font-medium">{t.role}</p>
                </div>
              </div>
            </div>

            {/* ── NAVIGATION — outside the animated div, always fixed here ── */}
            <div className="flex items-center justify-center md:justify-between mt-8 flex-shrink-0">

              {/* Dot indicators */}
              <div className="hidden md:flex items-center gap-2" aria-label="Slide indicators">
                {data.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    style={{ appearance: "none", WebkitAppearance: "none" }}
                    className={`border-0 p-0 cursor-pointer rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                      i === current
                        ? "w-5 h-2 bg-orange-500"
                        : "w-2 h-2 bg-white/25 hover:bg-white/50"
                    }`}
                  />
                ))}
              </div>

              {/* Prev / Next arrow buttons */}
              <div className="flex gap-3">
                <button
                  onClick={goPrev}
                  aria-label="Previous testimonial"
                  className="w-12 h-12 bg-white/5 border border-white/20 text-white flex items-center justify-center text-xl hover:bg-orange-500 hover:border-orange-500 hover:text-white active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  &#8592;
                </button>
                <button
                  onClick={goNext}
                  aria-label="Next testimonial"
                  className="w-12 h-12 bg-orange-500 border border-orange-500 text-white flex items-center justify-center text-xl hover:bg-orange-400 hover:border-orange-400 active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
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
