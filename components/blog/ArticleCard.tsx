import Link from "next/link";
import type { Post } from "@/lib/blog";

/* Minimal article card for the blog index — cover image, title, excerpt,
   orange "Read Article →" link (nexus-style reference design). */
export default function ArticleCard({ post }: { post: Post }) {
  return (
    <article className="nx-art-card">
      <Link href={`/blog/${post.slug}`} className="nx-art-img" aria-label={post.title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.image} alt={post.featuredImageAlt || post.title} loading="lazy" />
      </Link>
      <div className="nx-art-body">
        <h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
        <p>{post.excerpt}</p>
        <Link href={`/blog/${post.slug}`} className="nx-art-read">
          Read Article <i className="fa-solid fa-arrow-right-long" aria-hidden></i>
        </Link>
      </div>
    </article>
  );
}
