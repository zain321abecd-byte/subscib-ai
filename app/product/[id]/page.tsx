import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import AddToCartButton from "./AddToCartButton";
import { PRODUCTS, findProduct } from "@/lib/products";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://subscribai.com";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = findProduct(id);
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
  const product = findProduct(id);
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

  const related = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  return (
    <section className="v2-section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="v2-container">
        {/* Breadcrumb */}
        <nav style={{ marginBottom: "var(--space-5)", color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
          <Link href="/" style={{ color: "inherit" }}>Home</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <Link href="/shop" style={{ color: "inherit" }}>Shop</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span style={{ color: "var(--text-soft)" }}>{product.name}</span>
        </nav>

        {/* Detail */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-7)", alignItems: "start" }} className="product-detail-grid">
          <div className={`product-media ${product.mediaClass} surface-card`} style={{ height: 420, borderRadius: "var(--radius-lg)", overflow: "hidden", padding: 0 }}>
            <i className={product.iconClass} style={{ fontSize: "6rem" }}></i>
          </div>

          <div>
            <span className="badge badge-brand" style={{ marginBottom: "var(--space-3)" }}>{product.tag}</span>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-3xl)", color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: "var(--space-3)" }}>
              {product.name}
            </h1>
            <p style={{ color: "var(--text-soft)", fontSize: "var(--fs-lg)", marginBottom: "var(--space-5)" }}>
              {product.description || "Premium AI tool delivered instantly to your inbox after payment."}
            </p>

            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: "var(--space-5)" }}>
              <strong style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-4xl)", color: "var(--text)", letterSpacing: "-0.04em" }}>${product.price}</strong>
              <span style={{ color: "var(--text-muted)" }}>one-time / month</span>
            </div>

            <ul style={{ listStyle: "none", padding: 0, marginBottom: "var(--space-6)", display: "grid", gap: 10 }}>
              {[
                "Activated within 30 minutes",
                "Replacement guarantee for the full subscription period",
                "WhatsApp + email support",
                "Pay with JazzCash, Easypaisa, or Card",
              ].map((line) => (
                <li key={line} style={{ display: "flex", gap: 12, alignItems: "center", color: "var(--text-soft)" }}>
                  <i className="fa-solid fa-check" style={{ color: "var(--accent-600)", background: "var(--accent-soft)", width: 22, height: 22, borderRadius: "var(--radius-pill)", display: "inline-grid", placeItems: "center", fontSize: 11 }}></i>
                  {line}
                </li>
              ))}
            </ul>

            <AddToCartButton product={product} />
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div style={{ marginTop: "var(--space-9)" }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-2xl)", color: "var(--text)", marginBottom: "var(--space-5)" }}>You may also like</h2>
            <div className="v2-product-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
