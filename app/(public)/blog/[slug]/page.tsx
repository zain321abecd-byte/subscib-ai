import type { Metadata } from "next";
import type React from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import BlogHero from "@/components/blog/BlogHero";
import BlogMeta from "@/components/blog/BlogMeta";
import RelatedPosts from "@/components/blog/RelatedPosts";
import TagCloud from "@/components/blog/TagCloud";
import { extractHeadings, slugifyBlogTitle } from "@/lib/blog-seo";
import { STATIC_POSTS, getAllPosts, getPost } from "@/lib/blog";
import { getSupabaseServer } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://subscribai.com";

export const revalidate = 60;

export function generateStaticParams() {
  return STATIC_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  const canonical = post.canonicalUrl || `${SITE_URL}/blog/${post.slug}`;

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    alternates: { canonical },
    robots: {
      index: post.robotsIndex,
      follow: post.robotsFollow,
      googleBot: { index: post.robotsIndex, follow: post.robotsFollow, "max-image-preview": "large" },
    },
    openGraph: {
      type: "article",
      title: post.ogTitle,
      description: post.ogDescription,
      url: canonical,
      publishedTime: post.date,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      tags: post.tags,
      images: [{ url: post.ogImage, alt: post.featuredImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.twitterTitle,
      description: post.twitterDescription,
      images: [post.twitterImage],
    },
  };
}

async function resolveRedirect(slug: string) {
  try {
    const supabase = await getSupabaseServer();
    const { data } = await supabase
      .from("redirects")
      .select("new_slug,status_code")
      .eq("old_slug", slug)
      .maybeSingle();
    return data as { new_slug: string; status_code: number } | null;
  } catch {
    return null;
  }
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const external = /^https?:\/\//.test(link[2]);
      return <Link key={index} href={link[2]} rel={external ? "noopener nofollow" : undefined} target={external ? "_blank" : undefined}>{link[1]}</Link>;
    }
    return part;
  });
}

