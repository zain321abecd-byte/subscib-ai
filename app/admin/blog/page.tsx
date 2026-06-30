import Link from "next/link";
import { getPostStatus } from "@/lib/blog-seo";
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
          <p>Create, optimize, schedule, and manage long-form SEO content.</p>
        </div>
        <Link href="/admin/blog/new" className="admin-btn admin-btn-primary">
          <i className="fa-solid fa-plus" /> New post
        </Link>
      </header>

      {(params.created || params.updated || params.deleted || params.imported || params.error) && (
        <div className="admin-card" style={{
          background: params.error ? "rgba(239,68,68,0.10)" : "rgba(34,197,94,0.10)",
          borderColor: params.error ? "rgba(239,68,68,0.30)" : "rgba(34,197,94,0.30)",
          color: params.error ? "#fca5a5" : "#86efac",
          marginBottom: 14,
        }}>
          {params.created && <>Created <code>{params.created}</code>.</>}
          {params.updated && <>Updated <code>{params.updated}</code>.</>}
          {params.deleted && <>Deleted <code>{params.deleted}</code>.</>}
          {params.imported && <>Imported {params.imported} demo post{params.imported === "1" ? "" : "s"}.</>}
          {params.error && <>{params.error}</>}
        </div>
      )}

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {error.message}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="admin-card admin-empty">
          <i className="fa-solid fa-newspaper" />
          <div>No blog posts yet. Add one or seed the existing static catalog.</div>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>SEO</th>
                  <th>Featured</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const status = getPostStatus(post);
                  const seoReady = Boolean(post.meta_title && post.meta_description && post.focus_keyword && post.featured_image_alt);

                  return (
                    <tr key={post.slug}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>{post.title}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          <code>{post.slug}</code> - by {post.author}
                        </div>
                      </td>
                      <td>{post.category_name || post.tag}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{new Date(post.date).toLocaleDateString()}</td>
                      <td>
                        <span className={`admin-pill ${status === "Published" ? "admin-pill-paid" : "admin-pill-pending"}`}>
                          {status}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-pill ${seoReady ? "admin-pill-paid" : "admin-pill-pending"}`}>
                          {seoReady ? "Ready" : "Needs work"}
                        </span>
                      </td>
                      <td>{post.featured ? "*" : ""}</td>
                      <td style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <Link href={`/blog/${post.slug}`} target="_blank" className="admin-btn admin-btn-ghost" style={{ padding: "6px 12px" }}>View</Link>
                        <Link href={`/admin/blog/${post.slug}`} className="admin-btn admin-btn-ghost" style={{ padding: "6px 12px" }}>Edit</Link>
                        <DeletePostButton slug={post.slug} title={post.title} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
