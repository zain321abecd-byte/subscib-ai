import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POSTS, findPost } from "@/lib/blog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://subscribai.com";

const TAG_COLORS = {
  Guide:      { c: "var(--brand-300)",   bg: "var(--brand-soft)" },
  Compare:    { c: "var(--accent-300)",  bg: "var(--accent-soft)" },
  Automation: { c: "var(--info-500)",    bg: "var(--info-soft)" },
  News:       { c: "var(--warning-500)", bg: "var(--warning-soft)" },
} as const;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) return {};
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
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) notFound();

  const tagColor = TAG_COLORS[post.tag];
  const related = POSTS.filter((p) => p.slug !== post.slug && p.tag === post.tag).slice(0, 2);

  // Render markdown-ish body — split paragraphs and h2 sections
  const blocks = post.body.split(/\n\n+/).map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={i} style={{
          fontFamily: "var(--font-heading)", color: "var(--text)",
          fontSize: "var(--fs-xl)", letterSpacing: "-0.015em",
          marginTop: "var(--space-6)", marginBottom: "var(--space-3)",
        }}>{trimmed.replace(/^##\s+/, "")}</h2>
      );
    }
    if (trimmed.startsWith("- ")) {
      const items = trimmed.split("\n").map((l) => l.replace(/^-\s+/, ""));
      return (
        <ul key={i} style={{ paddingLeft: 24, display: "grid", gap: 6, color: "var(--text-soft)" }}>
          {items.map((item, j) => <li key={j}>{item}</li>)}
        </ul>
      );
    }
    return <p key={i} style={{ color: "var(--text-soft)", lineHeight: 1.7 }}>{trimmed}</p>;
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
      <div className="v2-container" style={{ maxWidth: 760 }}>
        {/* Breadcrumb */}
        <nav style={{ marginBottom: "var(--space-5)", color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
          <Link href="/" style={{ color: "inherit" }}>Home</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <Link href="/blog" style={{ color: "inherit" }}>Blog</Link>
        </nav>

        {/* Header */}
        <header style={{ marginBottom: "var(--space-6)" }}>
          <span className="badge" style={{ background: tagColor.bg, color: tagColor.c, marginBottom: "var(--space-3)" }}>
            {post.tag}
          </span>
          <h1 style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(1.8rem, 3.6vw, 2.5rem)",
            fontWeight: 800, color: "var(--text)",
            letterSpacing: "-0.025em", lineHeight: 1.1,
            marginBottom: "var(--space-4)",
          }}>{post.title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", color: "var(--text-muted)" }}>
            <span className="blog-avatar blog-avatar-sm" style={{ background: post.authorColor }}>{post.authorInitials}</span>
            <div style={{ fontSize: "var(--fs-sm)" }}>
              <strong style={{ color: "var(--text-soft)", fontWeight: 600 }}>{post.author}</strong>
              <span style={{ margin: "0 6px" }}>·</span>
              <span>{post.date}</span>
              <span style={{ margin: "0 6px" }}>·</span>
              <span>{post.readMins} min read</span>
            </div>
          </div>
        </header>

        {/* Body */}
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          {blocks}
        </div>

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
            <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>Browse the full catalog — paid in PKR, delivered in 30 minutes.</span>
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
