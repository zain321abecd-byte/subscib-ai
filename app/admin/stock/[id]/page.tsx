import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { StockItemRow } from "@/lib/supabase/types";
import StockForm from "../StockForm";

export const dynamic = "force-dynamic";

export default async function EditStockItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.from("stock_items").select("*").eq("id", id).maybeSingle();
  if (error || !data) notFound();

  const item = data as StockItemRow;

  return (
    <>
      <header className="admin-page-head">
        <div>
          <p style={{ margin: 0 }}>
            <Link href="/admin/stock" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Back to Stock</Link>
          </p>
          <h1>Edit · {item.item_name}</h1>
        </div>
      </header>
      <StockForm item={item} />
    </>
  );
}
