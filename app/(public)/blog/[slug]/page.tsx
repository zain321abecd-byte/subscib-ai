import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STATIC_POSTS, getAllPosts, getPost } from "@/lib/blog";
import { getRegion } from "@/lib/region";
import BlogBody from "@/components/BlogBody";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://subscribai.com";

const TAG_COLORS = {
  Guide:      { c: "var(--brand-300)",   bg: "var(--brand-soft)" },
  Compare:    { c: "var(--accent-300)",  bg: "var(--accent-soft)" },
  Automation: { c: "var(--info-500)",    bg: "var(--info-soft)" },
  News:       { c: "var(--warning-500)", bg: "var(--warning-soft)" },
} as const;

export const revalidate = 60;

export function generateStaticParams() {
  return STATIC_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  const images = post.coverUrl ? [{ url: post.coverUrl }] : undefined;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `${SITE_URL}/blog/${post.slug}`,
      publishedTime: post.date,
      authors: [post.author],
      tags: [post.tag],
      images,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt, images: post.coverUrl ? [post.coverUrl] : undefined },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const [allPostsRaw, region] = await Promise.all([getAllPosts(), getRegion()]);
  const isPK = region === "PK";
  // Hide PK-only posts from non-PK visitors entirely (404 if they navigate here).
  if (!isPK && post.pkOnly) notFound();
  const tagColor = TAG_COLORS[post.tag];
  const allPosts = isPK ? allPostsRaw : allPostsRaw.filter((p) => !p.pkOnly);
  const related = allPosts.filter((p) => p.slug !== post.slug && p.tag === post.tag).slice(0, 2);

  // Render markdown-ish body — line-level parsing so single newlines work too
  type Block =
    | { kind: "h2"; text: string }
    | { kind: "p"; lines: string[] }
    | { kind: "ul"; items: string[] };

  const lines = post.body.split(/\r?\n/);
  const parsed: Block[] = [];
  let buffer: string[] = [];
  let listBuffer: string[] = [];
  const flushP = () => {
    if (buffer.length) {
      parsed.push({ kind: "p", lines: buffer });
      buffer = [];
    }
  };
  const flushList = () => {
    if (listBuffer.length) {
      parsed.push({ kind: "ul", items: listBuffer });
      listBuffer = [];
    }
  };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushP();
      flushList();
      continue;
    }
    if (line.startsWith("## ") || line.startsWith("# ")) {
      flushP();
      flushList();
      parsed.push({ kind: "h2", text: line.replace(/^#+\s+/, "") });
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushP();
      listBuffer.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }
    flushList();
    buffer.push(line);
  }
  flushP();
  flushList();

  const blocks = parsed.map((block, i) => {
    if (block.kind === "h2") {
      return <h2 key={i} className="blog-h2">{block.text}</h2>;
    }
    if (block.kind === "ul") {
      return (
        <ul key={i} className="blog-list">
          {block.items.map((item, j) => <li key={j}>{item}</li>)}
        </ul>
      );
    }
    return <p key={i} className="blog-p">{block.lines.join(" ")}</p>;
  });

  // Article JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Person", name: post.author },
    datePublished: post.date,
    publisher: { "@type": "Organization", name: "SubscribAI", logo: { "@type": "ImageObject", url: `${SITE_URL}/assets/subscribai-logo.png` } },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <article className="v2-section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="v2-container" style={{ maxWidth: 880 }}>
        {/* Breadcrumb */}
        <nav style={{ marginBottom: "var(--space-5)", color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
          <Link href="/" style={{ color: "inherit" }}>Home</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <Link href="/blog" style={{ color: "inherit" }}>Blog</Link>
        </nav>

        {/* Header */}
        <header className="blog-post-header">
          <span className="badge blog-post-tag" style={{ background: tagColor.bg, color: tagColor.c }}>
            {post.tag}
          </span>
          <h1 className="blog-post-title">{post.title}</h1>
          <div className="blog-post-meta">
            <span className="blog-avatar blog-avatar-sm" style={{ background: post.authorColor }}>{post.authorInitials}</span>
            <div className="blog-post-meta-text">
              <strong>{post.author}</strong>
              <span className="blog-post-meta-sep">·</span>
              <span>{post.date}</span>
              <span className="blog-post-meta-sep">·</span>
              <span>{post.readMins} min read</span>
            </div>
          </div>
        </header>

        {/* Cover image — admin-uploaded hero */}
        {post.coverUrl && (
          <figure className="blog-post-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.coverUrl} alt={post.title} loading="eager" />
          </figure>
        )}

        {/* Body */}
        <BlogBody>{blocks}</BlogBody>

        {/* CTA at bottom */}
        <div style={{
          marginTop: "var(--space-7)",
          padding: "var(--space-5)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap",
        }}>
          <div>
            <strong style={{ color: "var(--text)", fontFamily: "var(--font-heading)", display: "block", marginBottom: 4 }}>
              Ready to try the tools mentioned here?
            </strong>
            <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
              {isPK
                ? "Browse the full catalog — paid in PKR, delivered in 30 minutes."
                : "Browse the full catalog — delivered to your inbox in 30 minutes."}
            </span>
          </div>
          <Link href="/shop" className="btn btn-primary">Browse the shop <i className="fa-solid fa-arrow-right"></i></Link>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div style={{ marginTop: "var(--space-7)" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--text)", fontSize: "var(--fs-lg)", marginBottom: "var(--space-4)" }}>
              More on {post.tag}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
              {related.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="surface-card is-interactive blog-card" style={{ minHeight: 180 }}>
                  <div className="blog-card-stripe" style={{ background: TAG_COLORS[p.tag].c }} aria-hidden />
                  <div className="blog-card-body">
                    <span className="badge" style={{ background: TAG_COLORS[p.tag].bg, color: TAG_COLORS[p.tag].c, marginBottom: "var(--space-2)", alignSelf: "flex-start" }}>
                      {p.tag} · {p.readMins} min
                    </span>
                    <h4 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-md)", color: "var(--text)", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
                      {p.title}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
