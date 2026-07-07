import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import HeroTypewriter from "@/components/HeroTypewriter";
import BrandIcon from "@/components/BrandIcon";
import PremiumTestimonials, { type Testimonial } from "@/components/PremiumTestimonials";
import { getAllReviewRows } from "@/lib/reviews";
import TrustBadges from "@/components/TrustBadges";
import { getFeaturedProducts } from "@/lib/products";
import { getSiteSettings } from "@/lib/site-settings";
import { getRegion } from "@/lib/region";
import { Price } from "@/lib/fx";
import { getStartingPrice } from "@/lib/pricing";
import {
  paymentFeatureDescription,
  paymentFeatureTitle,
  paymentMethodFaqAnswer,
  replaceLegacyPaymentCopy,
} from "@/lib/payment-messaging";
import type { Product } from "@/lib/products";

/**
 * Force dynamic — the public layout reads cookies() + headers() via
 * getRegion() / resolveCurrency(), which is incompatible with static
 * ISR (Next 15 raises DYNAMIC_SERVER_USAGE in production). Data
 * fetches here are already tag-cached (site_settings) or cheap.
 */
export const dynamic = "force-dynamic";

function ProductMiniLogo({ product }: { product: Product }) {
  if (product.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={product.imageUrl} alt="" loading="lazy" />
    );
  }
  if (product.brand) return <BrandIcon name={product.brand} size={22} />;
  return <i className={product.iconClass} style={{ color: "#0F172A", fontSize: 14 }}></i>;
}

