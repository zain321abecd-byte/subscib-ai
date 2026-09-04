import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import PostForm from "../PostForm";
import type { BlogPostRow } from "@/lib/supabase/types";

export const metadata = { title: "Edit post" };

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await getSupabaseServer();
  const [{ data, error }, { data: allPosts }] = await Promise.all([
    supabase.from("blog_posts").select("*").eq("slug", slug).maybeSingle(),
    supabase.from("blog_posts").select("*").order("date", { ascending: false }),
  ]);
  if (error || !data) notFound();
  const post = data as BlogPostRow;

  return (
    <>
      <header className="admin-page-head">
        <div>
          <p style={{ margin: 0 }}><Link href="/admin/blog" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>← Blog posts</Link></p>
          <h1>Edit · {post.title}</h1>
          {post.published && (
            <p>
              <Link href={`/blog/${post.slug}`} target="_blank" rel="noopener" style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                View on site <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "0.7rem" }}></i>
              </Link>
            </p>
          )}
        </div>
      </header>
      <PostForm post={post} posts={(allPosts ?? []) as BlogPostRow[]} />
    </>
  );
}
