"use client";
import { deletePost } from "./actions";

export default function DeletePostButton({ slug, title }: { slug: string; title: string }) {
  return (
    <form action={deletePost}>
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        className="admin-btn admin-btn-danger"
        style={{ padding: "6px 12px" }}
        onClick={(e) => { if (!confirm(`Delete post "${title}"?`)) e.preventDefault(); }}
      >
        Delete
      </button>
    </form>
  );
}
