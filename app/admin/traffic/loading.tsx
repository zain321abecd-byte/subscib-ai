export default function TrafficLoading() {
  return (
    <>
      <header className="admin-page-head">
        <div>
          <div className="admin-skel admin-skel-line xl w-30" />
          <div className="admin-skel admin-skel-line w-50" />
        </div>
      </header>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="admin-skel" style={{ height: 36, width: 110, borderRadius: 999 }} />
        ))}
      </div>

      <section className="admin-stats">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="admin-stat">
            <div className="admin-skel admin-skel-line w-50" />
            <div className="admin-skel admin-skel-line lg w-30" style={{ marginTop: 6 }} />
            <div className="admin-skel admin-skel-line w-70" style={{ marginTop: 4 }} />
          </div>
        ))}
      </section>

      <div className="admin-traffic-grid" style={{ marginTop: 18 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="admin-card">
            <div className="admin-skel admin-skel-line lg w-50" />
            <div className="admin-skel admin-skel-line w-90" style={{ marginTop: 8, marginBottom: 16 }} />
            {[0, 1, 2, 3].map((j) => (
              <div key={j} style={{ marginBottom: 10 }}>
                <div className="admin-skel admin-skel-line w-90" />
                <div className="admin-skel" style={{ height: 6, width: `${100 - j * 18}%`, borderRadius: 999, marginTop: 4 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
