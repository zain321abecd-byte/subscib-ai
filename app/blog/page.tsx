import Link from "next/link";

export const metadata = { title: "Blog · SubscribAI" };

type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readMins: number;
  tag: "Guide" | "Compare" | "Automation" | "News";
  author: string;
  authorInitials: string;
  authorColor: string;
  featured?: boolean;
};

const POSTS: Post[] = [
  {
    slug: "ai-for-pakistani-businesses",
    title: "AI for Pakistani businesses: where to start without burning rupees",
    excerpt: "A practical playbook for picking your first AI tool — what it should do for you in week one, and which to skip until later.",
    date: "Apr 22, 2026",
    readMins: 8,
    tag: "Guide",
    author: "Ali Raza",
    authorInitials: "AR",
    authorColor: "var(--brand-soft)",
    featured: true,
  },
  {
    slug: "chatgpt-vs-claude",
    title: "ChatGPT Plus vs Claude Pro: which $20 to spend",
    excerpt: "Side-by-side on writing, code, vision, file uploads, and Pakistan-specific quirks like Urdu support.",
    date: "Apr 14, 2026",
    readMins: 6,
    tag: "Compare",
    author: "Sara Hashmi",
    authorInitials: "SH",
    authorColor: "var(--accent-soft)",
  },
  {
    slug: "make-com-flows",
    title: "5 Make.com flows every freelancer should set up",
    excerpt: "Lead capture, client onboarding, invoice nudges, content recycling, weekly metrics — built once, runs forever.",
    date: "Apr 02, 2026",
    readMins: 9,
    tag: "Automation",
    author: "Usman Khan",
    authorInitials: "UK",
    authorColor: "var(--info-soft)",
  },
  {
    slug: "midjourney-prompts-pk",
    title: "Midjourney prompts that actually look Pakistani",
    excerpt: "How to nudge the model toward authentic local visuals — clothing, cities, light, and color palettes.",
    date: "Mar 25, 2026",
    readMins: 5,
    tag: "Guide",
    author: "Sara Hashmi",
    authorInitials: "SH",
    authorColor: "var(--accent-soft)",
  },
  {
    slug: "subscribai-jazzcash-launch",
    title: "We're now live with JazzCash and Easypaisa",
    excerpt: "After three months of integration testing, you can pay locally without a single international transaction.",
    date: "Mar 12, 2026",
    readMins: 3,
    tag: "News",
    author: "SubscribAI Team",
    authorInitials: "SA",
    authorColor: "var(--warning-soft)",
  },
];

const TAG_COLORS: Record<Post["tag"], { c: string; bg: string; icon: string }> = {
  Guide:      { c: "var(--brand-300)",   bg: "var(--brand-soft)",   icon: "fa-book-open" },
  Compare:    { c: "var(--accent-300)",  bg: "var(--accent-soft)",  icon: "fa-scale-balanced" },
  Automation: { c: "var(--info-500)",    bg: "var(--info-soft)",    icon: "fa-diagram-project" },
  News:       { c: "var(--warning-500)", bg: "var(--warning-soft)", icon: "fa-bullhorn" },
};

const MEDIA_VARIANTS = ["media-orange", "media-blue", "media-pink", "media-green"] as const;

export default function BlogPage() {
  const featured = POSTS.find((p) => p.featured) || POSTS[0];
  const rest = POSTS.filter((p) => p.slug !== featured.slug);

  return (
    <section style={{ padding: "var(--space-7) 0 var(--space-9)" }}>
      <div className="v2-container">
        <header style={{ marginBottom: "var(--space-6)", maxWidth: 720 }}>
          <p className="v2-eyebrow">Blog</p>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem, 3.6vw, 2.5rem)", color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "var(--space-3) 0" }}>
            Notes from the team
          </h1>
          <p style={{ color: "var(--text-soft)", fontSize: "var(--fs-md)" }}>
            Practical writing on AI tools, automation, and getting work done in Pakistan.
          </p>
        </header>

        {/* Featured post */}
        <Link href={`/blog/${featured.slug}`} className="surface-card is-interactive blog-featured">
          <div className={`product-media ${MEDIA_VARIANTS[POSTS.indexOf(featured) % 4]} blog-featured-media`} aria-hidden>
            <span className="blog-featured-icon" style={{ color: TAG_COLORS[featured.tag].c }}>
              <i className={`fa-solid ${TAG_COLORS[featured.tag].icon}`}></i>
            </span>
          </div>
          <div className="blog-featured-body">
            <span className="badge" style={{ background: TAG_COLORS[featured.tag].bg, color: TAG_COLORS[featured.tag].c, marginBottom: "var(--space-3)" }}>
              {featured.tag} · Featured
            </span>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-2xl)", color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: "var(--space-3)" }}>
              {featured.title}
            </h2>
            <p style={{ color: "var(--text-soft)", marginBottom: "var(--space-5)" }}>
              {featured.excerpt}
            </p>
            <div className="blog-meta">
              <span className="blog-avatar" style={{ background: featured.authorColor }}>{featured.authorInitials}</span>
              <div>
                <strong>{featured.author}</strong>
                <small>{featured.date} · {featured.readMins} min read</small>
              </div>
            </div>
          </div>
        </Link>

        {/* Recent posts grid */}
        <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--text)", fontSize: "var(--fs-lg)", margin: "var(--space-7) 0 var(--space-4)" }}>
          More from the team
        </h3>
        <div className="blog-grid">
          {rest.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="surface-card is-interactive blog-card">
              {/* Slim colored accent stripe on top — replaces the heavy media block */}
              <div className="blog-card-stripe" style={{ background: TAG_COLORS[p.tag].c }} aria-hidden />
              <div className="blog-card-body">
                <span className="badge" style={{ background: TAG_COLORS[p.tag].bg, color: TAG_COLORS[p.tag].c, marginBottom: "var(--space-3)", alignSelf: "flex-start" }}>
                  {p.tag} · {p.readMins} min read
                </span>
                <h4 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-lg)", color: "var(--text)", letterSpacing: "-0.01em", lineHeight: 1.25, marginBottom: "var(--space-2)" }}>
                  {p.title}
                </h4>
                <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)", lineHeight: 1.5, marginBottom: "var(--space-4)" }}>
                  {p.excerpt}
                </p>
                <div className="blog-meta blog-meta-sm">
                  <span className="blog-avatar blog-avatar-sm" style={{ background: p.authorColor }}>{p.authorInitials}</span>
                  <div>
                    <strong>{p.author}</strong>
                    <small>{p.date}</small>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
