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

  return (
    <>
      <header className="admin-page-head">
        <div>
          <p style={{ margin: 0 }}><Link href="/admin/products" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>← Products</Link></p>
          <h1>New product</h1>
        </div>
      </header>
      <ProductForm availableProducts={availableProducts} />
    </>
  );
}
