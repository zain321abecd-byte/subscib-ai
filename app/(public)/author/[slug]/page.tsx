import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/blog/ArticleCard";
import { getAllPosts } from "@/lib/blog";
import type { Post } from "@/lib/blog";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";
import { authorSlug, buildPersonSchema, ORG_ID } from "@/lib/seo";
import { cdnImage } from "@/lib/cloudinary-url";

// Public layout reads cookies/headers (region + currency), so static ISR is
// not an option here — same reason as the blog index.
export const dynamic = "force-dynamic";

/**
 * Resolve an author slug back to the posts they wrote.
 *
 * Authors are a free-text column on blog_posts rather than their own table, so
 * the slug is derived from the name and matched back the same way. Returns the
 * author's own profile fields from their most recent post — that row is the
 * most likely to carry an up-to-date bio and avatar.
 */
async function getAuthor(slug: string) {
  const posts = await getAllPosts();
  const written = posts.filter((post) => authorSlug(post.author) === slug);
  if (!written.length) return null;

  // getAllPosts() is ordered by date desc, so the first match is the newest.
  const newest = written[0];
  return {
    name: newest.author,
    bio: newest.authorBio,
    image: newest.authorImage,
    socialLinks: newest.authorSocialLinks,
    initials: newest.authorInitials,
    color: newest.authorColor,
    posts: written,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) return {};

  const title = `${author.name} — Author`;
  const description = author.bio || `Articles written by ${author.name} for SubscribAI.`;
  return {
    title,
    description,
    alternates: { canonical: `/author/${slug}` },
    openGraph: {
      type: "profile",
      title,
      description,
      url: absoluteUrl(`/author/${slug}`),
      ...(author.image ? { images: [{ url: author.image, alt: author.name }] } : {}),
    },
  };
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) notFound();

  const person = buildPersonSchema({
    name: author.name,
    bio: author.bio,
    image: author.image,
    socialLinks: author.socialLinks,
    slug,
  });

  // ProfilePage is the correct wrapper for an author hub: it tells Google and
  // the AI crawlers that this page *is about* the person, which is what turns
  // a byline into an attributable entity (the "A" in E-E-A-T).
  const profileJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: person,
    isPartOf: { "@id": ORG_ID },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl("/blog") },
      { "@type": "ListItem", position: 3, name: author.name, item: absoluteUrl(`/author/${slug}`) },
    ],
  };

  const socials = Object.entries(author.socialLinks || {})
    .map(([label, url]) => [label, String(url || "").trim()] as const)
    .filter(([, url]) => !!url);

  return (
    <section className="nx-articles" aria-label={`Articles by ${author.name}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="v2-container">
        <nav className="pro-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span>/</span><Link href="/blog">Blog</Link><span>/</span><span>{author.name}</span>
        </nav>

        <header className="author-profile">
          {author.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="author-profile-avatar" {...cdnImage(author.image, 96)} alt={author.name} width={96} height={96} loading="eager" decoding="async" />
          ) : (
            <span className="author-profile-avatar author-profile-initials" style={{ background: author.color }} aria-hidden>
              {author.initials}
            </span>
          )}
          <div className="author-profile-body">
            <span className="nx-art-pill">Author</span>
            <h1>{author.name}</h1>
            {author.bio && <p className="author-profile-bio">{author.bio}</p>}
            <p className="author-profile-count">
              {author.posts.length} article{author.posts.length === 1 ? "" : "s"} for SubscribAI
            </p>
            {socials.length > 0 && (
              <ul className="author-profile-socials">
                {socials.map(([label, url]) => (
                  <li key={label}>
                    {/* rel=me is what lets a verifier tie this profile to the
                        off-site one — the link that makes sameAs meaningful. */}
                    <a href={url} target="_blank" rel="me noopener noreferrer">{label}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>

        <div className="nx-art-grid">
          {author.posts.map((post: Post) => (
            <ArticleCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
