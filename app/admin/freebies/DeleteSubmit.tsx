"use client";

export default function DeleteSubmit({ label = "Delete" }: { label?: string }) {
  return (
    <button
      type="submit"
      className="admin-btn admin-btn-danger"
      style={{ padding: "6px 12px" }}
      onClick={(e) => { if (!confirm("Delete this item?")) e.preventDefault(); }}
    >
      {label}
    </button>
  );
}
