import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import MobileHeroProductCard from "@/components/MobileHeroProductCard";
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

  // Helper used by both mobile + desktop blocks. Prices are stored in PKR;
  // PK visitors see Rs directly, others get USD via the admin FX rate.
  const fxRate = Number(settings.fx_rate_pkr_per_usd) || 280;
  const fmtPrice = (pkr: number) => isPK
    ? `Rs ${Math.round(pkr).toLocaleString("en-PK")} / mo`
    : `$${(pkr / fxRate).toFixed(2)} / mo`;

  return (
    <>
      {/* ───────────────────────────────────────────────────────────────
       * MOBILE HERO  (md:hidden) — mobile-first redesign
       * ─────────────────────────────────────────────────────────────── */}
      <section className="md:hidden relative overflow-hidden bg-ink-1000">
        {/* Ambient brand glow */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-20 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="absolute top-40 -left-24 h-64 w-64 rounded-full bg-accent-500/12 blur-3xl" />
        </div>

        <div className="relative px-5 pt-7 pb-8">
          {/* Trust pill */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/12 ring-1 ring-brand-500/25 px-3 py-1.5 text-[12px] font-medium text-brand-300">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21Z"/>
            </svg>
            Trusted by 12,000+ creators
          </span>

          {/* Headline */}
          <h1 className="mt-5 font-heading font-bold text-[clamp(1.875rem,7.6vw,2.5rem)] leading-[1.08] tracking-tight text-ink-50 break-words [overflow-wrap:anywhere]">
            {heroHeadline}<br />
            <span className="text-brand-500">
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
            </span>
          </h1>

          {/* Lede — shorter on mobile, second sentence dropped */}
          <p className="mt-5 text-[15px] leading-relaxed text-ink-200">
            <strong className="text-ink-50 font-semibold">60+ premium AI tools</strong>
            {" "}— ChatGPT, Claude, Midjourney, Canva, Notion AI and more — at local prices, activated in under 30 minutes.
          </p>

          {/* Primary CTAs — stacked, full-width, thumb-zone */}
          <div className="mt-7 flex flex-col gap-3">
            <Link
              href="/shop"
              className="
                flex items-center justify-center gap-2
                h-13 rounded-md
                bg-brand-500 active:bg-brand-700
                text-white font-semibold text-[15px]
                shadow-[0_12px_32px_-12px_rgba(255,122,26,0.75)]
                transition-colors
              "
            >
              Browse all tools
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </Link>
            <Link
              href="/prices"
              className="
                flex items-center justify-center
                h-13 rounded-md
                bg-white/[0.04] border border-white/10
                text-ink-50 font-semibold text-[15px]
                active:bg-white/10 transition-colors
              "
            >
              View pricing
            </Link>
          </div>

          {/* Trust chips — horizontal scroll so all three always fit any phone */}
          <div className="mt-6 -mx-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-2 px-5 pb-1 whitespace-nowrap">
              {[
                { i: "M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z", t: "Secure payment gateway" },
                { i: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",  t: "Activated < 30 min" },
                { i: "M21 12a8 8 0 0 1-11.6 7.1L4 20l.9-5.4A8 8 0 1 1 21 12Z", t: "WhatsApp support" },
              ].map((chip) => (
                <span key={chip.t} className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] ring-1 ring-white/10 px-3 py-2 text-[12px] text-ink-200">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-accent-500">
                    <path d={chip.i}/>
                  </svg>
                  {chip.t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Featured products — horizontal swipe carousel (replaces desktop's
            decorative preview card). Real, buyable items above the fold. */}
        {featured.length > 0 && (
          <div className="relative pb-2">
            <div className="px-5 mb-3 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-ink-400">
                Popular this month
              </p>
              <Link href="/shop" className="text-brand-500 text-[13px] font-semibold inline-flex items-center gap-1">
                See all
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6"/>
                </svg>
              </Link>
            </div>
            <div className="overflow-x-auto pb-5" style={{ scrollbarWidth: "none" }}>
              <div className="flex gap-3 px-5 snap-x snap-mandatory">
                {featured.slice(0, 4).map((p) => (
                  <div key={p.id} className="snap-start shrink-0 w-[64vw] max-w-[260px]">
                    <MobileHeroProductCard
                      product={p}
                      priceLabel={fmtPrice(p.price)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

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
                      { bc: "badge-brand"   },
                      { bc: "badge-accent"  },
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
      <section className="md:hidden px-5 py-8 bg-ink-950 border-y border-white/5">
        <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-ink-400 mb-4">
          How it works
        </p>
        <ol className="relative flex flex-col">
          {/* Vertical timeline line */}
          <span aria-hidden className="absolute left-[19px] top-5 bottom-5 w-px bg-gradient-to-b from-brand-500/50 via-white/10 to-accent-500/40" />
          {[
            { n: "1", t: "Browse & pick", d: "Pick from 60+ AI tools, courses & automation packs.", c: "bg-brand-500" },
            isPK
              ? { n: "2", t: "Pay in PKR", d: "JazzCash, Easypaisa, or any card — secure gateway.", c: "bg-accent-500" }
              : { n: "2", t: "Pay securely", d: "Any major card, processed through a secure gateway.", c: "bg-accent-500" },
            { n: "3", t: "Access in 30 min", d: "Login delivered to your email — often within 15 minutes.", c: "bg-brand-500" },
          ].map((step, i) => (
            <li key={step.t} className={`relative flex gap-4 ${i === 0 ? "" : "pt-4"}`}>
              <span className={`relative z-10 grid place-items-center h-10 w-10 shrink-0 rounded-full ${step.c} text-white font-bold text-[15px] ring-4 ring-ink-950`}>
                {step.n}
              </span>
              <div className="pb-1">
                <p className="text-[15px] font-semibold text-ink-50 leading-tight">{step.t}</p>
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
       * MOBILE CATEGORIES  (md:hidden) — 2-col visual tile grid
       * ─────────────────────────────────────────────────────────────── */}
      <section className="md:hidden px-5 py-9 bg-ink-1000">
        <header className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-brand-500 mb-2">What we offer</p>
          <h2 className="font-heading font-bold text-[clamp(1.625rem,6.5vw,2rem)] leading-[1.1] tracking-tight text-ink-50">
            Six categories,<br /><span className="text-ink-200">one checkout.</span>
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-200">
            Pick what fits your workflow. Mix and match — we deliver each item as soon as your payment confirms.
          </p>
        </header>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/shop#ai-subscriptions", brands: ["openai", "anthropic", "gemini"], title: "AI Subscriptions", desc: "ChatGPT, Claude, Gemini & more", tone: "brand" },
            { href: "/shop#design-tools",     brands: ["midjourney", "canva", "firefly"],  title: "Design & Image",  desc: "Midjourney, Canva, Firefly", tone: "accent" },
            { href: "/shop#productivity",     brands: ["notion", "grammarly", "clickup"],  title: "Productivity",    desc: "Notion AI, Grammarly, ClickUp", tone: "info" },
            { href: "/shop#automation",       brands: ["make", "zapier", "n8n"],           title: "Automation",      desc: "Make, Zapier, n8n flows",     tone: "warning" },
            { href: "/shop#courses",          brands: [] as string[], emoji: "🎓",         title: "Courses",         desc: "AI courses with lifetime access", tone: "success" },
            { href: "/freebies",              brands: [] as string[], emoji: "🎁",         title: "Freebies",        desc: "Free prompts & templates",       tone: "danger" },
          ].map((cat) => {
            const tones: Record<string, { bg: string; ring: string; text: string }> = {
              brand:   { bg: "bg-brand-500/12",   ring: "ring-brand-500/30",   text: "text-brand-500"   },
              accent:  { bg: "bg-accent-500/12",  ring: "ring-accent-500/30",  text: "text-accent-500"  },
              info:    { bg: "bg-[#0A84FF]/12",   ring: "ring-[#0A84FF]/30",   text: "text-[#0A84FF]"   },
              warning: { bg: "bg-[#FF9F0A]/12",   ring: "ring-[#FF9F0A]/30",   text: "text-[#FF9F0A]"   },
              success: { bg: "bg-[#30D158]/12",   ring: "ring-[#30D158]/30",   text: "text-[#30D158]"   },
              danger:  { bg: "bg-[#FF453A]/12",   ring: "ring-[#FF453A]/30",   text: "text-[#FF453A]"   },
            };
            const t = tones[cat.tone];
            return (
              <Link
                key={cat.href}
                href={cat.href}
                className={`
                  group relative flex flex-col gap-3
                  rounded-md p-4
                  bg-gradient-to-br from-white/[0.05] to-white/[0.01]
                  ring-1 ring-white/8
                  active:scale-[0.98] transition-transform
                `}
              >
                <span className={`h-11 w-11 grid place-items-center rounded-sm ${t.bg} ring-1 ${t.ring}`}>
                  {cat.brands.length > 0 ? (
                    <span className="flex -space-x-1">
                      {cat.brands.slice(0, 2).map((slug, i) => (
                        <span key={slug} className="grid place-items-center h-6 w-6 rounded-full bg-white" style={{ zIndex: 2 - i }}>
                          <BrandIcon name={slug} size={14} />
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-[20px]">{cat.emoji}</span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-ink-50 leading-tight">{cat.title}</p>
                  <p className="mt-1 text-[12px] text-ink-400 leading-snug line-clamp-2">{cat.desc}</p>
                </div>
                <span className={`mt-auto inline-flex items-center gap-1 text-[12px] font-semibold ${t.text}`}>
                  Browse
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6"/>
                  </svg>
                </span>
              </Link>
            );
          })}
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
      <section className="md:hidden px-5 py-9 bg-ink-950 border-y border-white/5">
        <header className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-brand-500 mb-2">Why SubscribAI</p>
          <h2 className="font-heading font-bold text-[clamp(1.625rem,6.5vw,2rem)] leading-[1.1] tracking-tight text-ink-50">
            {isPK ? "Built for buyers like you" : "The fastest way to access premium AI"}
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-200">
            We solve the three things that make AI subscriptions a pain — payment, delivery, and support.
          </p>
        </header>
        <div className="flex flex-col gap-3">
          {[
            isPK
              ? { i: "fa-money-bill-transfer", t: "Pay in PKR",         d: "JazzCash, Easypaisa, and any card. No forex hassle, no rejected international transactions.", bg: "#FF7A1A", brand: false }
              : { i: "fa-credit-card",         t: "Pay your way",       d: "Any major card, processed through a secure gateway. Receipts emailed instantly.",          bg: "#FF7A1A", brand: false },
            { i: "fa-bolt",       t: "Instant activation",   d: "Most subscriptions go live in under 30 minutes. Digital downloads arrive immediately via email.", bg: "#10A37F", brand: false },
            { i: "fa-rotate",     t: "Easy renewals",        d: "Renewal reminders before expiry. Replacements within 24 hours if anything goes wrong with a subscription.", bg: "#4796E3", brand: false },
            { i: "fa-whatsapp",   t: "Real human support",   d: "WhatsApp + email support, 24/7. Average reply time under 15 minutes during the day.", bg: "#25D366", brand: true },
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

      {/* ───────────────────────────────────────────────────────────────
       * MOBILE STATS  (md:hidden) — 2×2 grid with brand accents
       * ─────────────────────────────────────────────────────────────── */}
      <section className="md:hidden px-5 py-8">
        <div className="grid grid-cols-2 gap-3">
          {[
            ["12K+",    "Active customers",    "text-brand-500"],
            ["60+",     "Tools listed",        "text-accent-500"],
            ["< 30 min","Average activation",  "text-brand-500"],
            ["4.9 / 5", "Customer rating",     "text-accent-500"],
          ].map(([n, l, c]) => (
            <div key={l} className="rounded-md bg-gradient-to-br from-white/5 to-white/1 ring-1 ring-white/8 p-4 text-center">
              <p className={`font-heading font-bold text-[clamp(1.5rem,7vw,1.875rem)] leading-none ${c}`}>{n}</p>
              <p className="mt-2 text-[12px] text-ink-200 leading-tight">{l}</p>
            </div>
          ))}
        </div>
      </section>

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
      <section className="md:hidden px-5 py-9 bg-ink-950 border-y border-white/5">
        <header className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-brand-500 mb-2">Questions</p>
          <h2 className="font-heading font-bold text-[clamp(1.625rem,6.5vw,2rem)] leading-[1.1] tracking-tight text-ink-50">
            Frequently asked
          </h2>
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
                    <path d="M6 9l6 6 6-6"/>
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
       * MOBILE FINAL CTA  (md:hidden) — closing call to action
       * ─────────────────────────────────────────────────────────────── */}
      <section className="md:hidden px-5 py-10 relative overflow-hidden">
        <div aria-hidden className="absolute -top-12 -right-16 h-48 w-48 rounded-full bg-brand-500/25 blur-3xl" />
        <div aria-hidden className="absolute -bottom-12 -left-16 h-48 w-48 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="relative rounded-xl bg-gradient-to-br from-brand-500/20 via-white/5 to-accent-500/12 ring-1 ring-white/10 p-6 text-center">
          <h2 className="font-heading font-bold text-[clamp(1.625rem,6.5vw,2rem)] leading-[1.1] tracking-tight text-ink-50">
            Pick your first AI tool today
          </h2>
          <p className="mt-3 text-[14px] text-ink-200 leading-relaxed">
            Start with one subscription, scale up when you&apos;re ready. No setup fees, no contracts.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/shop"
              className="
                flex items-center justify-center gap-2
                h-13 rounded-md
                bg-brand-500 active:bg-brand-700
                text-white font-semibold text-[15px]
                shadow-[0_12px_32px_-12px_rgba(255,122,26,0.75)]
                transition-colors
              "
            >
              Browse the shop
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </Link>
            <a
              href="https://wa.me/15550132026"
              className="
                flex items-center justify-center gap-2
                h-13 rounded-md
                bg-white/[0.04] border border-white/10
                text-ink-50 font-semibold text-[15px]
                active:bg-white/10 transition-colors
              "
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366" aria-hidden>
                <path d="M20.5 3.5A11 11 0 0 0 3.4 18.1L2 22l4-1.4A11 11 0 1 0 20.5 3.5ZM12 20.2a9 9 0 0 1-4.6-1.3l-.3-.2-2.8.9.9-2.7-.2-.3a9.2 9.2 0 1 1 7 3.6Zm5-6.7c-.3-.1-1.6-.8-1.9-.9-.3-.1-.5-.1-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.8-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5L9 7.6c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.4-.3.3-1 1-1 2.4 0 1.4 1.1 2.8 1.2 3 .1.2 2.1 3.4 5.2 4.7.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.6-.7 1.9-1.3.2-.6.2-1.1.2-1.3-.1-.2-.3-.3-.6-.4Z"/>
              </svg>
              WhatsApp us
            </a>
          </div>
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
