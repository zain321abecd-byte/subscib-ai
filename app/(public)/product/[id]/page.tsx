import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGallery from "@/components/ProductGallery";
import BrandIcon from "@/components/BrandIcon";
import MobileHeroProductCard from "@/components/MobileHeroProductCard";
import Reviews, { REVIEWS, REVIEWS_GLOBAL } from "@/components/Reviews";
import PackageBuy from "./PackageBuy";
import { STATIC_PRODUCTS, getAllProducts, getProduct } from "@/lib/products";
import { getRegion } from "@/lib/region";
import { getSiteSettings } from "@/lib/site-settings";
import { getAllReviews, isSupabaseConfigured } from "@/lib/reviews";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://subscribai.com";

// Static params come from the static fallback (build-time). New products added
// via the admin panel are still served — Next.js falls back to dynamic SSR for
// unknown ids when dynamicParams is true (the default).
export function generateStaticParams() {
  return STATIC_PRODUCTS.map((p) => ({ id: p.id }));
}

// Re-render product pages at most every 60s; admin saves call revalidatePath.
export const revalidate = 60;

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
      url: `${SITE_URL}/product/${product.id}`,
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
      "@type": "Offer",
      url: `${SITE_URL}/product/${product.id}`,
      priceCurrency: "USD",
      price: product.price,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "SubscribAI" },
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE_URL}/shop` },
      { "@type": "ListItem", position: 3, name: product.name, item: `${SITE_URL}/product/${product.id}` },
    ],
  };

  const [allProducts, region, dbReviews, settings] = await Promise.all([
    getAllProducts(),
    getRegion(),
    getAllReviews(),
    getSiteSettings(),
  ]);
  const isPK = region === "PK";
  const fxRate = Number(settings.fx_rate_pkr_per_usd) || 280;
  const fmtPrice = (pkr: number) => isPK
    ? `Rs ${Math.round(pkr).toLocaleString("en-PK")} / mo`
    : `$${(pkr / fxRate).toFixed(2)} / mo`;
  const productById = new Map(allProducts.map((p) => [p.id, p]));

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

        {/* Detail */}
        <div className="product-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
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

          <div>
            <div className="product-detail-meta">
              {(product.tag || "").split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                <span key={t} className="badge badge-brand">{t}</span>
              ))}
              <span className="stock-pill">In stock · ready to deliver</span>
            </div>

            <h1 className="product-detail-title" style={{ marginBottom: "var(--space-3)" }}>
              {product.name}
            </h1>

            <p className="product-detail-tagline">
              {product.description || "Premium AI tool delivered instantly to your inbox after payment."}
            </p>

            <PackageBuy product={product} />

            <ul className="product-features-pro">
              {(product.features && product.features.length > 0
                ? product.features
                : [
                    "Activated within 30 minutes",
                    "Replacement guarantee for the full subscription period",
                    "WhatsApp + email support",
                    isPK ? "Pay with JazzCash, Easypaisa, or Card" : "Secure payment by major card",
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

      {/* Customer reviews — admin-curated from DB. Product-matched shown first.
          Static region pool only used in dev (no Supabase configured). */}
      <Reviews
        eyebrow="Customer reviews"
        title="What customers say about us"
        reviews={(() => {
          let pool: typeof dbReviews;
          if (dbReviews.length > 0) pool = dbReviews;
          else if (!isSupabaseConfigured()) pool = isPK ? REVIEWS : REVIEWS_GLOBAL;
          else pool = [];
          const matched = pool.filter((r) => r.product === product.name);
          const others  = pool.filter((r) => r.product !== product.name);
          return [...matched, ...others].slice(0, 3);
        })()}
      />

      {related.length > 0 && (
        <div className="v2-container" style={{ marginTop: "var(--space-7)", marginBottom: "var(--space-9)" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-2xl)", color: "var(--text)", marginBottom: "var(--space-5)" }}>You may also like</h2>
          <div className="related-rail">
            {related.map((p) => (
              <MobileHeroProductCard
                key={p.id}
                product={p}
                priceLabel={fmtPrice(p.price)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
