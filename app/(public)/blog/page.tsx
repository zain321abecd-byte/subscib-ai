import type { Metadata } from "next";
import Link from "next/link";
import ArticleCard from "@/components/blog/ArticleCard";
import { getAllPosts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Latest Tech Tricks, Tutorials & Guides",
  description: "Explore premium tools, AI guides, subscriptions, tutorials, and digital growth methods.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Latest Tech Tricks, Tutorials & Guides",
    description: "Explore premium tools, AI guides, subscriptions, tutorials, and digital growth methods.",
    type: "website",
    url: "/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "SubscribAI Blog — AI Guides, Tutorials & Comparisons",
    description: "Practical AI subscription guides, tutorials, comparisons, and automation advice.",
  },
};

// Force dynamic — public layout reads cookies/headers (region + currency),
// incompatible with static ISR in Next 15.
export const dynamic = "force-dynamic";

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; category?: string; tag?: string; archive?: string }>;
}) {
  const emptyQuery: { search?: string; category?: string; tag?: string; archive?: string } = {};
  const [allPosts, query] = await Promise.all([
    getAllPosts(),
    searchParams ?? Promise.resolve(emptyQuery),
  ]);
  const search = (query.search || "").trim().toLowerCase();
  const category = (query.category || "").trim();
  const tag = (query.tag || "").trim();
  const archive = (query.archive || "").trim();

  // Filters remain URL-driven (old sidebar links / bookmarks keep working)
  // even though the index no longer renders filter controls.
  const filteredPosts = allPosts.filter((post) => {
    const archiveLabel = new Date(post.date).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const matchesSearch = !search || `${post.title} ${post.excerpt} ${post.tags.join(" ")}`.toLowerCase().includes(search);
    const matchesCategory = !category || post.category === category;
    const matchesTag = !tag || post.tags.includes(tag);
    const matchesArchive = !archive || archiveLabel === archive;
    return matchesSearch && matchesCategory && matchesTag && matchesArchive;
  });

  const activeFilter = search || category || tag || archive;
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "SubscribAI Blog",
    description: metadata.description,
    url: absoluteUrl("/blog"),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl("/blog") },
      ],
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: allPosts.length,
      itemListElement: allPosts.slice(0, 50).map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: post.title,
        url: absoluteUrl(`/blog/${post.slug}`),
      })),
    },
  };

  return (
    <section className="nx-articles" aria-label="Blog articles">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }} />
      <div className="v2-container">
        <header className="nx-art-head">
          <span className="nx-art-pill">Articles</span>
          <h1>Latest Articles</h1>
          <p>Insights, tutorials, and updates from the SubscribAI team</p>
        </header>

        {activeFilter && (
          <div className="pro-filter-bar">
            <span>
              Showing {filteredPosts.length} result{filteredPosts.length === 1 ? "" : "s"}
              {search ? ` for "${query.search}"` : category ? ` in ${category}` : tag ? ` tagged ${tag}` : archive ? ` from ${archive}` : ""}
            </span>
            <Link href="/blog">Clear filters</Link>
          </div>
        )}

        {filteredPosts.length > 0 ? (
          <div className="nx-art-grid">
            {filteredPosts.map((post) => <ArticleCard key={post.slug} post={post} />)}
          </div>
        ) : (
          <div className="pro-empty-blog">
            <h2>No posts found</h2>
            <p>Try a different search, category, or tag.</p>
            <Link href="/blog" className="btn btn-primary">View all posts</Link>
          </div>
        )}
      </div>
    </section>
  );
}
