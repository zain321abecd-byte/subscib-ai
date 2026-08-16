import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ProductTile from "@/components/ProductTile";
import ProductRail from "@/components/ProductRail";
import PremiumTestimonials, { type Testimonial } from "@/components/PremiumTestimonials";
import { getAllReviewRows } from "@/lib/reviews";
import { getAllProducts, getFeaturedProducts } from "@/lib/products";
import { getSiteSettings } from "@/lib/site-settings";
import { getRegion } from "@/lib/region";
import {
  paymentFeatureDescriptionFor,
  paymentFeatureTitleFor,
  paymentMethodFaqAnswerFor,
} from "@/lib/payment-messaging";

/**
 * Force dynamic — the public layout reads cookies() + headers() via
 * getRegion() / resolveCurrency(), which is incompatible with static
 * ISR (Next 15 raises DYNAMIC_SERVER_USAGE in production). Data
 * fetches here are already tag-cached (site_settings) or cheap.
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, allProducts, settings, region, reviewRows] = await Promise.all([
    getFeaturedProducts(8),
    getAllProducts(),
    getSiteSettings(),
    getRegion(),
    getAllReviewRows(),
  ]);
  // Payment copy differs outside Pakistan: card-only, charged in USD.
  const isPK = region === "PK";
  const featuredIds = new Set(featured.map((product) => product.id));
  const popularTiles = [
    ...featured,
    ...allProducts.filter((p) => !featuredIds.has(p.id)),
  ].slice(0, 16);
  const recommended = [
    ...featured,
    ...allProducts.filter((p) => p.showOnHomepage && !featuredIds.has(p.id)),
  ].slice(0, 12);

  /**
   * `products.tag` is a comma-separated admin field, e.g.
   * "Popular,New,Best Seller,AI". Match whole tags so "New" doesn't also hit
   * a product tagged "Renewal".
   */
  const hasTag = (p: { tag: string }, tag: string) =>
    p.tag.split(",").some((t) => t.trim().toLowerCase() === tag.toLowerCase());

  const newItems = allProducts.filter((p) => hasTag(p, "New")).slice(0, 16);
  const bestSellers = allProducts.filter((p) => hasTag(p, "Best Seller")).slice(0, 12);

  /* Map DB rows to PremiumTestimonials slides. */
  const testimonialSlides: Testimonial[] = reviewRows.map((r, i) => ({
    id: i + 1,
    name: r.name,
    role: r.product_name ?? "Customer",
    rating: r.rating ?? 5,
    text: r.text,
    mainImage: r.photo_url ?? undefined,
    mainInitials: r.initials || r.name.slice(0, 2).toUpperCase(),
    mainBg: r.color ?? "#2A5FD0",
  }));

  const waDigits = (settings.whatsapp_number || "").replace(/[^\d]/g, "");
  const waHref = waDigits ? `https://wa.me/${waDigits}` : "https://wa.me/";

  return (
    <div className="pl-home">
      <h1 className="sr-only">SubscribAI — Premium AI subscriptions and digital tools</h1>

      {/* POPULAR — square tile grid, like plati "Popular" */}
      <section className="pl-section-wrap">
        <div className="v2-container">
          <div className="pl-section">
            <ProductRail title="Popular" allHref="/shop" products={popularTiles} />
          </div>
        </div>
      </section>

      {/* NEW ITEMS — tile row, driven by the admin "New" tag. Hidden entirely
          when nothing is tagged, rather than rendering an empty row. */}
      {newItems.length > 0 && (
        <section className="pl-section-wrap">
          <div className="v2-container">
            <div className="pl-section">
              <header className="pl-section-head">
                <h2>New items</h2>
                <Link className="pl-all-btn" href="/shop">All</Link>
              </header>
              <div className="pl-tile-grid">
                {newItems.map((p) => <ProductTile key={p.id} product={p} />)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* RECOMMENDED — plati product cards with Buy buttons */}
      {recommended.length > 0 && (
        <section className="pl-section-wrap">
          <div className="v2-container">
            <div className="pl-section">
              <header className="pl-section-head">
                <h2>Recommended</h2>
                <Link className="pl-all-btn" href="/shop">All</Link>
              </header>
              <div className="pl-card-grid">
                {recommended.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* BEST SELLERS — product cards, driven by the admin "Best Seller" tag. */}
      {bestSellers.length > 0 && (
        <section className="pl-section-wrap">
          <div className="v2-container">
            <div className="pl-section">
              <header className="pl-section-head">
                <h2>Best Sellers</h2>
                <Link className="pl-all-btn" href="/shop">All</Link>
              </header>
              <div className="pl-card-grid">
                {bestSellers.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CATEGORIES — compact catalog box */}
      <section className="pl-section-wrap">
        <div className="v2-container">
          <div className="pl-section">
            <header className="pl-section-head">
              <h2>Catalog</h2>
              <Link className="pl-all-btn" href="/shop">All</Link>
            </header>
            <div className="pl-cat-grid">
              {[
                { href: "/shop#ai-subscriptions", icon: "fa-comments", title: "AI Subscriptions", desc: "ChatGPT Plus, Claude Pro, Gemini, Perplexity", accent: "#4884FF" },
                { href: "/shop#design-tools", icon: "fa-palette", title: "Design & Image AI", desc: "Midjourney, Leonardo, Firefly, Canva Pro", accent: "#A855F7" },
                { href: "/shop#productivity", icon: "fa-bolt-lightning", title: "Productivity", desc: "Notion AI, Grammarly, ClickUp AI", accent: "#F59E0B" },
                { href: "/shop#automation", icon: "fa-diagram-project", title: "Automation", desc: "Make.com, Zapier, n8n flows", accent: "#10B981" },
                { href: "/shop#courses", icon: "fa-graduation-cap", title: "Courses", desc: "Self-paced AI courses and templates", accent: "#EC4899" },
              ].map((cat) => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  className="pl-cat-item"
                  style={{ "--accent": cat.accent } as React.CSSProperties}
                >
                  <span className="pl-cat-icon"><i className={`fa-solid ${cat.icon}`}></i></span>
                  <span className="pl-cat-text">
                    <strong>{cat.title}</strong>
                    <small>{cat.desc}</small>
                  </span>
                  <i className="fa-solid fa-chevron-right pl-cat-chev" aria-hidden></i>
                  <i className={`fa-solid ${cat.icon} pl-cat-watermark`} aria-hidden></i>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHY US — compact flat strip */}
      <section className="pl-section-wrap">
        <div className="v2-container">
          <div className="pl-section">
            <header className="pl-section-head">
              <h2>Why SubscribAI</h2>
            </header>
            <div className="pl-why-grid">
              {[
                { icon: "fa-credit-card", t: paymentFeatureTitleFor(isPK), d: paymentFeatureDescriptionFor(isPK), accent: "#4884FF" },
                { icon: "fa-bolt", t: "Fast delivery", d: "Most subscriptions go live in under 30 minutes after payment.", accent: "#F59E0B" },
                { icon: "fa-rotate", t: "Easy renewals", d: "Reminders before expiry and quick replacement support.", accent: "#10B981" },
                { icon: "fa-whatsapp", t: "Human support", d: "WhatsApp and email support from a real person.", brand: true, accent: "#25D366" },
              ].map((w) => (
                <div
                  key={w.t}
                  className="pl-why-item"
                  style={{ "--accent": w.accent } as React.CSSProperties}
                >
                  <span className="pl-why-icon"><i className={`${w.brand ? "fa-brands" : "fa-solid"} ${w.icon}`}></i></span>
                  <div>
                    <strong>{w.t}</strong>
                    <small>{w.d}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CUSTOMER REVIEWS — powered by admin panel */}
      <PremiumTestimonials slides={testimonialSlides} />

      {/* FAQ */}
      <section className="pl-section-wrap">
        <div className="v2-container">
          <div className="pl-section">
            <header className="pl-section-head">
              <h2>Frequently asked</h2>
            </header>
            <div className="v2-faq">
              {[
                ["How fast do I get my subscription after paying?", "Most AI subscription accounts are activated within 30 minutes during business hours, and within a few hours overnight. You'll receive your login by email and a WhatsApp confirmation."],
                ["What payment methods do you accept?", paymentMethodFaqAnswerFor(isPK)],
                ["Are these legitimate accounts?", "Yes — every subscription is from an authorized reseller channel, family-plan slot, or our own bulk-purchase pool. We don't sell cracked or shared logins from sketchy sources."],
                ["What if my account stops working?", "Tell us on WhatsApp or email and we'll replace it within 24 hours. Subscriptions come with full-period replacement guarantees."],
                ["Can I cancel a bundle anytime?", "Yes — bundle subscriptions are month-to-month with no contracts. Cancel anytime before your renewal date and you won't be charged again."],
              ].map(([q, a]) => (
                <details key={q}><summary>{q}</summary><p>{a}</p></details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="pl-section-wrap pl-section-wrap-last">
        <div className="v2-container">
          <div className="pl-section pl-final-cta">
            <div>
              <h2>Pick your first AI tool today</h2>
              <p>Start with one subscription, scale up when you&apos;re ready. No setup fees, no contracts.</p>
            </div>
            <div className="pl-final-cta-actions">
              <Link className="btn btn-primary" href="/shop">Start shopping</Link>
              <a className="btn btn-outline" href={waHref}><i className="fa-brands fa-whatsapp"></i> WhatsApp us</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