export default async function HomePage() {
  const [featured, settings, region, reviewRows] = await Promise.all([
    getFeaturedProducts(4),
    getSiteSettings(),
    getRegion(),
    getAllReviewRows(),
  ]);

  /* Map DB rows to PremiumTestimonials slides. */
  const testimonialSlides: Testimonial[] = reviewRows.map((r, i) => {
    return {
      id: i + 1,
      name: r.name,
      role: r.product_name ?? "Customer",
      rating: r.rating ?? 5,
      text: r.text,
      mainImage: r.photo_url ?? undefined,
      mainInitials: r.initials || r.name.slice(0, 2).toUpperCase(),
      mainBg: r.color ?? "#c2410c",
    };
  });
  const isPK = region === "PK";
  const isIN = region === "IN";
  const localCurrency = isPK ? "PKR" : isIN ? "INR" : "USD";
  // Dynamic WhatsApp link from site_settings (digits only after cleanup).
  const waDigits = (settings.whatsapp_number || "").replace(/[^\d]/g, "");
  const waHref = waDigits ? `https://wa.me/${waDigits}` : "https://wa.me/";
  // For non-PK visitors, strip any PKR/Pakistan/JazzCash/Easypaisa references the
  // admin may have saved. Foreign visitors must never see Pakistan-specific copy.
  const sanitizeForGlobal = (s: string) =>
    s.replace(/\s*[—,-]?\s*paid in PKR/gi, "")
      .replace(/\s*[—,-]?\s*in Pakistan/gi, "")
      .replace(/JazzCash,?\s*/gi, "")
      .replace(/Easypaisa,?\s*/gi, "")
      .replace(/PKR/g, localCurrency)
      .replace(/\s+,/g, ",")
      .trim();
  const rawHeadline = replaceLegacyPaymentCopy(settings.hero_headline || "Premium AI subscriptions,");
  const heroHeadline = isPK ? rawHeadline : sanitizeForGlobal(rawHeadline);
  const rawSubtext = settings.hero_subtext;
  const heroSubtext = rawSubtext
    ? (isPK ? replaceLegacyPaymentCopy(rawSubtext) : sanitizeForGlobal(replaceLegacyPaymentCopy(rawSubtext)))
    : `${paymentFeatureDescription} Activated to your inbox within 30 minutes, backed by replacement guarantees and real WhatsApp support.`;


  return (
    <div className="home-mobile-polish">
      <div>
        <section className="v2-hero">
          <div className="v2-hero-bg" aria-hidden />
          <div className="v2-container v2-hero-grid">
            <div className="v2-hero-copy">
              <span className="badge badge-brand"><i className="fa-solid fa-heart"></i> Trusted by 12,000+ creators</span>
              <h1>
                {heroHeadline}<br />
                <HeroTypewriter isPK={isPK} />
              </h1>
              <p className="v2-lede">
                <strong>Premium AI subscriptions without the payment headache.</strong> Get ChatGPT, Claude, Midjourney, Canva, Notion AI, automation packs, and courses from one checkout.
              </p>
              <p className="v2-lede v2-lede-secondary">
                {heroSubtext}
              </p>
              <div className="v2-hero-ctas">
                <Link className="btn btn-primary btn-large" href="/shop">Browse all tools <i className="fa-solid fa-arrow-right"></i></Link>
                <Link className="btn btn-outline btn-large" href="/prices">View pricing</Link>
              </div>
              <ul className="v2-trust-row">
                <li><i className="fa-solid fa-shield-halved"></i> Secure checkout</li>
                <li><i className="fa-solid fa-clock"></i> Delivery in 30 min</li>
                <li><i className="fa-brands fa-whatsapp"></i> Real support</li>
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
                            <span className={`v2-mini-icon ${p.imageUrl ? "has-product-image" : ""}`} style={{ background: "#ffffff" }}>
                              <ProductMiniLogo product={p} />
                            </span>
                            <div>
                              <strong>{p.name}</strong>
                              {/* Show the starting/cheapest variant. The "From " prefix was
                                  removed from cards per current design — the shopper still sees
                                  the entry-level number, which is what getStartingPrice picks. */}
                              <small>
                                <Price pkr={getStartingPrice(p)} /> / month
                              </small>
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
      {/* QUICK VALUE STRIP */}
      <section className="v2-value-strip">
        <div className="v2-container v2-value-grid">
          {[
            { i: "fa-mobile-screen-button", t: "1. Pick your tool", d: "Choose AI subscriptions, courses, or automation packs." },
            { i: "fa-money-bill-transfer", t: paymentFeatureTitle, d: paymentFeatureDescription },
            { i: "fa-envelope-circle-check", t: "3. Get access fast", d: "Login details delivered by email, usually within minutes." },
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

      {/* FEATURED PRODUCTS */}
      <section className="v2-section reveal">
        <div className="v2-container">
          <header className="v2-section-head v2-section-head-split">
            <div>
              <p className="v2-eyebrow">Popular now</p>
              <h2>Top subscriptions buyers pick again</h2>
            </div>
            <Link href="/shop" className="btn btn-outline">View all <i className="fa-solid fa-arrow-right"></i></Link>
          </header>
          <div className="v2-product-grid">
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="v2-section v2-section-elevated reveal">
        <div className="v2-container">
          <header className="v2-section-head">
            <p className="v2-eyebrow">Subscriptions we sell</p>
            <h2>AI tools, courses, and automation packs</h2>
            <p>Pick the tool you need, pay once, and get clear access details without juggling multiple stores.</p>
          </header>
          <div className="v2-cat-grid reveal reveal-stagger">
            {[
              { href: "/shop#ai-subscriptions", brands: ["openai", "anthropic", "gemini"], icon: "fa-comments", title: "AI Subscriptions", desc: "ChatGPT Plus, Claude Pro, Gemini, Perplexity, and more premium AI plans.", c: "var(--brand-600)", bg: "var(--brand-soft)" },
              { href: "/shop#design-tools", brands: ["midjourney", "canva", "firefly"], icon: "fa-palette", title: "Design & Image AI", desc: "Midjourney, Leonardo, Adobe Firefly, and Canva Pro for creators.", c: "var(--accent-600)", bg: "var(--accent-soft)" },
              { href: "/shop#productivity", brands: ["notion", "grammarly", "clickup"], icon: "fa-bolt-lightning", title: "Productivity Tools", desc: "Notion AI, Grammarly Premium, ClickUp AI, and research tools.", c: "var(--info-500)", bg: "var(--info-soft)" },
              { href: "/shop#automation", brands: ["make", "zapier", "n8n"], icon: "fa-diagram-project", title: "Automation Packs", desc: "Make.com, Zapier templates, and n8n flows ready to import.", c: "var(--warning-500)", bg: "var(--warning-soft)" },
              { href: "/shop#courses", brands: [] as string[], icon: "fa-graduation-cap", title: "Courses & Tutorials", desc: "Self-paced AI courses with downloadable templates and lifetime access.", c: "var(--success-500)", bg: "var(--success-soft)" },
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

      {/* LOGO BAND - brand recognition (demoted lower) */}
      <section className="v2-logos">
        <div className="v2-container">
          <p className="v2-logos-label">Subscriptions and tools available</p>
          <div className="v2-logos-row">
            {[
              ["fa-comments", "ChatGPT"], ["fa-bolt", "Claude"], ["fa-palette", "Midjourney"],
              ["fa-pen-ruler", "Canva"], ["fa-cube", "Notion AI"], ["fa-video", "CapCut"], ["fa-microphone", "ElevenLabs"],
              ["fa-ellipsis", "& many others"],
            ].map(([icon, name]) => (
              <span key={name}><i className={`fa-solid ${icon}`}></i> {name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST BADGES - concrete promises before the discursive "why us" section */}
      <TrustBadges />

      {/* WHY US */}
      <section className="v2-section v2-section-elevated reveal">
        <div className="v2-container">
          <header className="v2-section-head">
            <p className="v2-eyebrow">Why SubscribAI</p>
            <h2>Why buyers choose SubscribAI</h2>
            <p>We make premium tools easier to buy, faster to receive, and simpler to renew.</p>
          </header>
          <div className="v2-why-grid reveal reveal-stagger">
            {[
              { icon: "fa-credit-card", t: paymentFeatureTitle, d: paymentFeatureDescription, bg: "#FF7A1A" },
              { icon: "fa-bolt", t: "Fast delivery", d: "Most subscriptions go live in under 30 minutes after payment.", bg: "#FF7A1A" },
              { icon: "fa-rotate", t: "Easy renewals", d: "Get reminders before expiry and quick replacement support if needed.", bg: "#C85B08" },
              { icon: "fa-whatsapp", t: "Human support", d: "WhatsApp and email support from a real person when you need help.", bg: "#C85B08", brand: true },
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

      {/* CUSTOMER REVIEWS - powered by admin panel, falls back to static data */}
      <PremiumTestimonials slides={testimonialSlides} />

      {/* STATS - desktop only */}
      <section className="v2-stats-band reveal">
        <div className="v2-container v2-stats-grid">
          {[["12K+", "Active customers"], ["60+", "Tools listed"], ["< 30 min", "Average activation"], ["4.9 / 5", "Customer rating"]].map(([n, l]) => (
            <div key={l}><strong>{n}</strong><span>{l}</span></div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="v2-section v2-section-elevated reveal">
        <div className="v2-container v2-faq-wrap">
          <header className="v2-section-head">
            <p className="v2-eyebrow">Questions</p>
            <h2>Frequently asked</h2>
          </header>
          <div className="v2-faq reveal reveal-stagger">
            {[
              ["How fast do I get my subscription after paying?", "Most AI subscription accounts are activated within 30 minutes during business hours, and within a few hours overnight. You'll receive your login by email and a WhatsApp confirmation."],
              ["What payment methods do you accept?", paymentMethodFaqAnswer],
              ["Are these legitimate accounts?", "Yes — every subscription is from an authorized reseller channel, family-plan slot, or our own bulk-purchase pool. We don't sell cracked or shared logins from sketchy sources."],
              ["What if my account stops working?", "Tell us on WhatsApp or email and we'll replace it within 24 hours. Subscriptions come with full-period replacement guarantees."],
              ["Can I cancel a bundle anytime?", "Yes — bundle subscriptions are month-to-month with no contracts. Cancel anytime before your renewal date and you won't be charged again."],
            ].map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="v2-section">
        <div className="v2-container">
          <div className="v2-final-cta reveal">
            <div>
              <h2>Pick your first AI tool today</h2>
              <p>Start with one subscription, scale up when you&apos;re ready. No setup fees, no contracts.</p>
            </div>
            <div className="v2-final-cta-actions">
              <Link className="btn btn-primary btn-large" href="/shop">Browse the shop <i className="fa-solid fa-arrow-right"></i></Link>
              <a className="btn btn-outline btn-large" href={waHref}><i className="fa-brands fa-whatsapp"></i> WhatsApp us</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
