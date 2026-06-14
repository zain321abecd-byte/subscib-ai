import type { Post } from "@/lib/blog";

export default function BlogMeta({ post, compact = false }: { post: Post; compact?: boolean }) {
  return (
    <div className={`pro-blog-meta ${compact ? "is-compact" : ""}`}>
      <span><i className="fa-regular fa-user"></i>{post.author}</span>
      <span><i className="fa-regular fa-calendar"></i>{post.date}</span>
      <span><i className="fa-regular fa-comments"></i>{post.comments} comments</span>
      {!compact && <span><i className="fa-regular fa-clock"></i>{post.readingTime} min read</span>}
    </div>
  );
}