function renderMarkdown(content: string) {
  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let orderedList: string[] = [];
  let code: string[] = [];
  let inCode = false;
  let table: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(<p key={`p-${blocks.length}`}>{renderInline(paragraph.join(" "))}</p>);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push(<ul key={`ul-${blocks.length}`}>{list.map((item, i) => <li key={`${item}-${i}`}>{renderInline(item)}</li>)}</ul>);
      list = [];
    }
    if (orderedList.length) {
      blocks.push(<ol key={`ol-${blocks.length}`}>{orderedList.map((item, i) => <li key={`${item}-${i}`}>{renderInline(item)}</li>)}</ol>);
      orderedList = [];
    }
  };
  const flushTable = () => {
    if (table.length < 2) {
      table = [];
      return;
    }
    const rows = table.map((row) => row.split("|").map((cell) => cell.trim()).filter(Boolean));
    const [head, , ...body] = rows;
    blocks.push(
      <div className="pro-table-wrap" key={`table-${blocks.length}`}>
        <table>
          <thead><tr>{head.map((cell) => <th key={cell}>{renderInline(cell)}</th>)}</tr></thead>
          <tbody>{body.map((row, i) => <tr key={i}>{row.map((cell) => <td key={cell}>{renderInline(cell)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
    table = [];
  };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (line.startsWith("```")) {
      flushParagraph(); flushList(); flushTable();
      if (inCode) {
        blocks.push(<pre key={`code-${blocks.length}`}><code>{code.join("\n")}</code></pre>);
        code = [];
        inCode = false;
      } else {
        inCode = true;
      }
      return;
    }
    if (inCode) {
      code.push(raw);
      return;
    }
    if (!line) {
      flushParagraph(); flushList(); flushTable();
      return;
    }
    if (line.includes("|") && /^\|?(.+\|)+.+\|?$/.test(line)) {
      flushParagraph(); flushList();
      table.push(line);
      return;
    }
    flushTable();

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      flushParagraph(); flushList();
      blocks.push(
        <figure className="pro-content-image" key={`img-${blocks.length}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image[2]} alt={image[1]} loading="lazy" />
          {image[1] && <figcaption>{image[1]}</figcaption>}
        </figure>
      );
      return;
    }

    const button = line.match(/^\[Button:\s*([^\]]+)\]\(([^)]+)\)$/i);
    if (button) {
      flushParagraph(); flushList();
      blocks.push(<p className="pro-content-button" key={`button-${blocks.length}`}><Link href={button[2]} className="btn btn-primary">{button[1]}</Link></p>);
      return;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = slugifyBlogTitle(text);
      if (level === 1) blocks.push(<h2 id={id} key={`h1-${blocks.length}`}>{text}</h2>);
      if (level === 2) blocks.push(<h2 id={id} key={`h2-${blocks.length}`}>{text}</h2>);
      if (level === 3) blocks.push(<h3 id={id} key={`h3-${blocks.length}`}>{text}</h3>);
      if (level >= 4) blocks.push(<h4 id={id} key={`h4-${blocks.length}`}>{text}</h4>);
      return;
    }

    if (line.startsWith("> ")) {
      flushParagraph(); flushList();
      blocks.push(<blockquote key={`quote-${blocks.length}`}>{renderInline(line.replace(/^>\s+/, ""))}</blockquote>);
      return;
    }
    if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      orderedList.push(line.replace(/^\d+\.\s+/, ""));
      return;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushParagraph();
      list.push(line.replace(/^[-*]\s+/, ""));
      return;
    }
    paragraph.push(line);
  });

  flushParagraph();
  flushList();
  flushTable();
  return blocks;
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    const redirect = await resolveRedirect(slug);
    if (redirect?.new_slug) permanentRedirect(`/blog/${redirect.new_slug}`);
    notFound();
  }

  const allPosts = await getAllPosts();
  const related = post.relatedPostIds.length
    ? allPosts.filter((item) => post.relatedPostIds.includes(item.slug)).slice(0, 3)
    : allPosts.filter((item) => item.slug !== post.slug && (item.category === post.category || item.tags.some((tag) => post.tags.includes(tag)))).slice(0, 3);
  const currentIndex = allPosts.findIndex((item) => item.slug === post.slug);
  const previous = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const toc = extractHeadings(post.content);
  const canonical = post.canonicalUrl || `${SITE_URL}/blog/${post.slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": post.schemaType,
    headline: post.title,
    description: post.metaDescription,
    image: post.ogImage,
    author: { "@type": "Person", name: post.author, description: post.authorBio },
    datePublished: post.date,
    dateModified: post.updatedAt,
    mainEntityOfPage: canonical,
    publisher: {
      "@type": "Organization",
      name: "SubscribAI",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/assets/subscribai-logo.png` },
    },
  };
  const faqJsonLd = post.faqItems.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  } : null;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };

  return (
    <>
      {[articleJsonLd, faqJsonLd, breadcrumbJsonLd].filter(Boolean).map((schema, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      <BlogHero title={post.title} current={post.title} category={post.category} />

      <main className="pro-blog-shell pro-blog-detail-shell v2-container">
        <article className="pro-article">
          <nav className="pro-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link><span>/</span><Link href="/blog">Blog</Link><span>/</span><span>{post.title}</span>
          </nav>

          <figure className="pro-article-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.image} alt={post.featuredImageAlt} loading="eager" />
          </figure>

          <header className="pro-article-header">
            <span className="pro-blog-category">{post.category}</span>
            <h1>{post.title}</h1>
            <BlogMeta post={post} />
            <p className="pro-post-updated">Updated {new Date(post.updatedAt).toLocaleDateString()} - {post.readingTime} min read</p>
            <p className="pro-article-intro">{post.excerpt}</p>
          </header>

          {toc.length > 0 && (
            <aside className="pro-toc" aria-label="Table of contents">
              <strong>Table of contents</strong>
              {toc.map((item) => <a key={item.id} href={`#${item.id}`} className={item.level === 3 ? "is-nested" : ""}>{item.text}</a>)}
            </aside>
          )}

          <div className="pro-article-content">{renderMarkdown(post.content)}</div>

          {post.faqItems.length > 0 && (
            <section className="pro-faq-section">
              <h2>Frequently Asked Questions</h2>
              {post.faqItems.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </section>
          )}

          <section className="pro-post-tags">
            <h2>Post Tags:</h2>
            <TagCloud tags={post.tags} />
          </section>

          <section className="pro-article-cta">
            <div>
              <strong>Ready to turn this into action?</strong>
              <span>Browse premium AI subscriptions, courses, and automation packs from one checkout.</span>
            </div>
            <Link href="/shop" className="btn btn-primary">Browse Shop</Link>
          </section>

          <section className="pro-author-bio">
            {post.authorImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.authorImage} alt={post.author} loading="lazy" />
            ) : (
              <span style={{ background: post.authorColor }}>{post.authorInitials}</span>
            )}
            <div>
              <strong>{post.author}</strong>
              <p>{post.authorBio}</p>
            </div>
          </section>

          <section className="pro-share-row" aria-label="Share this post">
            <Link href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}`} target="_blank" rel="noopener">Facebook</Link>
            <Link href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener">X</Link>
            <Link href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}`} target="_blank" rel="noopener">LinkedIn</Link>
            <Link href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${canonical}`)}`} target="_blank" rel="noopener">WhatsApp</Link>
          </section>

          <nav className="pro-post-nav" aria-label="Previous and next posts">
            {previous ? <Link href={`/blog/${previous.slug}`}><span>Previous</span><strong>{previous.title}</strong></Link> : <span />}
            {next ? <Link href={`/blog/${next.slug}`}><span>Next</span><strong>{next.title}</strong></Link> : <span />}
          </nav>

          <RelatedPosts posts={related} />
        </article>
      </main>
    </>
  );
}
