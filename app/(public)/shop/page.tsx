import { getAllProducts } from "@/lib/products";
import ShopClient from "./ShopClient";

export const metadata = {
  title: "Shop — All AI Subscriptions",
  description: "Every AI tool, one cart. Filter by category, search by name, sort by price. Pay with JazzCash, Easypaisa, or Card.",
  alternates: { canonical: "/shop" },
};

// Re-fetch from DB at most every 60s on production. Admin saves trigger
// revalidation explicitly via revalidatePath, so users see changes instantly.
export const revalidate = 60;

export default async function ShopPage() {
  const products = await getAllProducts();
  return <ShopClient products={products} />;
}
