import Link from "next/link";
import { BLOGS } from "@/data/blogs";
import { getPostStatus } from "@/lib/blog-seo";
import { getSupabaseServer } from "@/lib/supabase/server";
import DeletePostButton from "./DeletePostButton";
import { importDemoPosts } from "./actions";
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
  const existingSlugs = new Set(posts.map((post) => post.slug));
  const missingDemoCount = BLOGS.filter((post) => !existingSlugs.has(post.slug)).length;

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

      {missingDemoCount > 0 && (
        <form action={importDemoPosts} className="admin-card" style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <strong style={{ color: "var(--text)" }}>{missingDemoCount} demo blog post{missingDemoCount === 1 ? "" : "s"} missing from admin</strong>
            <div style={{ color: "var(--text-muted)", fontSize: "0.86rem", marginTop: 4 }}>
              Import them into Supabase so they appear here and can be edited like normal posts.
            </div>
          </div>
          <button type="submit" className="admin-btn admin-btn-primary">
            <i className="fa-solid fa-file-import" /> Import demo posts
          </button>
        </form>
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
