export default function FormLoading() {
  return (
    <>
      <header className="admin-page-head">
        <div>
          <div className="admin-skel admin-skel-line w-30" />
          <div className="admin-skel admin-skel-line xl w-50" />
        </div>
      </header>

      {[0, 1, 2].map((i) => (
        <div key={i} className="admin-card" style={{ marginBottom: 14 }}>
          <div className="admin-skel admin-skel-line lg w-30" style={{ marginBottom: 16 }} />
          <div className="admin-skel admin-skel-line w-70" />
          <div className="admin-skel admin-skel-line w-90" />
          <div className="admin-skel admin-skel-line w-50" />
          <div className="admin-skel admin-skel-line w-90" />
        </div>
      ))}

      <div style={{ display: "flex", gap: 10 }}>
        <div className="admin-skel" style={{ height: 40, width: 140, borderRadius: 10 }} />
        <div className="admin-skel" style={{ height: 40, width: 80, borderRadius: 10 }} />
      </div>
    </>
  );
}
