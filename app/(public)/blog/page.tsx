import type { Metadata } from "next";
import Link from "next/link";
import BlogCard from "@/components/blog/BlogCard";
import BlogHero from "@/components/blog/BlogHero";
import BlogSidebar from "@/components/blog/BlogSidebar";
import { getAllPosts } from "@/lib/blog";

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
};

export const revalidate = 60;

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

  const filteredPosts = allPosts.filter((post) => {
    const archiveLabel = new Date(post.date).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const matchesSearch = !search || `${post.title} ${post.excerpt} ${post.tags.join(" ")}`.toLowerCase().includes(search);
    const matchesCategory = !category || post.category === category;
    const matchesTag = !tag || post.tags.includes(tag);
    const matchesArchive = !archive || archiveLabel === archive;
    return matchesSearch && matchesCategory && matchesTag && matchesArchive;
  });

  const activeFilter = search || category || tag || archive;
  const featuredPosts = allPosts.filter((post) => post.featured).slice(0, 3);
  const popularPosts = allPosts.slice().sort((a, b) => b.views.localeCompare(a.views)).slice(0, 4);
  const visiblePosts = filteredPosts.slice(0, 9);

  return (
    <>
      <BlogHero
        current="Blog"
        title="Latest Tech Tricks, Tutorials & Guides"
        subtitle="Explore premium tools, AI guides, subscriptions, tutorials, and digital growth methods."
      />

      <main className="pro-blog-shell v2-container">
        <section className="pro-blog-main" aria-label="Blog posts">
          {!activeFilter && featuredPosts.length > 0 && (
            <section className="pro-featured-blog-section" aria-label="Featured blog posts">
              <div className="pro-section-kicker">Featured</div>
              <div className="pro-featured-blog-grid">
                {featuredPosts.map((post) => <BlogCard key={post.slug} post={post} />)}
              </div>
            </section>
          )}

          {activeFilter && (
            <div className="pro-filter-bar">
              <span>
                Showing {filteredPosts.length} result{filteredPosts.length === 1 ? "" : "s"}
                {search ? ` for "${query.search}"` : category ? ` in ${category}` : tag ? ` tagged ${tag}` : archive ? ` from ${archive}` : ""}
              </span>
              <Link href="/blog">Clear filters</Link>
            </div>
          )}

          {visiblePosts.length > 0 ? (
            <>
              <div className="pro-blog-section-head">
                <div>
                  <span>Latest posts</span>
                  <h2>Fresh SEO guides and tutorials</h2>
                </div>
              </div>
              <div className="pro-blog-list">
                {visiblePosts.map((post) => <BlogCard key={post.slug} post={post} />)}
              </div>
              {filteredPosts.length > visiblePosts.length && (
                <div className="pro-load-more">
                  <button type="button">Load More <i className="fa-solid fa-arrow-down"></i></button>
                </div>
              )}
            </>
          ) : (
            <div className="pro-empty-blog">
              <h2>No posts found</h2>
              <p>Try a different search, category, or tag.</p>
              <Link href="/blog" className="btn btn-primary">View all posts</Link>
            </div>
          )}
        </section>

        <BlogSidebar posts={allPosts} popularPosts={popularPosts} />
      </main>
    </>
  );
}
