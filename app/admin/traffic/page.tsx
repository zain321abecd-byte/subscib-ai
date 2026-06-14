import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { OrderRow, TrafficSessionRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Traffic" };

type Range = "7d" | "30d" | "90d" | "all";
const RANGE_OPTIONS: { value: Range; label: string; days?: number }[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "all", label: "All time" },
];

type Bucket = {
  key: string;
  label: string;
  visitors: number;
  pageviews: number;
  activeVisitors: number;
  orders: number;
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
function normalizeSource(value: string | null) {
  const v = (value || "").toLowerCase();
  if (!v) return "direct";
  if (/google|gclid/.test(v)) return "google";
  if (/instagram|insta|ig/.test(v)) return "instagram";
  if (/facebook|fb\.|fb$|meta/.test(v)) return "facebook";
  if (/tiktok/.test(v)) return "tiktok";
  if (/youtube|youtu\.be/.test(v)) return "youtube";
  if (/twitter|x\.com/.test(v)) return "x";
  if (/linkedin/.test(v)) return "linkedin";
  if (/whatsapp|wa\.me/.test(v)) return "whatsapp";
  return v;
}
function sourceForOrder(o: OrderRow) {
  return normalizeSource(o.utm_source || hostnameOf(o.referrer || null));
}
function isPaid(o: OrderRow) {
  return o.status === "paid" || o.status === "delivered";
}
function isActive(lastSeen: string, now = Date.now()) {
  return now - new Date(lastSeen).getTime() <= 2 * 60_000;
}

function bucketizeSessions(
  sessions: TrafficSessionRow[],
  orders: OrderRow[],
  pickSessionKey: (s: TrafficSessionRow) => string | null,
  pickOrderKey?: (o: OrderRow) => string | null,
): Bucket[] {
  const now = Date.now();
  const map = new Map<string, Bucket>();
  const ensure = (key: string) => {
    const k = (key || "direct").toLowerCase();
    const cur = map.get(k) ?? { key: k, label: k, visitors: 0, pageviews: 0, activeVisitors: 0, orders: 0, revenuePkr: 0 };
    map.set(k, cur);
    return cur;
  };

  for (const s of sessions) {
    const cur = ensure(pickSessionKey(s) || "direct");
    cur.visitors += 1;
    cur.pageviews += Number(s.pageviews || 0);
    if (isActive(s.last_seen, now)) cur.activeVisitors += 1;
  }
  if (pickOrderKey) {
    for (const o of orders) {
      const cur = ensure(pickOrderKey(o) || "direct");
      cur.orders += 1;
      if (isPaid(o)) cur.revenuePkr += Number(o.subtotal_pkr ?? o.subtotal_usd ?? 0);
    }
  }

  return [...map.values()].sort((a, b) => b.visitors - a.visitors || b.orders - a.orders);
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

  let sessionsQuery = supabase.from("traffic_sessions").select("*").order("last_seen", { ascending: false }).limit(5000);
  if (sinceIso) sessionsQuery = sessionsQuery.gte("first_seen", sinceIso);

  let ordersQuery = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(2000);
  if (sinceIso) ordersQuery = ordersQuery.gte("created_at", sinceIso);

  const [{ data: sessionData, error: sessionsError }, { data: orderData, error: ordersError }] = await Promise.all([
    sessionsQuery,
    ordersQuery,
  ]);

  const sessions = (sessionData ?? []) as TrafficSessionRow[];
  const orders = (orderData ?? []) as OrderRow[];
  const activeVisitors = sessions.filter((s) => isActive(s.last_seen)).length;
  const totalVisitors = sessions.length;
  const pageviews = sessions.reduce((sum, s) => sum + Number(s.pageviews || 0), 0);
  const loggedInVisitors = sessions.filter((s) => s.user_email).length;
  const totalOrders = orders.length;
  const paidOrders = orders.filter(isPaid).length;
  const revenuePkr = orders.filter(isPaid).reduce((s, o) => s + Number(o.subtotal_pkr ?? o.subtotal_usd ?? 0), 0);

  const bySource = bucketizeSessions(sessions, orders, (s) => s.source || normalizeSource(s.utm_source || hostnameOf(s.referrer)), sourceForOrder);
  const byPlatform = bucketizeSessions(sessions, orders, (s) => s.platform || s.device_type || "unknown");
  const byDevice = bucketizeSessions(sessions, orders, (s) => s.device_type || "unknown");
  const byCampaign = bucketizeSessions(sessions, orders, (s) => s.utm_campaign || "none", (o) => o.utm_campaign || "none");

  const emails = [
    ...new Set(
      [
        ...sessions.map((s) => s.user_email),
        ...orders.map((o) => o.user_id ? o.customer_email : null),
      ]
        .filter((email): email is string => !!email)
        .map((email) => email.toLowerCase()),
    ),
  ].sort();

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Traffic</h1>
          <p>Live visitors, traffic sources, platforms, and logged-in customer emails.</p>
        </div>
      </header>

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

      {(sessionsError || ordersError) && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {sessionsError?.message || ordersError?.message}
          {sessionsError?.message?.includes("traffic_sessions") ? " Run supabase/3-traffic-sessions.sql in Supabase to enable live traffic tracking." : ""}
        </div>
      )}

      <section className="admin-stats">
        <div className="admin-stat">
          <div className="admin-stat-label">Users online now</div>
          <div className="admin-stat-value">{activeVisitors}</div>
          <div className="admin-stat-meta">active in last 2 minutes</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Visitors</div>
          <div className="admin-stat-value">{totalVisitors}</div>
          <div className="admin-stat-meta">{pageviews} pageviews</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Logged-in emails</div>
          <div className="admin-stat-value">{emails.length}</div>
          <div className="admin-stat-meta">{loggedInVisitors} signed-in visitor sessions</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Revenue</div>
          <div className="admin-stat-value">{fmtPKR(revenuePkr)}</div>
          <div className="admin-stat-meta">{paidOrders} paid of {totalOrders} orders</div>
        </div>
      </section>

      <section className="admin-traffic-grid">
        <BreakdownCard title="Traffic sources" subtitle="Google, Instagram, Facebook, direct, and other referrers" buckets={bySource} icon="fa-bullhorn" />
        <BreakdownCard title="Platforms" subtitle="Device and operating system used by visitors" buckets={byPlatform} icon="fa-desktop" />
        <BreakdownCard title="Devices" subtitle="Desktop, mobile, and tablet split" buckets={byDevice} icon="fa-mobile-screen" />
        <BreakdownCard title="Campaigns" subtitle="utm_campaign values attached to visits and orders" buckets={byCampaign} icon="fa-flag" />
      </section>

      <section className="admin-card" style={{ marginTop: 22 }}>
        <div className="admin-traffic-head" style={{ marginBottom: 12 }}>
          <span className="admin-traffic-icon"><i className="fa-solid fa-envelope"></i></span>
          <div>
            <h3>Promotional email list</h3>
            <p>Signed-in visitors and logged-in customers seen in this date range.</p>
          </div>
        </div>
        {emails.length === 0 ? (
          <div className="admin-empty" style={{ padding: 22 }}>
            <i className="fa-solid fa-envelope-open-text"></i>
            <div>No logged-in emails in this range.</div>
          </div>
        ) : (
          <div className="admin-email-list" aria-label="Logged-in email addresses">
            {emails.map((email) => <span key={email}>{email}</span>)}
          </div>
        )}
      </section>

      <section className="admin-card" style={{ marginTop: 22 }}>
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--text)", margin: "0 0 8px" }}>How tracking works</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>
          The public site stores a first-party visitor session and refreshes it while the visitor stays active. Source is taken from UTM parameters first, then referrer host, then direct. Logged-in emails are attached only when Supabase Auth confirms the current user session.
        </p>
      </section>
    </>
  );
}

function BreakdownCard({ title, subtitle, buckets, icon }: { title: string; subtitle: string; buckets: Bucket[]; icon: string }) {
  const max = buckets[0]?.visitors || 1;
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
            const pct = (b.visitors / max) * 100;
            return (
              <li key={b.key}>
                <div className="admin-traffic-row-head">
                  <strong>{b.label || "direct"}</strong>
                  <span>{b.visitors} {b.visitors === 1 ? "visitor" : "visitors"}</span>
                </div>
                <div className="admin-traffic-bar">
                  <div className="admin-traffic-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="admin-traffic-row-foot">
                  <span>{b.activeVisitors} online - {b.pageviews} views</span>
                  <span>{b.orders} orders - {fmtPKR(b.revenuePkr)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
