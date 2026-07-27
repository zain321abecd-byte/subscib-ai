import { getAllProducts, getFeaturedProducts } from "@/lib/products";
import CartClient from "./CartClient";

// Force dynamic — the public layout reads cookies() + headers() for region and
// currency, which Next 15 refuses to statically rebuild.
export const dynamic = "force-dynamic";

export default async function CartPage() {
  // Cart state lives in the browser, but the "Recommended" row needs product
  // data from the server, so fetch here and hand it to the client component.
  const [featured, allProducts] = await Promise.all([
    getFeaturedProducts(6).catch((e) => { console.error("[cart] getFeaturedProducts failed", e); return []; }),
    getAllProducts().catch((e) => { console.error("[cart] getAllProducts failed", e); return []; }),
  ]);

  // Featured first, then top up from the catalog so the row still fills out
  // when little or nothing is flagged as featured.
  const featuredIds = new Set(featured.map((p) => p.id));
  const recommended = [
    ...featured,
    ...allProducts.filter((p) => !featuredIds.has(p.id)),
  ].slice(0, 6);

  return <CartClient recommended={recommended} />;
}
