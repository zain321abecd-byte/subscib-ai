import Link from "next/link";
import type { Post } from "@/lib/blog";

export default function RelatedPosts({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="pro-related-posts">
      <div className="pro-section-title">
        <p className="v2-eyebrow">Keep Reading</p>
        <h2>Related posts</h2>
      </div>
      <div className="pro-related-grid">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="pro-related-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.image} alt="" loading="lazy" />
            <span>{post.category}</span>
            <strong>{post.title}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}
