"use client";

export default function DeleteSubmit() {
  return (
    <button
      type="submit"
      className="admin-btn admin-btn-danger"
      style={{ padding: "6px 12px" }}
      onClick={(e) => { if (!confirm("Delete this review?")) e.preventDefault(); }}
    >
      Delete review
    </button>
  );
}
