import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import ProductForm from "../ProductForm";
import type { ProductRow } from "@/lib/supabase/types";

export const metadata = { title: "Edit product" };

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServer();

  const [{ data, error }, { data: allProducts }, { data: existingReviews }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("products").select("id, name, category, image_url").order("name", { ascending: true }),
    supabase.from("reviews").select("id, name, initials, color, rating, text, approved").eq("product_id", id).order("created_at", { ascending: false }),
  ]);

  if (error || !data) notFound();
  const product = data as ProductRow;
  const availableProducts = (allProducts ?? []) as { id: string; name: string; category: string; image_url: string | null }[];
  const productReviews = (existingReviews ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    initials: r.initials,
    color: r.color || "var(--brand-soft)",
    rating: r.rating,
    text: r.text,
    approved: r.approved !== false,
  }));

  return (
    <>
      <header className="admin-page-head">
        <div>
          <p style={{ margin: 0 }}><Link href="/admin/products" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>← Products</Link></p>
          <h1>Edit · {product.name}</h1>
          <p>
            <Link href={`/product/${product.id}`} target="_blank" rel="noopener" style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
              View on site <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "0.7rem" }}></i>
            </Link>
          </p>
        </div>
      </header>
      <ProductForm product={product} availableProducts={availableProducts} productReviews={productReviews} />
    </>
  );
}
