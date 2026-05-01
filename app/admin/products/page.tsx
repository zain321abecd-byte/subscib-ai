import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import DeleteButton from "./DeleteButton";
import type { ProductRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  "ai-subscriptions": "AI Subscriptions",
  "design-tools": "Design",
  "productivity": "Productivity",
  "automation": "Automation",
  "courses": "Courses",
};

export default async function ProductsAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const products = (data ?? []) as ProductRow[];

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Products</h1>
          <p>Add, edit, and reorder the catalog. Changes go live within a minute.</p>
        </div>
        <Link href="/admin/products/new" className="admin-btn admin-btn-primary">
          <i className="fa-solid fa-plus"></i> New product
        </Link>
      </header>

      {(params.created || params.updated || params.deleted) && (
        <div className="admin-card" style={{ background: "rgba(34,197,94,0.10)", borderColor: "rgba(34,197,94,0.30)", color: "#86efac", marginBottom: 14 }}>
          {params.created && <>Created <code>{params.created}</code>.</>}
          {params.updated && <>Updated <code>{params.updated}</code>.</>}
          {params.deleted && <>Deleted <code>{params.deleted}</code>.</>}
        </div>
      )}

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {error.message}
        </div>
      )}

      {products.length === 0 ? (
        <div className="admin-card admin-empty">
          <i className="fa-solid fa-box-open"></i>
          <div>No products yet. Add your first product or run the seed script to import the static catalog.</div>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Featured</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{p.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}><code>{p.id}</code></div>
                    </td>
                    <td>{CATEGORY_LABELS[p.category] || p.category}</td>
                    <td>${Number(p.price).toFixed(2)}</td>
                    <td>{p.in_stock ? "✅" : "⛔"}</td>
                    <td>{p.featured ? "★" : ""}</td>
                    <td style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <Link href={`/admin/products/${p.id}`} className="admin-btn admin-btn-ghost" style={{ padding: "6px 12px" }}>
                        Edit
                      </Link>
                      <DeleteButton id={p.id} name={p.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
