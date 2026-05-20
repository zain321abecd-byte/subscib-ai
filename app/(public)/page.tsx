import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import AddToCartButton from "@/components/AddToCartButton";
import Typewriter from "@/components/Typewriter";
import BrandIcon from "@/components/BrandIcon";
import Reviews from "@/components/Reviews";
import TrustBadges from "@/components/TrustBadges";
import { getFeaturedProducts } from "@/lib/products";
import { getSiteSettings } from "@/lib/site-settings";
import { getRegion } from "@/lib/region";

export const revalidate = 60;

export default async function HomePage() {
  const [featured, settings, region] = await Promise.all([
    getFeaturedProducts(4),
    getSiteSettings(),
    getRegion(),
  ]);
  const isPK = region === "PK";
  // For non-PK visitors, strip any PKR/Pakistan/JazzCash/Easypaisa references the
  // admin may have saved. Foreign visitors must never see Pakistan-specific copy.
  const sanitizeForGlobal = (s: string) =>
    s.replace(/\s*[—,-]?\s*paid in PKR/gi, "")
      .replace(/\s*[—,-]?\s*in Pakistan/gi, "")
      .replace(/JazzCash,?\s*/gi, "")
      .replace(/Easypaisa,?\s*/gi, "")
      .replace(/PKR/g, "USD")
      .replace(/\s+,/g, ",")
      .trim();
  const rawHeadline = settings.hero_headline || "Premium AI subscriptions,";
  const heroHeadline = isPK ? rawHeadline : sanitizeForGlobal(rawHeadline);
  const rawSubtext = settings.hero_subtext;
  const heroSubtext = rawSubtext
    ? (isPK ? rawSubtext : sanitizeForGlobal(rawSubtext))
    : (isPK
      ? "Pay locally with JazzCash, Easypaisa, or any card. Activated to your inbox within 30 minutes, backed by replacement guarantees and real WhatsApp support."
      : "Activated to your inbox within 30 minutes. Backed by replacement guarantees and real human support — pay securely with any major card.");

  const fxRate = Number(settings.fx_rate_pkr_per_usd) || 280;

  return (
    <>
      {/* ───────────────────────────────────────────────────────────────
       * MOBILE HERO  (md:hidden) — left-aligned, text CTA, wavy bg
       * ─────────────────────────────────────────────────────────────── */}
      <section className="md:hidden relative overflow-hidden bg-ink-1000 min-h-screen flex flex-col">
        {/* Wavy red brushstroke background */}
        <svg
          aria-hidden
          viewBox="0 0 400 800"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <defs>
            <radialGradient id="hero-bg-glow" cx="50%" cy="55%" r="55%">
              <stop offset="0%" stopColor="#FF1A1A" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#7A0A0A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="800" fill="url(#hero-bg-glow)" />
          <g stroke="#FF2A2A" strokeOpacity="0.32" fill="none" strokeWidth="1.2" strokeLinecap="round">
            <path d="M-20 120 Q 90 60 220 160 T 440 220" />
            <path d="M-20 200 Q 140 130 260 230 T 440 300" />
            <path d="M-30 320 Q 120 240 280 360 T 440 420" />
            <path d="M-30 460 Q 130 380 270 500 T 440 560" />
            <path d="M-20 600 Q 140 520 290 640 T 440 700" />
            <path d="M-30 700 Q 120 620 280 720 T 440 760" />
          </g>
          <g stroke="#FF3A3A" strokeOpacity="0.18" fill="none" strokeWidth="0.8">
            <path d="M-10 80 Q 130 30 260 130 T 410 200" />
            <path d="M-10 380 Q 150 320 280 420 T 420 500" />
            <path d="M-10 560 Q 160 480 300 580 T 420 660" />
          </g>
        </svg>

        <div className="relative flex-1 flex flex-col justify-center px-6 py-12">
          {/* Headline */}
          <h1 className="font-heading font-extrabold text-[clamp(2.25rem,9.5vw,2.875rem)] leading-[1.05] tracking-tight text-ink-50">
            Premium AI<br />
            Tools &amp; Subscriptions
          </h1>

          {/* Lede — two short paragraphs */}
          <div className="mt-6 space-y-3 text-[14px] leading-relaxed text-ink-200">
            <p>ChatGPT, Claude, Midjourney, Canva and 60+ premium AI tools.</p>
            <p>Local prices, activated in under 30 minutes.</p>
          </div>

          {/* Text CTA with arrow */}
          <Link
            href="/shop"
            className="mt-7 inline-flex items-center gap-3 text-ink-50 font-bold text-[15px] uppercase tracking-[0.14em] active:text-brand-500 transition-colors"
          >
            Shop Now
            <svg width="36" height="14" viewBox="0 0 36 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 7h30M27 2l5 5-5 5" />
            </svg>
          </Link>

          {/* Mouse scroll indicator — inside content area, above FAB cutoff */}
          <div className="mt-28 flex justify-center">
            <span aria-hidden className="relative inline-flex items-start justify-center h-9 w-5 rounded-full ring-2 ring-white/70">
              <span className="mt-1.5 h-2 w-1 rounded-full bg-white animate-pulse" />
            </span>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
       * MOBILE STATS  (md:hidden) — "Our Success" left-aligned w/ paragraph
       * ─────────────────────────────────────────────────────────────── */}
      <section className="md:hidden px-6 py-12 bg-ink-1000">
        <h2 className="font-heading font-extrabold text-[clamp(2rem,9vw,2.75rem)] leading-[1.05] tracking-tight text-ink-50">
          Our Success
        </h2>
        <p className="mt-5 text-[14px] leading-relaxed text-ink-200">
          From the beginning, we&apos;ve worked hard to bring premium AI subscriptions, tools, and digital products to creators everywhere. Our journey is filled with milestones that inspire us to aim higher every day.
        </p>

        <div className="mt-8 flex flex-col gap-6">
          {[
            ["12K", "Customers"],
            ["60", "AI Tools"],
            ["25K", "Subscriptions delivered"],
            ["4.9", "Customer rating"],
          ].map(([n, l]) => (
            <div key={l} className="flex items-center gap-5">
              <div className="relative shrink-0">
                <span className="font-heading font-extrabold text-ink-50 text-[clamp(2.5rem,12vw,3.5rem)] leading-none tracking-tight">
                  {n}
                </span>
                <span aria-hidden className="absolute -top-1 -right-3 font-heading font-bold text-brand-500 text-[20px] leading-none">
                  +
                </span>
              </div>
              <p className="text-[15px] font-medium text-ink-50 leading-tight">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
       * MOBILE FEATURED PRODUCTS  (md:hidden) — poster-style vertical stack
       * Each card: eyebrow label, big brand poster, title + red price range
       * ─────────────────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="md:hidden px-5 py-10 bg-ink-1000">
          <header className="mb-8 text-center">
            <h2 className="font-heading font-bold text-[clamp(1.5rem,6vw,2rem)] leading-[1.1] tracking-tight text-ink-50 uppercase">
              Tech Products For You<br />At Low Cost
            </h2>
            <span aria-hidden className="mt-3 inline-block h-0.75 w-16 bg-brand-500 rounded-full" />
            <div className="mt-5 flex justify-center">
              <Link
                href="/shop"
                className="inline-flex items-center gap-1 rounded-full bg-brand-500/12 ring-1 ring-brand-500/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-500 active:bg-brand-500/20 transition-colors"
              >
                View all
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </header>
          <div className="flex flex-col gap-9">
            {featured.slice(0, 4).map((p) => {
              const price = Math.round(p.price);
              const priceHigh = Math.round(p.price * 1.25);
              const priceRange = isPK
                ? `Rs. ${price.toLocaleString("en-PK")} - Rs. ${priceHigh.toLocaleString("en-PK")}`
                : `$${(price / fxRate).toFixed(0)} - $${(priceHigh / fxRate).toFixed(0)}`;
              return (
                <div
                  key={p.id}
                  className="text-center rounded-xl p-5 bg-linear-to-b from-white/6 to-white/1.5 ring-1 ring-white/10 shadow-[0_18px_40px_-20px_rgba(255,122,26,0.35),0_8px_20px_-12px_rgba(0,0,0,0.6)]"
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-brand-500 mb-3">
                    Premium Products For Yours
                  </p>
                  <Link
                    href={`/product/${p.id}`}
                    className="block relative rounded-md overflow-hidden ring-1 ring-white/10 active:scale-[0.99] transition-transform"
                  >
                    <div className="relative aspect-4/3 bg-linear-to-br from-white via-[#f5f5f5] to-white grid place-items-center overflow-hidden">
                      <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,122,26,0.06),transparent_60%)]" />
                      {p.brand
                        ? <BrandIcon name={p.brand} size={170} />
                        : <i className={p.iconClass} style={{ color: "#0F172A", fontSize: 130 }} />}
                      <div className="absolute inset-x-0 bottom-0 px-5 py-4 bg-linear-to-t from-black/85 via-black/40 to-transparent">
                        <p className="font-heading font-extrabold text-white text-[26px] leading-[0.95] uppercase tracking-tight">
                          {p.name}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <p className="mt-4 font-heading font-bold text-brand-500 text-[17px] tracking-tight">
                    {priceRange}
                  </p>
                  <AddToCartButton
                    id={p.id}
                    name={p.name}
                    price={p.price}
                    iconClass={p.iconClass}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────────
       * DESKTOP HERO  (hidden md:block) — original v2 hero, unchanged
       * ─────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block">
        <section className="v2-hero">
          <div className="v2-hero-bg" aria-hidden />
          <div className="v2-container v2-hero-grid">
            <div className="v2-hero-copy">
              <span className="badge badge-brand"><i className="fa-solid fa-heart"></i> Made with Love · Trusted by 12,000+ creators</span>
              <h1>
                {heroHeadline}<br />
                <Typewriter
                  phrases={isPK ? [
                    "ready in 30 min.",
                    "billed in PKR.",
                    "backed by humans.",
                    "without the forex.",
                  ] : [
                    "ready in 30 min.",
                    "billed in USD.",
                    "backed by humans.",
                    "no surprises.",
                  ]}
                  typingMs={75}
                  holdMs={2000}
                  fadeMs={420}
                />
              </h1>
              <p className="v2-lede">
                <strong>SubscribAI is your one-stop store for premium AI subscriptions.</strong> Browse 60+ tools &mdash; from ChatGPT Plus and Claude Pro to Midjourney, Canva, and Notion AI &mdash; alongside automation packs and full courses, curated for creators, students, and small teams.
              </p>
              <p className="v2-lede v2-lede-secondary">
                {heroSubtext}
              </p>
              <div className="v2-hero-ctas">
                <Link className="btn btn-primary btn-large" href="/shop">Browse all tools <i className="fa-solid fa-arrow-right"></i></Link>
                <Link className="btn btn-outline btn-large" href="/prices">View pricing</Link>
              </div>
              <ul className="v2-trust-row">
                <li><i className="fa-solid fa-shield-halved"></i> Secure payment gateway</li>
                <li><i className="fa-solid fa-clock"></i> Activated in &lt; 30 min</li>
                <li><i className="fa-brands fa-whatsapp"></i> WhatsApp support</li>
              </ul>
            </div>

            {featured.length > 0 && (
              <aside className="v2-hero-preview" aria-label="Featured tools">
                <div className="v2-hero-preview-card">
                  <div className="v2-hero-preview-head">
                    <span className="v2-hero-preview-dot"></span>
                    <span className="v2-hero-preview-dot"></span>
                    <span className="v2-hero-preview-dot"></span>
                    <span className="v2-hero-preview-url">subscribai.com/shop</span>
                  </div>
                  <div className="v2-hero-preview-tiles">
                    {(() => {
                      // Prices are stored in PKR canonically. PK visitors see Rs
                      // directly; foreign visitors get USD via the FX rate (admin
                      // override → 280 default during SSR — the client may
                      // re-fetch the live rate).
                      const fxRate = Number(settings.fx_rate_pkr_per_usd) || 280;
                      const fmtPrice = (pkr: number) => isPK
                        ? `Rs ${Math.round(pkr).toLocaleString("en-PK")} / month`
                        : `$${(pkr / fxRate).toFixed(2)} / month`;
                      const palette = [
                        { bc: "badge-success" },
                        { bc: "badge-brand" },
                        { bc: "badge-accent" },
                        { bc: "badge-success" },
                      ];
                      return featured.slice(0, 4).map((p, idx) => {
                        const skin = palette[idx % palette.length];
                        const tag = (p.tag || "").split(",")[0].trim();
                        return (
                          <div className="v2-mini-card" key={p.id}>
                            <span className="v2-mini-icon" style={{ background: "#ffffff" }}>
                              {p.brand
                                ? <BrandIcon name={p.brand} size={20} />
                                : <i className={p.iconClass} style={{ color: "#0F172A", fontSize: 14 }}></i>}
                            </span>
                            <div>
                              <strong>{p.name}</strong>
                              <small>{fmtPrice(p.price)}</small>
                            </div>
                            {tag && <span className={`badge ${skin.bc}`}>{tag}</span>}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                <div className="v2-hero-blob v2-hero-blob-1" aria-hidden />
                <div className="v2-hero-blob v2-hero-blob-2" aria-hidden />
              </aside>
            )}
          </div>
        </section>
      </div>
      {/* /DESKTOP HERO */}

      {/* ───────────────────────────────────────────────────────────────
       * MOBILE VALUE STRIP  (md:hidden) — vertical timeline of 3 steps
       * ─────────────────────────────────────────────────────────────── */}
      <section className="md:hidden px-5 py-10 bg-ink-950 border-y border-white/5">
        <header className="mb-7 text-center">
          <h2 className="font-heading font-bold text-[clamp(1.625rem,6.5vw,2rem)] leading-[1.1] tracking-tight text-ink-50 uppercase">
            How It Works
          </h2>
          <span aria-hidden className="mt-3 inline-block h-0.75 w-16 bg-brand-500 rounded-full" />
        </header>
        <ol className="relative flex flex-col gap-2">
          {[
            { n: "01", t: "Browse & pick", d: "Pick from 60+ AI tools, courses & automation packs." },
            isPK
              ? { n: "02", t: "Pay in PKR", d: "JazzCash, Easypaisa, or any card — secure gateway." }
              : { n: "02", t: "Pay securely", d: "Any major card, processed through a secure gateway." },
            { n: "03", t: "Access in 30 min", d: "Login delivered to your email — often within 15 minutes." },
          ].map((step) => (
            <li key={step.t} className="flex gap-4 rounded-md bg-linear-to-b from-white/4 to-white/1 ring-1 ring-white/8 p-4">
              <span className="font-heading font-extrabold text-brand-500 text-[28px] leading-none tracking-tight shrink-0 w-12">
                {step.n}
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-bold uppercase tracking-wider text-ink-50 leading-tight">{step.t}</p>
                <p className="mt-1 text-[13px] text-ink-200 leading-snug">{step.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* QUICK VALUE STRIP — desktop only */}
      <section className="hidden md:block v2-value-strip">
        <div className="v2-container v2-value-grid">
          {[
            { i: "fa-mobile-screen-button", t: "1. Browse & pick", d: "Pick from 60+ AI tools, courses & automation packs in our shop." },
            isPK
              ? { i: "fa-money-bill-transfer", t: "2. Pay in PKR", d: "JazzCash, Easypaisa, or any card via our secure gateway." }
              : { i: "fa-money-bill-transfer", t: "2. Pay securely", d: "Any major card, processed through our secure payment gateway." },
            { i: "fa-envelope-circle-check", t: "3. Get access in 30 min", d: "Login details delivered to your email — usually in under 15 minutes." },
          ].map((step) => (
            <div key={step.t} className="v2-value-item">
              <span className="v2-value-icon"><i className={`fa-solid ${step.i}`}></i></span>
              <div>
                <strong>{step.t}</strong>
                <small>{step.d}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS — desktop only (mobile shows them in hero carousel) */}
      <section className="hidden md:block v2-section reveal">
        <div className="v2-container">
          <header className="v2-section-head v2-section-head-split">
            <div>
              <p className="v2-eyebrow">Featured</p>
              <h2>Most popular this month</h2>
            </div>
            <Link href="/shop" className="btn btn-outline">View all <i className="fa-solid fa-arrow-right"></i></Link>
          </header>
          <div className="v2-product-grid">
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
       * MOBILE CATEGORIES  (md:hidden) — bold dark horizontal cards
       * ─────────────────────────────────────────────────────────────── */}
      <section className="md:hidden px-6 py-12 bg-ink-1000">
        <h2 className="font-heading font-extrabold text-[clamp(2rem,9vw,2.75rem)] leading-[1.05] tracking-tight text-ink-50">
          Browse By<br />Category
        </h2>
        <p className="mt-5 text-[14px] leading-relaxed text-ink-200">
          Pick what fits your workflow. Mix and match — we deliver each item as soon as your payment confirms.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {[
            { href: "/shop#ai-subscriptions", brands: ["openai", "anthropic", "gemini"], title: "AI Subscriptions", desc: "ChatGPT, Claude, Gemini & more" },
            { href: "/shop#design-tools", brands: ["midjourney", "canva", "firefly"], title: "Design & Image", desc: "Midjourney, Canva, Firefly" },
            { href: "/shop#productivity", brands: ["notion", "grammarly", "clickup"], title: "Productivity", desc: "Notion AI, Grammarly, ClickUp" },
            { href: "/shop#automation", brands: ["make", "zapier", "n8n"], title: "Automation", desc: "Make, Zapier, n8n flows" },
            { href: "/shop#courses", brands: [] as string[], emoji: "🎓", title: "Courses", desc: "AI courses with lifetime access" },
            { href: "/freebies", brands: [] as string[], emoji: "🎁", title: "Freebies", desc: "Free prompts & templates" },
          ].map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group relative flex items-center gap-4 rounded-lg p-4 bg-linear-to-br from-white/6 to-white/1 ring-1 ring-white/10 shadow-[0_10px_28px_-18px_rgba(255,122,26,0.45)] active:scale-[0.99] transition-transform"
            >
              <span className="relative shrink-0 h-14 w-14 grid place-items-center rounded-md bg-ink-950">
                {cat.brands.length > 0 ? (
                  <span className="flex -space-x-1.5">
                    {cat.brands.slice(0, 2).map((slug, i) => (
                      <span key={slug} className="grid place-items-center h-7 w-7 rounded-full bg-white ring-2 ring-ink-950" style={{ zIndex: 2 - i }}>
                        <BrandIcon name={slug} size={16} />
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-[24px]">{cat.emoji}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-heading font-bold text-[15px] uppercase tracking-wider text-ink-50 leading-tight">
                  {cat.title}
                </p>
                <p className="mt-1 text-[12px] text-ink-200 leading-snug line-clamp-1">{cat.desc}</p>
              </div>
              <span aria-hidden className="shrink-0 grid place-items-center h-8 w-8 rounded-full bg-brand-500/10 ring-1 ring-brand-500/30 text-brand-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* CATEGORIES — desktop only */}
      <section className="hidden md:block v2-section v2-section-elevated reveal">
        <div className="v2-container">
          <header className="v2-section-head">
            <p className="v2-eyebrow">What we offer</p>
            <h2>Six categories, one checkout</h2>
            <p>Pick what fits your workflow. Mix and match — we deliver each item as soon as your payment confirms.</p>
          </header>
          <div className="v2-cat-grid reveal reveal-stagger">
            {[
              { href: "/shop#ai-subscriptions", brands: ["openai", "anthropic", "gemini"], icon: "fa-comments", title: "AI Subscriptions", desc: "ChatGPT Plus, Claude Pro, Gemini, Perplexity — premium plans at local prices.", c: "var(--brand-600)", bg: "var(--brand-soft)" },
              { href: "/shop#design-tools", brands: ["midjourney", "canva", "firefly"], icon: "fa-palette", title: "Design & Image AI", desc: "Midjourney, Leonardo, Adobe Firefly, Canva Pro — for creators and marketers.", c: "var(--accent-600)", bg: "var(--accent-soft)" },
              { href: "/shop#productivity", brands: ["notion", "grammarly", "clickup"], icon: "fa-bolt-lightning", title: "Productivity Tools", desc: "Notion AI, Grammarly Premium, ClickUp AI, Otter — work faster with AI.", c: "var(--info-500)", bg: "var(--info-soft)" },
              { href: "/shop#automation", brands: ["make", "zapier", "n8n"], icon: "fa-diagram-project", title: "Automation Packs", desc: "Make.com, Zapier templates, n8n flows — pre-built workflows you can import.", c: "var(--warning-500)", bg: "var(--warning-soft)" },
              { href: "/shop#courses", brands: [] as string[], icon: "fa-graduation-cap", title: "Courses & Tutorials", desc: "Self-paced AI courses with downloadable templates and lifetime access.", c: "var(--success-500)", bg: "var(--success-soft)" },
              { href: "/freebies", brands: [] as string[], icon: "fa-gift", title: "Freebies", desc: "Free prompts, templates, and starter kits — no signup, instant download.", c: "var(--danger-500)", bg: "var(--danger-soft)" },
            ].map((cat) => (
              <Link key={cat.href} href={cat.href} className="surface-card is-interactive v2-cat-card">
                {cat.brands.length > 0 ? (
                  <span className="v2-cat-brands" aria-hidden>
                    {cat.brands.map((slug, i) => (
                      <span key={slug} className="v2-cat-brand-tile" style={{ zIndex: cat.brands.length - i }}>
                        <BrandIcon name={slug} size={20} />
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="v2-cat-icon" style={{ background: cat.bg, color: cat.c }}>
                    <i className={`fa-solid ${cat.icon}`}></i>
                  </span>
                )}
                <h3>{cat.title}</h3>
                <p>{cat.desc}</p>
                <span className="v2-cat-arrow">Browse <i className="fa-solid fa-arrow-right"></i></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* LOGO BAND — brand recognition (demoted lower) */}
      <section className="v2-logos">
        <div className="v2-container">
          <p className="v2-logos-label">We resell official subscriptions for</p>
          <div className="v2-logos-row">
            {[
              ["fa-comments", "ChatGPT"], ["fa-bolt", "Claude"], ["fa-palette", "Midjourney"],
              ["fa-pen-ruler", "Canva"], ["fa-cube", "Notion AI"], ["fa-video", "CapCut"], ["fa-microphone", "ElevenLabs"],
            ].map(([icon, name]) => (
              <span key={name}><i className={`fa-solid ${icon}`}></i> {name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST BADGES — concrete promises before the discursive "why us" section */}
      <TrustBadges />

      {/* ───────────────────────────────────────────────────────────────
       * MOBILE WHY-US  (md:hidden) — 1-col card stack, larger taps
       * ─────────────────────────────────────────────────────────────── */}
      <section className="md:hidden px-5 py-10 bg-ink-950 border-y border-white/5">
        <header className="mb-7 text-center">
          <h2 className="font-heading font-bold text-[clamp(1.625rem,6.5vw,2rem)] leading-[1.1] tracking-tight text-ink-50 uppercase">
            {isPK ? "Built For Buyers Like You" : "The Fastest Way To Premium AI"}
          </h2>
          <span aria-hidden className="mt-3 inline-block h-0.75 w-16 bg-brand-500 rounded-full" />
          <p className="mt-4 text-[14px] leading-relaxed text-ink-200">
            We solve the three things that make AI subscriptions a pain — payment, delivery, and support.
          </p>
        </header>
        <div className="flex flex-col gap-3">
          {[
            isPK
              ? { i: "fa-money-bill-transfer", t: "Pay in PKR", d: "JazzCash, Easypaisa, and any card. No forex hassle, no rejected international transactions.", bg: "#FF7A1A", brand: false }
              : { i: "fa-credit-card", t: "Pay your way", d: "Any major card, processed through a secure gateway. Receipts emailed instantly.", bg: "#FF7A1A", brand: false },
            { i: "fa-bolt", t: "Instant activation", d: "Most subscriptions go live in under 30 minutes. Digital downloads arrive immediately via email.", bg: "#10A37F", brand: false },
            { i: "fa-rotate", t: "Easy renewals", d: "Renewal reminders before expiry. Replacements within 24 hours if anything goes wrong with a subscription.", bg: "#4796E3", brand: false },
            { i: "fa-whatsapp", t: "Real human support", d: "WhatsApp + email support, 24/7. Average reply time under 15 minutes during the day.", bg: "#25D366", brand: true },
          ].map((w) => (
            <div key={w.t} className="flex gap-4 rounded-md bg-gradient-to-br from-white/[0.05] to-white/[0.01] ring-1 ring-white/8 p-4">
              <span className="h-12 w-12 shrink-0 grid place-items-center rounded-sm text-white text-[20px]" style={{ background: w.bg }}>
                <i className={`${w.brand ? "fa-brands" : "fa-solid"} ${w.i}`}></i>
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-ink-50 leading-tight">{w.t}</p>
                <p className="mt-1 text-[13px] text-ink-200 leading-relaxed">{w.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* WHY US — desktop only */}
      <section className="hidden md:block v2-section v2-section-elevated reveal">
        <div className="v2-container">
          <header className="v2-section-head">
            <p className="v2-eyebrow">Why SubscribAI</p>
            <h2>{isPK ? "Built for buyers like you" : "The fastest way to access premium AI"}</h2>
            <p>We solve the three things that make AI subscriptions a pain — payment, delivery, and support.</p>
          </header>
          <div className="v2-why-grid reveal reveal-stagger">
            {[
              isPK
                ? { icon: "fa-money-bill-transfer", t: "Pay in PKR", d: "JazzCash, Easypaisa, and any card. No forex hassle, no rejected international transactions.", bg: "#FF7A1A" }
                : { icon: "fa-credit-card", t: "Pay your way", d: "Any major card, processed through a secure gateway. Receipts emailed instantly.", bg: "#FF7A1A" },
              { icon: "fa-bolt", t: "Instant activation", d: "Most subscriptions go live in under 30 minutes. Digital downloads arrive immediately via email.", bg: "#10A37F" },
              { icon: "fa-rotate", t: "Easy renewals", d: "Renewal reminders before expiry. Replacements within 24 hours if anything goes wrong with a subscription.", bg: "#4796E3" },
              { icon: "fa-whatsapp", t: "Real human support", d: "WhatsApp + email support, 24/7. Average reply time under 15 minutes during the day.", bg: "#25D366", brand: true },
            ].map((w) => (
              <div key={w.t} className="surface-card v2-why-card">
                <span className="v2-why-icon" style={{ background: w.bg, color: "#ffffff" }}>
                  <i className={`${w.brand ? "fa-brands" : "fa-solid"} ${w.icon}`}></i>
                </span>
                <h3>{w.t}</h3>
                <p>{w.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CUSTOMER REVIEWS — social proof before stats */}
      <Reviews
        eyebrow="Reviews"
        title="What our customers say"
        intro="Real creators, students, and small teams using SubscribAI today."
      />

      {/* STATS — desktop only */}
      <section className="hidden md:block v2-stats-band reveal">
        <div className="v2-container v2-stats-grid">
          {[["12K+", "Active customers"], ["60+", "Tools listed"], ["< 30 min", "Average activation"], ["4.9 / 5", "Customer rating"]].map(([n, l]) => (
            <div key={l}><strong>{n}</strong><span>{l}</span></div>
          ))}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
       * MOBILE FAQ  (md:hidden) — clean accordion list
       * ─────────────────────────────────────────────────────────────── */}
      <section className="md:hidden px-5 py-10 bg-ink-950 border-y border-white/5">
        <header className="mb-7 text-center">
          <h2 className="font-heading font-bold text-[clamp(1.625rem,6.5vw,2rem)] leading-[1.1] tracking-tight text-ink-50 uppercase">
            Frequently Asked
          </h2>
          <span aria-hidden className="mt-3 inline-block h-0.75 w-16 bg-brand-500 rounded-full" />
        </header>
        <div className="flex flex-col gap-2">
          {[
            ["How fast do I get my subscription after paying?", "Most AI subscription accounts are activated within 30 minutes during business hours, and within a few hours overnight. You'll receive your login by email and a WhatsApp confirmation."],
            isPK
              ? ["What payment methods do you accept?", "JazzCash, Easypaisa, and any debit or credit card via our secure payment gateway. We never store card details — payment is handled entirely by the gateway."]
              : ["What payment methods do you accept?", "Any major debit or credit card via our secure payment gateway. We never store card details — payment is handled entirely by the gateway."],
            ["Are these legitimate accounts?", "Yes — every subscription is from an authorized reseller channel, family-plan slot, or our own bulk-purchase pool. We don't sell cracked or shared logins from sketchy sources."],
            ["What if my account stops working?", "Tell us on WhatsApp or email and we'll replace it within 24 hours. Subscriptions come with full-period replacement guarantees."],
            ["Can I cancel a bundle anytime?", "Yes — bundle subscriptions are month-to-month with no contracts. Cancel any time before your renewal date and you won't be charged again."],
          ].map(([q, a]) => (
            <details key={q} className="group rounded-md bg-gradient-to-br from-white/5 to-white/1 ring-1 ring-white/8 overflow-hidden">
              <summary className="
                flex items-center justify-between gap-3
                cursor-pointer list-none
                px-4 py-3.5
                text-[15px] font-semibold text-ink-50
                active:bg-white/[0.03]
              ">
                <span>{q}</span>
                <span className="
                  h-7 w-7 shrink-0 grid place-items-center rounded-full
                  bg-white/5 text-ink-200
                  transition-transform duration-200
                  group-open:rotate-180 group-open:bg-brand-500/15 group-open:text-brand-500
                ">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <p className="px-4 pb-4 -mt-1 text-[14px] text-ink-200 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* FAQ — desktop only */}
      <section className="hidden md:block v2-section v2-section-elevated reveal">
        <div className="v2-container v2-faq-wrap">
          <header className="v2-section-head">
            <p className="v2-eyebrow">Questions</p>
            <h2>Frequently asked</h2>
          </header>
          <div className="v2-faq reveal reveal-stagger">
            {[
              ["How fast do I get my subscription after paying?", "Most AI subscription accounts are activated within 30 minutes during business hours, and within a few hours overnight. You'll receive your login by email and a WhatsApp confirmation."],
              isPK
                ? ["What payment methods do you accept?", "JazzCash, Easypaisa, and any debit or credit card via our secure payment gateway. We never store card details — payment is handled entirely by the gateway."]
                : ["What payment methods do you accept?", "Any major debit or credit card via our secure payment gateway. We never store card details — payment is handled entirely by the gateway."],
              ["Are these legitimate accounts?", "Yes — every subscription is from an authorized reseller channel, family-plan slot, or our own bulk-purchase pool. We don't sell cracked or shared logins from sketchy sources."],
              ["What if my account stops working?", "Tell us on WhatsApp or email and we'll replace it within 24 hours. Subscriptions come with full-period replacement guarantees."],
              ["Can I cancel a bundle anytime?", "Yes — bundle subscriptions are month-to-month with no contracts. Cancel any time before your renewal date and you won't be charged again."],
            ].map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
       * MOBILE FINAL CTA  (md:hidden) — "Powering Your..." style
       * ─────────────────────────────────────────────────────────────── */}
      <section className="md:hidden relative overflow-hidden bg-ink-1000 px-6 py-16 text-center">
        {/* Ambient red glow */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="absolute bottom-0 -right-20 h-48 w-48 rounded-full bg-brand-500/15 blur-3xl" />
        </div>

        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-brand-500 mb-3">
            Powering Your AI Workflow
          </p>
          <h2 className="font-heading font-extrabold text-[clamp(1.75rem,7vw,2.25rem)] leading-[1.05] tracking-tight text-ink-50 uppercase">
            Want more tools<br />&amp; premium drops?
          </h2>
          <p className="mt-5 mx-auto max-w-[32ch] text-[14px] text-ink-200 leading-relaxed">
            Join our channel for new launches, exclusive deals, and member-only AI subscription drops.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex items-center gap-3 text-ink-50 font-bold text-[14px] uppercase tracking-[0.18em] active:text-brand-500 transition-colors"
          >
            Browse the shop
            <svg width="36" height="14" viewBox="0 0 36 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 7h30M27 2l5 5-5 5" />
            </svg>
          </Link>
        </div>
      </section>

      {/* FINAL CTA — desktop only */}
      <section className="hidden md:block v2-section">
        <div className="v2-container">
          <div className="v2-final-cta reveal">
            <div>
              <h2>Pick your first AI tool today</h2>
              <p>Start with one subscription, scale up when you&apos;re ready. No setup fees, no contracts.</p>
            </div>
            <div className="v2-final-cta-actions">
              <Link className="btn btn-primary btn-large" href="/shop">Browse the shop <i className="fa-solid fa-arrow-right"></i></Link>
              <a className="btn btn-outline btn-large" href="https://wa.me/15550132026"><i className="fa-brands fa-whatsapp"></i> WhatsApp us</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
