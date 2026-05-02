import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { OrderRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Traffic" };

type Range = "7d" | "30d" | "90d" | "all";
const RANGE_OPTIONS: { value: Range; label: string; days?: number }[] = [
  { value: "7d",  label: "Last 7 days",  days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "all", label: "All time" },
];

type Bucket = {
  key: string;
  label: string;
  orders: number;
  paidOrders: number;
  revenuePkr: number;
};

function fmtPKR(n: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(n || 0);
}
function fmtPct(num: number, denom: number) {
  if (!denom) return "0%";
  return `${Math.round((num / denom) * 100)}%`;
}
function hostnameOf(url: string | null) {
  if (!url) return "";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function bucketize(
  orders: OrderRow[],
  pickKey: (o: OrderRow) => string | null,
  pickLabel?: (key: string) => string,
): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const o of orders) {
    const k = (pickKey(o) || "direct").toLowerCase();
    const label = pickLabel ? pickLabel(k) : k;
    const cur = map.get(k) ?? { key: k, label, orders: 0, paidOrders: 0, revenuePkr: 0 };
    cur.orders += 1;
    if (o.status === "paid" || o.status === "delivered") {
      cur.paidOrders += 1;
      cur.revenuePkr += Number(o.subtotal_pkr ?? o.subtotal_usd ?? 0);
    }
    map.set(k, cur);
  }
  return [...map.values()].sort((a, b) => b.orders - a.orders);
}

export default async function TrafficPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const range = (params.range as Range) || "30d";
  const days = RANGE_OPTIONS.find((r) => r.value === range)?.days;
  const sinceIso = days ? new Date(Date.now() - days * 86400_000).toISOString() : null;

  const supabase = await getSupabaseServer();
  let q = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(2000);
  if (sinceIso) q = q.gte("created_at", sinceIso);
  const { data, error } = await q;

  const orders = (data ?? []) as OrderRow[];

  // Top-level totals
  const totalOrders = orders.length;
  const paidOrders = orders.filter((o) => o.status === "paid" || o.status === "delivered").length;
  const revenuePkr = orders
    .filter((o) => o.status === "paid" || o.status === "delivered")
    .reduce((s, o) => s + Number(o.subtotal_pkr ?? o.subtotal_usd ?? 0), 0);
  const directOrders = orders.filter((o) => !o.utm_source && !o.referrer).length;
  const attributedOrders = totalOrders - directOrders;

  // Buckets
  const bySource   = bucketize(orders, (o) => o.utm_source);
  const byMedium   = bucketize(orders, (o) => o.utm_medium);
  const byCampaign = bucketize(orders, (o) => o.utm_campaign);
  const byReferrer = bucketize(orders, (o) => hostnameOf(o.referrer || null) || (o.utm_source ? null : "direct"));

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Traffic</h1>
          <p>Where your customers are coming from. Filtered to {RANGE_OPTIONS.find((r) => r.value === range)?.label.toLowerCase()}.</p>
        </div>
      </header>

      {/* Range tabs */}
      <div className="admin-range-tabs" role="tablist">
        {RANGE_OPTIONS.map((r) => (
          <Link
            key={r.value}
            href={`/admin/traffic${r.value === "30d" ? "" : `?range=${r.value}`}`}
            className={`admin-range-tab ${range === r.value ? "is-active" : ""}`}
            role="tab"
            aria-selected={range === r.value}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {error.message}
        </div>
      )}

      {/* Top stats */}
      <section className="admin-stats">
        <div className="admin-stat">
          <div className="admin-stat-label">Total orders</div>
          <div className="admin-stat-value">{totalOrders}</div>
          <div className="admin-stat-meta">in this period</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Paid orders</div>
          <div className="admin-stat-value">{paidOrders}</div>
          <div className="admin-stat-meta">{fmtPct(paidOrders, totalOrders)} conversion</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Revenue</div>
          <div className="admin-stat-value">{fmtPKR(revenuePkr)}</div>
          <div className="admin-stat-meta">paid + delivered orders</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Attribution rate</div>
          <div className="admin-stat-value">{fmtPct(attributedOrders, totalOrders)}</div>
          <div className="admin-stat-meta">{attributedOrders} attributed · {directOrders} direct</div>
        </div>
      </section>

      {/* Breakdown grid */}
      <section className="admin-traffic-grid">
        <BreakdownCard
          title="Top sources"
          subtitle="utm_source — where the visitor came from (e.g. instagram, google)"
          buckets={bySource}
          icon="fa-bullhorn"
        />
        <BreakdownCard
          title="Top mediums"
          subtitle="utm_medium — type of channel (cpc, social, email, organic…)"
          buckets={byMedium}
          icon="fa-shapes"
        />
        <BreakdownCard
          title="Top campaigns"
          subtitle="utm_campaign — specific named campaign"
          buckets={byCampaign}
          icon="fa-flag"
        />
        <BreakdownCard
          title="Top referrers"
          subtitle="Where the click came from (when no UTM was set)"
          buckets={byReferrer}
          icon="fa-link"
        />
      </section>

      <section className="admin-card" style={{ marginTop: 22 }}>
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--text)", margin: "0 0 8px" }}>How attribution works</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>
          When a visitor lands with a UTM parameter (e.g. <code>?utm_source=instagram&utm_medium=stories&utm_campaign=spring</code>), we save it to a 30-day cookie. Whatever they buy in that window is attributed to that first touch. If no UTM is present, we fall back to the HTTP referrer (e.g. Google, a blog). Visitors with no UTM and no referrer count as <strong>direct</strong>.
        </p>
      </section>
    </>
  );
}

function BreakdownCard({
  title,
  subtitle,
  buckets,
  icon,
}: {
  title: string;
  subtitle: string;
  buckets: Bucket[];
  icon: string;
}) {
  const max = buckets[0]?.orders || 1;
  return (
    <div className="admin-card admin-traffic-card">
      <header className="admin-traffic-head">
        <span className="admin-traffic-icon"><i className={`fa-solid ${icon}`}></i></span>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </header>

      {buckets.length === 0 ? (
        <div className="admin-empty" style={{ padding: 22 }}>
          <i className="fa-solid fa-chart-simple"></i>
          <div>No data in this range.</div>
        </div>
      ) : (
        <ul className="admin-traffic-list">
          {buckets.slice(0, 8).map((b) => {
            const pct = (b.orders / max) * 100;
            return (
              <li key={b.key}>
                <div className="admin-traffic-row-head">
                  <strong>{b.label || "—"}</strong>
                  <span>{b.orders} {b.orders === 1 ? "order" : "orders"}</span>
                </div>
                <div className="admin-traffic-bar">
                  <div className="admin-traffic-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="admin-traffic-row-foot">
                  <span>{b.paidOrders} paid</span>
                  <span>{fmtPKR(b.revenuePkr)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
