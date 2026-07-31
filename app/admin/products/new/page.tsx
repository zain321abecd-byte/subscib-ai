import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import ProductForm from "../ProductForm";

export const metadata = { title: "New product" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("products")
    .select("id, name, category, image_url")
    .order("name", { ascending: true });
  const availableProducts = (data ?? []) as { id: string; name: string; category: string; image_url: string | null }[];

  // Auto sort order: default a new product to the end of the list instead of
  // 0, which used to tie it with every other unsorted product and push it to
  // the front of the shop.
  const { data: lastSorted } = await supabase
    .from("products")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSortOrder = ((lastSorted?.[0]?.sort_order as number | undefined) ?? 0) + 10;

  return (
    <>
      <header className="admin-page-head">
        <div>
          <p style={{ margin: 0 }}><Link href="/admin/products" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>← Products</Link></p>
          <h1>New product</h1>
        </div>
      </header>
      <ProductForm availableProducts={availableProducts} nextSortOrder={nextSortOrder} />
    </>
  );
}
