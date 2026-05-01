export default function ProductsLoading() {
  return (
    <>
      <header className="admin-page-head">
        <div>
          <div className="admin-skel admin-skel-line xl w-30" />
          <div className="admin-skel admin-skel-line w-70" />
        </div>
        <div className="admin-skel" style={{ height: 40, width: 140, borderRadius: 10 }} />
      </header>

      <div className="admin-card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 18px", display: "grid", gap: 14 }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px 60px 60px 1fr", gap: 12, alignItems: "center" }}>
              <div>
                <div className="admin-skel admin-skel-line w-70" />
                <div className="admin-skel admin-skel-line w-30" />
              </div>
              <div className="admin-skel admin-skel-line w-50" />
              <div className="admin-skel admin-skel-line w-50" />
              <div className="admin-skel admin-skel-line w-30" />
              <div className="admin-skel admin-skel-line w-30" />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <div className="admin-skel" style={{ height: 30, width: 50, borderRadius: 8 }} />
                <div className="admin-skel" style={{ height: 30, width: 60, borderRadius: 8 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
