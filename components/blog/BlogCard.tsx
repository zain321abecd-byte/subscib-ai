import Link from "next/link";
import type { Post } from "@/lib/blog";
import BlogMeta from "./BlogMeta";

export default function BlogCard({ post }: { post: Post }) {
  return (
    <article className="pro-blog-card">
      <Link href={`/blog/${post.slug}`} className="pro-blog-card-image" aria-label={post.title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.image} alt={post.featuredImageAlt || post.title} loading="lazy" />
        <span className="pro-blog-category">{post.category}</span>
      </Link>
      <div className="pro-blog-card-body">
        <BlogMeta post={post} compact />
        <h2>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p>{post.excerpt}</p>
        <Link href={`/blog/${post.slug}`} className="pro-blog-readmore">
          Read More <i className="fa-solid fa-arrow-right"></i>
        </Link>
      </div>
    </article>
  );
}
