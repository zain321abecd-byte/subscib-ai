import Link from "next/link";
import type { Post } from "@/lib/blog";
import { getBlogArchives, getBlogCategories, getBlogTags } from "@/lib/blog";
import TagCloud from "./TagCloud";

export default function BlogSidebar({ posts, popularPosts }: { posts: Post[]; popularPosts?: Post[] }) {
  const recent = posts.slice(0, 5);
  const popular = popularPosts?.length ? popularPosts : posts.filter((post) => post.featured).slice(0, 4);
  const categories = getBlogCategories(posts);
  const tags = getBlogTags(posts).slice(0, 24);
  const archives = getBlogArchives(posts).slice(0, 6);
  const referenceRecent = [
    "CapCut Pro Free Trial Method",
    "Sora AI Viral Prompts",
    "How to Unlock Perplexity Pro Using Comet",
    "How to Get 1 Year Google AI Pro for Free",
    "Save Bulk Unknown WhatsApp Numbers",
  ];
  const comments = [
    "Hasnain on Sora AI Viral Prompts",
    "Ali Shahbaz on How to Get 1 Year Google AI Pro for Free",
    "SubscribAI Reader on CapCut Pro Free Trial Method",
  ];
  const referenceTags = [
    "ai tools",
    "capcut pro",
    "premium subscription",
    "video editing",
    "google ai",
    "perplexity pro",
    "whatsapp tools",
    "digital products",
    "free trial",
    "content creation",
    "canva pro",
    "chatgpt",
    "claude",
    "sora ai",
    ...tags.map((tag) => tag.toLowerCase()),
  ].filter((tag, index, arr) => arr.indexOf(tag) === index).slice(0, 28);

  return (
    <aside className="pro-blog-sidebar" aria-label="Blog sidebar">
      <section className="pro-sidebar-card pro-sidebar-search">
        <h3>Search</h3>
        <form action="/blog" className="pro-search-form">
          <input type="search" name="search" placeholder="Search blog posts..." />
          <button type="submit" aria-label="Search blog posts">
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
        </form>
      </section>

      <section className="pro-sidebar-card">
        <h3>Recent Posts</h3>
        <ul className="blog-widget-list">
          {referenceRecent.map((title) => (
            <li key={title}>
              <Link href={title === "CapCut Pro Free Trial Method" ? "/blog/capcut-pro-free-method" : "/blog"}>
                {title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="pro-sidebar-card">
        <h3>Recent Comments</h3>
        <ul className="blog-widget-list">
          {comments.map((comment) => (
            <li key={comment}><Link href="/blog/capcut-pro-free-method">{comment}</Link></li>
          ))}
        </ul>
      </section>

      <section className="pro-sidebar-card">
        <h3>Author</h3>
        <div className="blog-author-widget">
          <span>SA</span>
          <strong>SubscribAI Team</strong>
          <p>Sharing premium tech guides, AI tools, and digital growth methods.</p>
        </div>
      </section>

      <section className="pro-sidebar-card">
        <h3>Categories</h3>
        <div className="pro-category-list">
          {categories.map((category) => (
            <Link key={category.name} href={`/blog?category=${encodeURIComponent(category.name)}`}>
              <span>{category.name}</span>
              <b>{category.count}</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="pro-sidebar-card">
        <h3>Popular Posts</h3>
        <div className="pro-recent-list">
          {popular.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="pro-recent-post">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.image} alt="" loading="lazy" />
              <span>
                <small>{post.readingTime} min read</small>
                <strong>{post.title}</strong>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="pro-sidebar-card">
        <h3>Latest Posts</h3>
        <div className="pro-recent-list">
          {recent.slice(0, 4).map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="pro-recent-post">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.image} alt="" loading="lazy" />
              <span>
                <small>{post.date}</small>
                <strong>{post.title}</strong>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="pro-sidebar-card">
        <h3>Tag Cloud</h3>
        <TagCloud tags={referenceTags} />
      </section>

      <section className="pro-sidebar-card">
        <h3>Archives</h3>
        <div className="pro-archive-list">
          {archives.map((archive) => (
            <Link key={archive.label} href={`/blog?archive=${encodeURIComponent(archive.label)}`}>
              {archive.label} <span>{archive.count}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="pro-sidebar-card pro-sidebar-promo">
        <span className="pro-promo-icon"><i className="fa-solid fa-bolt"></i></span>
        <h3>Need Premium AI Tools?</h3>
        <p>Get ChatGPT, Claude, Canva, Midjourney, automation packs, and more from one checkout.</p>
        <Link href="/prices" className="btn btn-primary">View Plans</Link>
      </section>
    </aside>
  );
}
