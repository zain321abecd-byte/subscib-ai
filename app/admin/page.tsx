import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import RealtimeOrders from "./RealtimeOrders";
import type { OrderRow } from "@/lib/supabase/types";
import type { StockItemRow } from "@/lib/supabase/types";
import { normalizeStockItem } from "@/lib/stock";

export const metadata = { title: "Dashboard" };

export const dynamic = "force-dynamic";

function fmtPKR(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(Number(n));
}

export default async function AdminDashboard() {
  const supabase = await getSupabaseServer();

  // Fetch all data in parallel.
  const [{ count: pendingCount }, { count: paidCount }, { data: recentOrders }, { count: productCount }, { count: postCount }, { data: stockRows }] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid"),
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(15),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("blog_posts").select("slug", { count: "exact", head: true }),
    supabase.from("stock_items").select("*"),
  ]);

  const orders = (recentOrders ?? []) as OrderRow[];
  const stockItems = ((stockRows ?? []) as StockItemRow[]).map((item) => normalizeStockItem(item));
  const stockSummary = {
    total: stockItems.length,
    expiringSoon: stockItems.filter((item) => item.computed_status === "expiringSoon").length,
    expired: stockItems.filter((item) => item.computed_status === "expired").length,
    renewed: stockItems.filter((item) => item.renewed_at || item.computed_status === "renewed").length,
  };

  // Sum revenue from paid orders for a quick this-week stat.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: weekPaid } = await supabase
    .from("orders")
    .select("subtotal_pkr, subtotal_usd")
    .eq("status", "paid")
    .gte("created_at", weekAgo);
  const weekRevenuePKR = (weekPaid ?? []).reduce(
    (s, o: any) => s + Number(o.subtotal_pkr ?? o.subtotal_usd ?? 0),
    0,
  );

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Recent activity, live as it happens.</p>
        </div>
      </header>

      <section className="admin-stats">
        <div className="admin-stat">
          <div className="admin-stat-label">Pending orders</div>
          <div className="admin-stat-value">{pendingCount ?? 0}</div>
          <div className="admin-stat-meta">awaiting payment confirmation</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Paid (lifetime)</div>
          <div className="admin-stat-value">{paidCount ?? 0}</div>
          <div className="admin-stat-meta">total successful orders</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Revenue · 7d</div>
          <div className="admin-stat-value">{fmtPKR(weekRevenuePKR)}</div>
          <div className="admin-stat-meta">paid orders, last 7 days</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Catalog</div>
          <div className="admin-stat-value">{productCount ?? 0} <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>products</span></div>
          <div className="admin-stat-meta">{postCount ?? 0} blog posts published</div>
        </div>
      </section>

      <section className="admin-stats" style={{ marginTop: 12 }}>
        <div className="admin-stat">
          <div className="admin-stat-label">Total Stock Items</div>
          <div className="admin-stat-value">{stockSummary.total}</div>
          <div className="admin-stat-meta">tracked inventory records</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Expiring Soon</div>
          <div className="admin-stat-value">{stockSummary.expiringSoon}</div>
          <div className="admin-stat-meta">inside reminder window</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Expired</div>
          <div className="admin-stat-value">{stockSummary.expired}</div>
          <div className="admin-stat-meta">needs replacement</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Renewed Items</div>
          <div className="admin-stat-value">{stockSummary.renewed}</div>
          <div className="admin-stat-meta">renewed at least once</div>
        </div>
      </section>

      <section className="admin-card" style={{ marginTop: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", margin: 0, color: "var(--text)" }}>Recent orders</h2>
          <Link href="/admin/orders" className="admin-btn admin-btn-ghost">View all →</Link>
        </div>

        <RealtimeOrders initial={orders} />
      </section>
    </>
  );
}

