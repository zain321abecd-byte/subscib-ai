import { getAllProducts } from "@/lib/products";
import ShopClient from "./ShopClient";

export const metadata = {
  title: "Shop — All AI Subscriptions",
  description: "Every AI tool, one cart. Filter by category, search by name, sort by price. Secure card checkout — local wallet options available where supported.",
  alternates: { canonical: "/shop" },
};

// Force dynamic — the public layout reads cookies() + headers() (region +
// currency), which is incompatible with static ISR in Next 15 (would
// throw DYNAMIC_SERVER_USAGE at production runtime).
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await getAllProducts();
  return <ShopClient products={products} />;
}
