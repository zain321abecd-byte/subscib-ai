import Link from "next/link";
import type { Post } from "@/lib/blog";
import { authorSlug } from "@/lib/seo";

export default function BlogMeta({ post, compact = false }: { post: Post; compact?: boolean }) {
  return (
    <div className={`pro-blog-meta ${compact ? "is-compact" : ""}`}>
      {/* Byline links to the author hub so the name is a real entity a crawler
          can follow, not just a string (E-E-A-T authorship signal). */}
      <span>
        <i className="fa-regular fa-user"></i>
        <Link className="pro-blog-author-link" href={`/author/${authorSlug(post.author)}`} rel="author">
          {post.author}
        </Link>
      </span>
      <span><i className="fa-regular fa-calendar"></i>{post.date}</span>
      <span><i className="fa-regular fa-comments"></i>{post.comments} comments</span>
      {!compact && <span><i className="fa-regular fa-clock"></i>{post.readingTime} min read</span>}
    </div>
  );
}
