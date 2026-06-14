import Link from "next/link";
import StockForm from "../StockForm";

export const metadata = { title: "New stock item" };
export const dynamic = "force-dynamic";

export default function NewStockItemPage() {
  return (
    <>
      <header className="admin-page-head">
        <div>
          <p style={{ margin: 0 }}>
            <Link href="/admin/stock" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Back to Stock</Link>
          </p>
          <h1>New stock item</h1>
        </div>
      </header>
      <StockForm />
    </>
  );
}
