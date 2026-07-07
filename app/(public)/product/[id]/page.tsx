import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGallery from "@/components/ProductGallery";
import BrandIcon from "@/components/BrandIcon";
import ProductCard from "@/components/ProductCard";
import { REVIEWS, REVIEWS_GLOBAL } from "@/components/Reviews";
import PremiumTestimonials, { type Testimonial } from "@/components/PremiumTestimonials";
import PackageBuy from "./PackageBuy";
import RichTextRenderer from "@/components/RichTextRenderer";
import { getAllProducts, getProduct } from "@/lib/products";
import { getStartingPrice } from "@/lib/pricing";
import { getRegion } from "@/lib/region";
import { getAllReviews, isSupabaseConfigured } from "@/lib/reviews";
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
  const [allProducts, region, dbReviews] = await Promise.all([
    getAllProducts().catch((e) => { console.error("[product] getAllProducts failed", e); return []; }),
    getRegion().catch((e) => { console.error("[product] getRegion failed", e); return "OTHER" as const; }),
    getAllReviews().catch((e) => { console.error("[product] getAllReviews failed", e); return []; }),
  ]);
  const isPK = region === "PK";
  const productById = new Map(allProducts.map((p) => [p.id, p]));
  const reviewPool = dbReviews.length > 0
    ? dbReviews
    : (!isSupabaseConfigured() ? (isPK ? REVIEWS : REVIEWS_GLOBAL) : []);
  const matchedReviews = reviewPool.filter((r) => r.product === product.name);
  const otherReviews = reviewPool.filter((r) => r.product !== product.name);
  const testimonialSlides: Testimonial[] = [...matchedReviews, ...otherReviews].slice(0, 6).map((r, i) => ({
    id: i + 1,
    name: r.name,
    role: r.product || r.role || "Customer",
    rating: 5,
    text: r.text,
    mainImage: r.photoUrl,
    mainInitials: r.initials || r.name.slice(0, 2).toUpperCase(),
    mainBg: r.color || "#c2410c",
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
    <section className="v2-section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="v2-container">
        {/* Refined breadcrumb */}
        <nav className="product-detail-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <i className="fa-solid fa-chevron-right"></i>
          <Link href="/shop">Shop</Link>
          <i className="fa-solid fa-chevron-right"></i>
          <span className="current">{product.name}</span>
        </nav>

        {/* Detail — layout comes from .product-detail-grid in globals.css:
            image column caps at ~460 px, content column takes the rest.
            Sticky image on desktop, stacked on mobile. */}
        <div className="product-detail-grid">
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

          <div className="product-detail-content">
            <div className="product-detail-meta">
              {(product.tag || "").split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                <span key={t} className="badge badge-brand">{t}</span>
              ))}
              <span className="stock-pill">In stock · ready to deliver</span>
            </div>

            <h1 className="product-detail-title" style={{ marginBottom: "var(--space-3)" }}>
              {product.name}
            </h1>

            {/* Rich HTML from the admin TipTap editor, sanitised on render. */}
            <RichTextRenderer
              className="product-detail-description"
              content={product.description}
              fallback={
                <p className="product-detail-tagline">
                  Premium AI tool delivered instantly to your inbox after payment.
                </p>
              }
            />

            <PackageBuy product={product} />

            <ul className="product-features-pro">
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
        </div>

      </div>

      {/* Customer reviews - same premium section as homepage, product-matched first. */}
      <PremiumTestimonials slides={testimonialSlides} />

      {related.length > 0 && (
        <div className="v2-container" style={{ marginTop: "var(--space-7)", marginBottom: "var(--space-9)" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-2xl)", color: "var(--text)", marginBottom: "var(--space-5)" }}>You may also like</h2>
          {/* Reuses `.product-grid` (4 columns on desktop, responsive
              down to 2 / 1 via existing media queries) so the related
              cards match every other grid on the site. */}
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
