import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGallery from "@/components/ProductGallery";
import FavoriteButton from "@/components/FavoriteButton";
import BrandIcon from "@/components/BrandIcon";
import ProductCard from "@/components/ProductCard";
import PremiumTestimonials, { type Testimonial } from "@/components/PremiumTestimonials";
import PackageBuy from "./PackageBuy";
import RichTextRenderer from "@/components/RichTextRenderer";
import DescriptionExpander from "@/components/DescriptionExpander";
import SidebarScrollSync from "@/components/SidebarScrollSync";
import { getAllProducts, getProduct } from "@/lib/products";
import { getSiteSettings } from "@/lib/site-settings";
import { getStartingPrice } from "@/lib/pricing";
import { getRegion } from "@/lib/region";
import { getAllReviews } from "@/lib/reviews";
import { formatSoldCount, getUnitsSold } from "@/lib/sold-count";
import { paymentFeatureTitle } from "@/lib/payment-messaging";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";

// Product pages render on-demand from the database (dynamicParams defaults to
// true). We don't pre-generate any ids so no dummy/seed URLs are ever built —
// the DB is the single source of truth.
export function generateStaticParams() {
  return [] as { id: string }[];
}

/**
 * Render on every request. We used to run this as ISR (revalidate = 60),
 * but the public layout now touches `cookies()` / `headers()` via
 * getRegion() for currency + geo — Next 15 refuses to statically
 * rebuild a route whose subtree reads per-request state and throws
 * `DYNAMIC_SERVER_USAGE` at production runtime. Data fetching inside
 * this component is already tag-cached (site_settings) or naturally
 * fast (single Supabase row lookup), so switching to on-demand costs
 * us nothing meaningful.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return {};
  const title = `${product.name} — Premium AI Subscription`;
  const desc = product.description
    ? `${product.description} Activated to your email in under 30 minutes.`
    : `${product.name} — activated to your email in under 30 minutes.`;
  return {
    title,
    description: desc,
    alternates: { canonical: `/product/${product.id}` },
    openGraph: {
      type: "website",
      title,
      description: desc,
      url: absoluteUrl(`/product/${product.id}`),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  // JSON-LD Product schema for rich Google results
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || `${product.name} — premium AI subscription, delivered to your inbox in under 30 minutes.`,
    category: product.category,
    brand: { "@type": "Brand", name: product.brand || product.name },
    offers: {
      // "Starting from" price for rich Google results — matches what
      // the shopper sees on cards + on the initial state of this page.
      "@type": "Offer",
      url: absoluteUrl(`/product/${product.id}`),
      priceCurrency: "USD",
      price: getStartingPrice(product),
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "SubscribAI" },
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Shop", item: absoluteUrl("/shop") },
      { "@type": "ListItem", position: 3, name: product.name, item: absoluteUrl(`/product/${product.id}`) },
    ],
  };

  // Every fetch here has its own try/catch and returns a safe empty
  // fallback — but keep an additional guard around the batch so a
  // single misbehaving helper (env not set on the deploy target,
  // Supabase timing out, etc.) can't take down the page.
  const [allProducts, region, dbReviews, settings, unitsSold] = await Promise.all([
    getAllProducts().catch((e) => { console.error("[product] getAllProducts failed", e); return []; }),
    getRegion().catch((e) => { console.error("[product] getRegion failed", e); return "OTHER" as const; }),
    getAllReviews().catch((e) => { console.error("[product] getAllReviews failed", e); return []; }),
    getSiteSettings().catch((e) => { console.error("[product] getSiteSettings failed", e); return {} as Record<string, string>; }),
    getUnitsSold(product.id).catch((e) => { console.error("[product] getUnitsSold failed", e); return null; }),
  ]);
  const isPK = region === "PK";
  const waDigits = (settings.whatsapp_number || "").replace(/[^\d]/g, "");
  const waHref = waDigits ? `https://wa.me/${waDigits}` : "/contact";
  const productById = new Map(allProducts.map((p) => [p.id, p]));
  const reviewPool = dbReviews;
  const matchedReviews = reviewPool.filter((r) => r.product === product.name);
  const otherReviews = reviewPool.filter((r) => r.product !== product.name);
  const reviewCount = matchedReviews.length > 0 ? matchedReviews.length : reviewPool.length;
  const testimonialSlides: Testimonial[] = [...matchedReviews, ...otherReviews].slice(0, 6).map((r, i) => ({
    id: i + 1,
    name: r.name,
    role: r.product || r.role || "Customer",
    rating: 5,
    text: r.text,
    mainImage: r.photoUrl,
    mainInitials: r.initials || r.name.slice(0, 2).toUpperCase(),
    mainBg: r.color || "#2A5FD0",
  }));

  // Prefer the admin's hand-picked recommendations (preserve order). If empty,
  // fall back to category-based suggestions filtered by show_in_related.
  let related: typeof allProducts = [];
  if (product.relatedProductIds && product.relatedProductIds.length > 0) {
    related = product.relatedProductIds
      .map((rid) => productById.get(rid))
      .filter((p): p is NonNullable<typeof p> => !!p && p.id !== product.id)
      .slice(0, 8);
  }
  if (related.length === 0) {
    related = allProducts
      .filter((p) => p.category === product.category && p.id !== product.id && (p.showInRelated ?? true))
      .slice(0, 4);
  }

  return (
    <section className="v2-section pl-pd-section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="v2-container">
        {/* Breadcrumb — plati style with home icon */}
        <nav className="product-detail-breadcrumb" aria-label="Breadcrumb">
          <Link href="/"><i className="fa-solid fa-house" aria-hidden></i> Home</Link>
          <i className="fa-solid fa-chevron-right"></i>
          <Link href="/shop">Shop</Link>
          <i className="fa-solid fa-chevron-right"></i>
          <span className="current">{product.name}</span>
        </nav>

        {/* Plati layout: main content box (image + title + description) on the
            left, buy/trust/seller sidebar on the right. On mobile the wrappers
            switch to display:contents and the pieces reflow into plati's
            mobile order via CSS `order`. */}
        <div className="pl-pd-layout">
          <div className="pl-pd-main">
            <div className="pl-pd-top">
              <div className="product-detail-media-col">
                {(() => {
                  const allImages = [
                    ...(product.imageUrl ? [product.imageUrl] : []),
                    ...(product.gallery ?? []),
                  ];
                  if (allImages.length > 0) {
                    return <ProductGallery images={allImages} alt={product.name} />;
                  }
                  // No uploaded image — match the home page's BrandIcon fallback so
                  // products like ChatGPT / Claude / Midjourney show their real
                  // brand logo here too, not a generic Font Awesome glyph.
                  if (product.brand) {
                    return (
                      <div className="product-detail-brand-media">
                        <BrandIcon name={product.brand} size={120} />
                      </div>
                    );
                  }
                  return (
                    <div className={`product-media ${product.mediaClass} surface-card product-detail-icon-media`}>
                      <i className={product.iconClass}></i>
                    </div>
                  );
                })()}
              </div>

              <div className="pl-pd-titleblock">
                <FavoriteButton productId={product.id} />
                <h1 className="product-detail-title pl-detail-title">{product.name}</h1>
                {/* Plati meta row: muted stats separated by dots, blue Reviews
                    link. Stats with nothing real behind them are omitted
                    rather than shown as zero. */}
                <div className="pl-pd-metarow">
                  {unitsSold != null && unitsSold > 0 && (
                    <>
                      <span className="pl-pd-stock">Sold {formatSoldCount(unitsSold)}</span>
                      <span className="pl-pd-dot" aria-hidden>•</span>
                    </>
                  )}
                  <span className="pl-pd-stock">In stock</span>
                  <span className="pl-pd-dot" aria-hidden>•</span>
                  <span className="pl-pd-stock">Instant delivery</span>
                  {reviewCount > 0 && (
                    <>
                      <span className="pl-pd-dot" aria-hidden>•</span>
                      <a className="pl-pd-reviews-link" href="#reviews">Reviews {reviewCount}</a>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Section tabs — plati's Description | Reviews | Related */}
            <nav className="pl-detail-tabs" aria-label="Product sections">
              <a href="#description" className="is-active">Description</a>
              <a href="#reviews">Reviews</a>
              <a href="#related">Related</a>
            </nav>

            {/* Rich HTML from the admin TipTap editor, sanitised on render. */}
            <div className="pl-detail-description" id="description">
              <h2 className="pl-desc-heading">Product description</h2>
              <DescriptionExpander>
                <RichTextRenderer
                  className="product-detail-description"
                  content={product.description}
                  fallback={
                    <p className="product-detail-tagline">
                      Premium AI tool delivered instantly to your inbox after payment.
                    </p>
                  }
                />
              </DescriptionExpander>
            </div>

            <ul className="product-features-pro pl-detail-features">
              {(product.features && product.features.length > 0
                ? product.features
                : [
                    "Activated within 30 minutes",
                    "Replacement guarantee for the full subscription period",
                    "WhatsApp + email support",
                    paymentFeatureTitle,
                  ]
              ).map((line) => (
                <li key={line}>
                  <i className="fa-solid fa-check"></i>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="pl-pd-side">
            <SidebarScrollSync />
            {/* Price + options + Buy now — plati's right-hand buy box */}
            <div className="pl-pd-buybox">
              <PackageBuy product={product} />
            </div>

            {/* Trust chips — plati's "Secure deal / Instant delivery" box */}
            <div className="pl-trust-chips pl-pd-sidebox" aria-label="Guarantees">
              <span className="pl-trust-chip">
                <i className="fa-solid fa-shield-halved pl-trust-secure"></i> Secure deal
              </span>
              <span className="pl-trust-chip">
                <i className="fa-solid fa-bolt pl-trust-instant"></i> Instant delivery
              </span>
            </div>

            {/* Store card — plati's seller box, adapted to SubscribAI */}
            <div className="pl-pd-seller pl-pd-sidebox">
              <div className="pl-pd-seller-head">
                <i className="fa-solid fa-store" aria-hidden></i>
                <strong>SubscribAI</strong>
                <span className="pl-pd-verified"><i className="fa-solid fa-circle-check"></i> Verified store</span>
              </div>
              <a className="pl-pd-seller-chat" href={waHref} target="_blank" rel="noopener">
                Write to us <span className="pl-pd-online"><i className="fa-solid fa-circle"></i> Online</span>
              </a>
            </div>
          </aside>
        </div>

      </div>

      {/* Customer reviews - same premium section as homepage, product-matched first. */}
      <div id="reviews">
        <PremiumTestimonials slides={testimonialSlides} />
      </div>

      {related.length > 0 && (
        <div className="v2-container" id="related" style={{ marginTop: "var(--space-7)", marginBottom: "var(--space-9)" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-2xl)", color: "#fff", fontWeight: 700, marginBottom: "var(--space-5)" }}>You may also like</h2>
          {/* Same plati card grid as the homepage — 6/4/3 columns on
              desktop, single-column list cards on mobile. */}
          <div className="pl-card-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
