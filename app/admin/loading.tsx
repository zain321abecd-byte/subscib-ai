// Streaming fallback for /admin/* routes. Sidebar (in AdminShell) stays
// visible; only the main content area shows this skeleton.
export default function AdminLoading() {
  return (
    <>
      <header className="admin-page-head">
        <div style={{ flex: 1 }}>
          <div className="admin-skel admin-skel-line xl w-30" />
          <div className="admin-skel admin-skel-line w-50" />
        </div>
      </header>

      {/* Stat tile placeholders */}
      <section className="admin-stats">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="admin-stat">
            <div className="admin-skel admin-skel-line w-50" />
            <div className="admin-skel admin-skel-line lg w-30" style={{ marginTop: 6 }} />
            <div className="admin-skel admin-skel-line w-70" style={{ marginTop: 4 }} />
          </div>
        ))}
      </section>

      {/* Card placeholder */}
      <div className="admin-card" style={{ marginTop: 22 }}>
        <div className="admin-skel admin-skel-line lg w-30" style={{ marginBottom: 16 }} />
        <div className="admin-skel admin-skel-line w-90" />
        <div className="admin-skel admin-skel-line w-90" />
        <div className="admin-skel admin-skel-line w-70" />
        <div className="admin-skel admin-skel-line w-90" />
        <div className="admin-skel admin-skel-line w-50" />
      </div>

      {/* Hint to the user that something is happening */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 18, color: "var(--text-muted)", fontSize: "0.85rem", gap: 10, alignItems: "center" }}>
        <span className="admin-spinner" /> Loading…
      </div>
    </>
  );
}
