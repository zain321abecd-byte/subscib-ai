import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { StockItemRow, StockStatus } from "@/lib/supabase/types";
import { formatDaysLeft, normalizeStockItem, STOCK_STATUS_LABELS } from "@/lib/stock";
import DeleteStockButton from "./DeleteStockButton";
import RenewStockForm from "./RenewStockForm";
import StockFilters from "./StockFilters";
import StockStatusPill from "./StockStatusPill";

export const metadata = { title: "Stock Expiry Management" };
export const dynamic = "force-dynamic";

type Filter = "all" | "expiringSoon" | "expired" | "renewed";

function fmtDate(value: string) {
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function statusMatches(item: ReturnType<typeof normalizeStockItem>, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "renewed") return Boolean(item.renewed_at) || item.computed_status === "renewed";
  return item.computed_status === filter;
}

export default async function StockAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const filter = ((params.filter || "all") as Filter);
  const search = (params.q || "").trim().toLowerCase();
  const sort = params.sort === "expiry_desc" ? "expiry_desc" : "expiry_asc";

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("stock_items")
    .select("*")
    .order("expiry_date", { ascending: sort === "expiry_asc" })
    .limit(500);

  const allItems = ((data ?? []) as StockItemRow[]).map((item) => normalizeStockItem(item));
  const stats = {
    total: allItems.length,
    expiringSoon: allItems.filter((item) => item.computed_status === "expiringSoon").length,
    expired: allItems.filter((item) => item.computed_status === "expired").length,
    renewed: allItems.filter((item) => Boolean(item.renewed_at) || item.computed_status === "renewed").length,
  };

  const items = allItems.filter((item) => {
    const haystack = `${item.item_name} ${item.supplier_name ?? ""}`.toLowerCase();
    return (!search || haystack.includes(search)) && statusMatches(item, filter);
  });

  const expiringSoon = allItems
    .filter((item) => item.computed_status === "expiringSoon")
    .sort((a, b) => a.days_left - b.days_left)
    .slice(0, 8);
  const expired = allItems
    .filter((item) => item.computed_status === "expired")
    .sort((a, b) => a.days_left - b.days_left)
    .slice(0, 8);

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Stock Expiry Management</h1>
          <p>Track inventory expiry dates and reminder contacts before stock runs out.</p>
        </div>
        <Link href="/admin/stock/new" className="admin-btn admin-btn-primary">
          <i className="fa-solid fa-plus"></i> Add stock item
        </Link>
      </header>

      {(params.created || params.updated || params.deleted || params.renewed || params.error) && (
        <div
          className="admin-card"
          style={{
            background: params.error ? "rgba(239,68,68,0.10)" : "rgba(34,197,94,0.10)",
            borderColor: params.error ? "rgba(239,68,68,0.30)" : "rgba(34,197,94,0.30)",
            color: params.error ? "#fca5a5" : "#86efac",
            marginBottom: 14,
          }}
        >
          {params.created && <>Created stock item <code>{params.created}</code>.</>}
          {params.updated && <>Updated stock item <code>{params.updated}</code>.</>}
          {params.deleted && <>Deleted stock item <code>{params.deleted}</code>.</>}
          {params.renewed && <>Renewed stock item <code>{params.renewed}</code>.</>}
          {params.error && <>{params.error}</>}
        </div>
      )}

      <section className="admin-stats">
        <StockStat label="Total Stock Items" value={stats.total} icon="fa-boxes-stacked" />
        <StockStat label="Expiring Soon" value={stats.expiringSoon} icon="fa-clock" tone="warning" />
        <StockStat label="Expired" value={stats.expired} icon="fa-triangle-exclamation" tone="danger" />
        <StockStat label="Renewed Items" value={stats.renewed} icon="fa-rotate" tone="info" />
      </section>

      <section className="stock-alert-grid" aria-label="Expiry alerts">
        <AlertPanel title="Expiring within reminder window" icon="fa-bell" items={expiringSoon} empty="No stock is expiring soon." />
        <AlertPanel title="Expired stock" icon="fa-circle-exclamation" items={expired} empty="No expired stock items." />
      </section>

      <StockFilters count={items.length} />

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {error.message}
        </div>
      )}

      {items.length === 0 ? (
        <div className="admin-card admin-empty">
          <i className="fa-solid fa-box-open"></i>
          <div>No stock items match those filters.</div>
        </div>
      ) : (
        <div className="admin-card stock-table-card" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table stock-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Quantity</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Contact Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Item Name">
                      <div style={{ fontWeight: 700, color: "var(--text)" }}>{item.item_name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                        {[item.category, item.supplier_name].filter(Boolean).join(" · ") || "No supplier"}
                      </div>
                    </td>
                    <td data-label="Quantity">{Number(item.quantity).toLocaleString("en-PK")} {item.unit ?? ""}</td>
                    <td data-label="Expiry Date" style={{ whiteSpace: "nowrap" }}>{fmtDate(item.expiry_date)}</td>
                    <td data-label="Days Left">{formatDaysLeft(item.days_left)}</td>
                    <td data-label="Contact Email">{item.contact_email}</td>
                    <td data-label="Status"><StockStatusPill status={item.computed_status as StockStatus} /></td>
                    <td data-label="Actions">
                      <div className="stock-actions">
                        <Link href={`/admin/stock/${item.id}`} className="admin-btn admin-btn-ghost" style={{ padding: "6px 12px" }}>Edit</Link>
                        <RenewStockForm id={item.id} quantity={Number(item.quantity)} reminderDaysBeforeExpiry={item.reminder_days_before_expiry} />
                        <DeleteStockButton id={item.id} name={item.item_name} />
                      </div>
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

function StockStat({ label, value, icon, tone }: { label: string; value: number; icon: string; tone?: "warning" | "danger" | "info" }) {
  return (
    <div className={`admin-stat stock-stat ${tone ? `is-${tone}` : ""}`}>
      <div className="stock-stat-icon"><i className={`fa-solid ${icon}`}></i></div>
      <div>
        <div className="admin-stat-label">{label}</div>
        <div className="admin-stat-value">{value}</div>
      </div>
    </div>
  );
}

function AlertPanel({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: string;
  items: ReturnType<typeof normalizeStockItem>[];
  empty: string;
}) {
  return (
    <section className="admin-card stock-alert-panel">
      <header>
        <h2><i className={`fa-solid ${icon}`}></i> {title}</h2>
      </header>
      {items.length === 0 ? (
        <p className="stock-alert-empty">{empty}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <span>
                <strong>{item.item_name}</strong>
                <small>{fmtDate(item.expiry_date)} · {formatDaysLeft(item.days_left)}</small>
              </span>
              <StockStatusPill status={item.computed_status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
