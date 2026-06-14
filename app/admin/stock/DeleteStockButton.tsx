"use client";

import { deleteStockItem } from "./actions";

export default function DeleteStockButton({ id, name }: { id: string; name: string }) {
  return (
    <form action={deleteStockItem}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="admin-btn admin-btn-danger"
        style={{ padding: "6px 12px" }}
        onClick={(e) => {
          if (!confirm(`Delete ${name}? This can't be undone.`)) e.preventDefault();
        }}
      >
        Delete
      </button>
    </form>
  );
}
