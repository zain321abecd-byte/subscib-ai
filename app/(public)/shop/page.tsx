import { getAllProducts } from "@/lib/products";
import { absoluteUrl } from "@/lib/site-url";
import ShopClient from "./ShopClient";

export const metadata = {
  title: "Shop — All AI Subscriptions",
  description: "Every AI tool, one cart. Filter by category, search by name, sort by price. Secure card checkout — local wallet options available where supported.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop Premium AI Subscriptions | SubscribAI",
    description: "Browse premium AI subscriptions, design tools, productivity apps, automation packs, and courses with secure checkout.",
    url: "/shop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop Premium AI Subscriptions | SubscribAI",
    description: "Browse premium AI subscriptions and digital tools with secure checkout.",
  },
};

// Force dynamic — the public layout reads cookies() + headers() (region +
// currency), which is incompatible with static ISR in Next 15 (would
// throw DYNAMIC_SERVER_USAGE at production runtime).
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await getAllProducts();
  // ItemList schema so search engines understand this as the catalog page.
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "SubscribAI catalog",
    numberOfItems: products.length,
    itemListElement: products.slice(0, 50).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.name,
      url: absoluteUrl(`/product/${p.id}`),
    })),
  };
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "SubscribAI Shop",
    description: metadata.description,
    url: absoluteUrl("/shop"),
    mainEntity: itemListJsonLd,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Shop", item: absoluteUrl("/shop") },
      ],
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <ShopClient products={products} />
    </>
  );
}
