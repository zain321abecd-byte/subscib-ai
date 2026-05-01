"use client";
import { deleteProduct } from "./actions";

export default function DeleteButton({ id, name }: { id: string; name: string }) {
  return (
    <form action={deleteProduct}>
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
