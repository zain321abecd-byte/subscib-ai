export default function OrdersLoading() {
  return (
    <>
      <header className="admin-page-head">
        <div>
          <div className="admin-skel admin-skel-line xl w-30" />
          <div className="admin-skel admin-skel-line w-50" />
        </div>
      </header>

      {/* Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div className="admin-skel" style={{ height: 40, width: 280, borderRadius: 10 }} />
        <div className="admin-skel" style={{ height: 40, width: 160, borderRadius: 10 }} />
        <div className="admin-skel" style={{ height: 40, width: 80,  borderRadius: 10 }} />
      </div>

      {/* Table rows */}
      <div className="admin-card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 18px", display: "grid", gap: 14 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr 1fr 80px", gap: 12, alignItems: "center" }}>
              <div className="admin-skel admin-skel-line w-90" />
              <div className="admin-skel admin-skel-line w-90" />
              <div className="admin-skel admin-skel-line w-50" />
              <div className="admin-skel admin-skel-line w-70" />
              <div className="admin-skel" style={{ height: 22, width: 70, borderRadius: 999 }} />
              <div className="admin-skel admin-skel-line w-70" />
              <div className="admin-skel" style={{ height: 30, width: 60, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
