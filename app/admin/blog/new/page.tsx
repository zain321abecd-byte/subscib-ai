import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import PostForm from "../PostForm";
import type { BlogPostRow } from "@/lib/supabase/types";

export const metadata = { title: "New blog post" };
export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.from("blog_posts").select("*").order("date", { ascending: false });

  return (
    <>
      <header className="admin-page-head">
        <div>
          <p style={{ margin: 0 }}><Link href="/admin/blog" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>← Blog posts</Link></p>
          <h1>New blog post</h1>
        </div>
      </header>
      <PostForm posts={(data ?? []) as BlogPostRow[]} />
    </>
  );
}
