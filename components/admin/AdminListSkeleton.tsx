/**
 * Shared streaming fallback for admin list/table screens.
 *
 * Without a route-level loading.tsx these pages inherited /admin/loading.tsx,
 * which draws the dashboard's four stat tiles — a shape nothing on a list
 * page matches, so the layout jumped when the real table arrived. This mirrors
 * the list layout instead: page head, toolbar, then table rows.
 */
export default function AdminListSkeleton({
  columns = 5,
  rows = 6,
  toolbar = true,
  stats = 0,
}: {
  /** Number of column placeholders per row. */
  columns?: number;
  /** Number of placeholder rows. */
  rows?: number;
  /** Show the search/filter bar placeholder. */
  toolbar?: boolean;
  /** Number of stat tiles above the table (0 = none). */
  stats?: number;
}) {
  // Last column is narrow — it's the actions cell on every admin table.
  const template = `${"1fr ".repeat(Math.max(1, columns - 1))}90px`;

  return (
    <>
      <header className="admin-page-head">
        <div style={{ flex: 1 }}>
          <div className="admin-skel admin-skel-line xl w-30" />
          <div className="admin-skel admin-skel-line w-50" />
        </div>
        <div className="admin-skel" style={{ height: 40, width: 130, borderRadius: 10 }} />
      </header>

      {stats > 0 && (
        <section className="admin-stats">
          {Array.from({ length: stats }).map((_, i) => (
            <div key={i} className="admin-stat">
              <div className="admin-skel admin-skel-line w-50" />
              <div className="admin-skel admin-skel-line lg w-30" style={{ marginTop: 6 }} />
            </div>
          ))}
        </section>
      )}

      {toolbar && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "14px 0" }}>
          <div className="admin-skel" style={{ height: 40, width: 280, borderRadius: 10 }} />
          <div className="admin-skel" style={{ height: 40, width: 150, borderRadius: 10 }} />
        </div>
      )}

      <div className="admin-card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 18px", display: "grid", gap: 14 }}>
          {Array.from({ length: rows }).map((_, r) => (
            <div
              key={r}
              style={{ display: "grid", gridTemplateColumns: template, gap: 12, alignItems: "center" }}
            >
              {Array.from({ length: columns - 1 }).map((_, c) => (
                <div
                  key={c}
                  className={`admin-skel admin-skel-line ${c === 0 ? "w-70" : "w-90"}`}
                  style={{ marginBottom: 0 }}
                />
              ))}
              <div className="admin-skel" style={{ height: 30, width: 70, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: 10, marginTop: 18, color: "var(--text-muted)", fontSize: "0.85rem",
        }}
      >
        <span className="admin-spinner" /> Loading…
      </div>
    </>
  );
}
