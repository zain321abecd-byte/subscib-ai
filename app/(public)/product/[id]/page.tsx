import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/ProductGallery";
import Reviews, { REVIEWS } from "@/components/Reviews";
import PackageBuy from "./PackageBuy";
import { STATIC_PRODUCTS, getAllProducts, getProduct } from "@/lib/products";

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
  const title = `${product.name} — Buy in Pakistan, Pay in PKR`;
  const desc = product.description
    ? `${product.description} Activated to your email in under 30 minutes. Pay via JazzCash, Easypaisa, or Card.`
    : `${product.name} — paid in PKR, activated to your email in under 30 minutes.`;
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
    description: product.description || `${product.name} — premium AI subscription delivered to Pakistan in PKR.`,
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

  const allProducts = await getAllProducts();
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
            return allImages.length > 0 ? (
              <ProductGallery images={allImages} alt={product.name} />
            ) : (
              <div className={`product-media ${product.mediaClass} surface-card`} style={{ height: 420, borderRadius: "var(--radius-lg)", overflow: "hidden", padding: 0 }}>
                <i className={product.iconClass} style={{ fontSize: "6rem" }}></i>
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
                    "Pay with JazzCash, Easypaisa, or Card",
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

      {/* Customer reviews — show product-matched first, then fill with the rest */}
      <Reviews
        eyebrow="Customer reviews"
        title="What customers say about us"
        reviews={(() => {
          const matched = REVIEWS.filter((r) => r.product === product.name);
          const others  = REVIEWS.filter((r) => r.product !== product.name);
          return [...matched, ...others].slice(0, 3);
        })()}
      />

      {related.length > 0 && (
        <div className="v2-container" style={{ marginTop: "var(--space-7)", marginBottom: "var(--space-9)" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-2xl)", color: "var(--text)", marginBottom: "var(--space-5)" }}>You may also like</h2>
          <div className="v2-product-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </section>
  );
}
