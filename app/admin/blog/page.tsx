import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import DeletePostButton from "./DeletePostButton";
import type { BlogPostRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function BlogAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("date", { ascending: false });
  const posts = (data ?? []) as BlogPostRow[];

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Blog posts</h1>
          <p>Long-form content. Drafts (unpublished) are hidden from the public site.</p>
        </div>
        <Link href="/admin/blog/new" className="admin-btn admin-btn-primary">
          <i className="fa-solid fa-plus"></i> New post
        </Link>
      </header>

      {(params.created || params.updated || params.deleted) && (
        <div className="admin-card" style={{ background: "rgba(34,197,94,0.10)", borderColor: "rgba(34,197,94,0.30)", color: "#86efac", marginBottom: 14 }}>
          {params.created && <>Created <code>{params.created}</code>.</>}
          {params.updated && <>Updated <code>{params.updated}</code>.</>}
          {params.deleted && <>Deleted <code>{params.deleted}</code>.</>}
        </div>
      )}

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {error.message}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="admin-card admin-empty">
          <i className="fa-solid fa-newspaper"></i>
          <div>No blog posts yet. Add one or seed the existing static catalog.</div>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Tag</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.slug}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{p.title}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}><code>{p.slug}</code> · by {p.author}</div>
                    </td>
                    <td>{p.tag}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{new Date(p.date).toLocaleDateString()}</td>
                    <td>{p.published ? <span className="admin-pill admin-pill-paid">Published</span> : <span className="admin-pill admin-pill-pending">Draft</span>}</td>
                    <td>{p.featured ? "★" : ""}</td>
                    <td style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <Link href={`/admin/blog/${p.slug}`} className="admin-btn admin-btn-ghost" style={{ padding: "6px 12px" }}>Edit</Link>
                      <DeletePostButton slug={p.slug} title={p.title} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
