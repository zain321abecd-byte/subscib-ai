/**
 * The email screen is a compose form + status cards, not a table, so it gets
 * its own fallback rather than the shared list skeleton.
 */
export default function EmailLoading() {
  return (
    <>
      <header className="admin-page-head">
        <div style={{ flex: 1 }}>
          <div className="admin-skel admin-skel-line xl w-30" />
          <div className="admin-skel admin-skel-line w-50" />
        </div>
      </header>

      <section className="admin-stats">
        {[0, 1, 2].map((i) => (
          <div key={i} className="admin-stat">
            <div className="admin-skel admin-skel-line w-50" />
            <div className="admin-skel admin-skel-line lg w-30" style={{ marginTop: 6 }} />
          </div>
        ))}
      </section>

      <div className="admin-card" style={{ marginTop: 22 }}>
        <div className="admin-skel admin-skel-line lg w-30" style={{ marginBottom: 18 }} />
        {/* Field label + input pairs */}
        {[0, 1].map((i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div className="admin-skel admin-skel-line w-30" style={{ height: 10 }} />
            <div className="admin-skel" style={{ height: 42, borderRadius: 10 }} />
          </div>
        ))}
        {/* Message body */}
        <div className="admin-skel admin-skel-line w-30" style={{ height: 10 }} />
        <div className="admin-skel" style={{ height: 140, borderRadius: 10 }} />
        <div className="admin-skel" style={{ height: 42, width: 150, borderRadius: 10, marginTop: 18 }} />
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
