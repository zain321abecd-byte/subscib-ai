import Link from "next/link";
import PostForm from "../PostForm";

export const metadata = { title: "New blog post" };

export default function NewPostPage() {
  return (
    <>
      <header className="admin-page-head">
        <div>
          <p style={{ margin: 0 }}><Link href="/admin/blog" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>← Blog posts</Link></p>
          <h1>New blog post</h1>
        </div>
      </header>
      <PostForm />
    </>
  );
}
