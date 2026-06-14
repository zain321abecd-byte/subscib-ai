import { BLOGS, type BlogCategory, type BlogPost } from "@/data/blogs";
import { cleanList, getPostStatus, parseFaqItems } from "@/lib/blog-seo";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { BlogPostRow } from "@/lib/supabase/types";

export type Post = BlogPost & {
  tag: "Guide" | "Compare" | "Automation" | "News";
  readMins: number;
  body: string;
  coverUrl: string | null;
  featuredImageAlt: string;
  updatedAt: string;
  status: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  canonicalUrl: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  schemaType: "BlogPosting" | "Article";
  faqItems: Array<{ question: string; answer: string }>;
  relatedPostIds: string[];
  authorBio: string;
  authorImage: string | null;
  authorSocialLinks: Record<string, string>;
};

export const STATIC_POSTS: Post[] = BLOGS.map((post) => ({
  ...post,
  tag: categoryToLegacyTag(post.category),
  readMins: post.readingTime,
  body: post.content,
  coverUrl: post.image,
  featuredImageAlt: post.title,
  updatedAt: post.date,
  status: "Published",
  metaTitle: post.title,
  metaDescription: post.excerpt,
  focusKeyword: post.tags[0] || "",
  secondaryKeywords: post.tags.slice(1),
  canonicalUrl: "",
  robotsIndex: true,
  robotsFollow: true,
  ogTitle: post.title,
  ogDescription: post.excerpt,
  ogImage: post.image,
  twitterTitle: post.title,
  twitterDescription: post.excerpt,
  twitterImage: post.image,
  schemaType: "BlogPosting",
  faqItems: [],
  relatedPostIds: [],
  authorBio: "Sharing practical AI, subscription, and digital growth guides from the SubscribAI editorial team.",
  authorImage: null,
  authorSocialLinks: {},
}));

export const POSTS = STATIC_POSTS;

function categoryToLegacyTag(category: BlogCategory): Post["tag"] {
  if (category === "Automation") return "Automation";
  if (category === "Subscriptions") return "Compare";
  if (category === "Growth") return "News";
  return "Guide";
}

function legacyTagToCategory(tag: string): BlogCategory {
  if (tag === "Automation") return "Automation";
  if (tag === "Compare") return "Subscriptions";
  if (tag === "News") return "Growth";
  return "AI Guides";
}

function inferTags(row: BlogPostRow): string[] {
  return Array.from(new Set([
    row.tag,
    ...row.title.split(/\s+/).filter((word) => word.length > 5).slice(0, 3),
  ])).slice(0, 5);
}

function inferComments(slug: string): number {
  return (slug.length % 7) + 1;
}

function inferViews(slug: string): string {
  return `${((slug.length % 9) + 2).toFixed(1)}K`;
}

function supabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function rowToPost(row: BlogPostRow): Post {
  const text = `${row.slug} ${row.title} ${row.excerpt}`.toLowerCase();
  const inferredPkOnly = /\bpakistan|\bpakistani|jazzcash|easypaisa|\bpkr\b/.test(text);
  const category = (row.category_name as BlogCategory | null) || legacyTagToCategory(row.tag);
  const image = row.cover_url || "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1400&q=80";
  const tags = row.tags?.length ? row.tags : inferTags(row);
  const metaTitle = row.meta_title || row.title;
  const metaDescription = row.meta_description || row.excerpt;
  const ogImage = row.og_image || image;
  const twitterImage = row.twitter_image || ogImage;

  return {
    id: row.id || row.slug,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.body,
    image,
    author: row.author,
    authorInitials: row.author_initials,
    authorColor: row.author_color,
    date: row.date,
    comments: inferComments(row.slug),
    category,
    tags,
    views: inferViews(row.slug),
    readingTime: row.read_mins,
    featured: row.featured,
    pkOnly: (row as unknown as { pk_only?: boolean }).pk_only ?? inferredPkOnly,
    tag: categoryToLegacyTag(category),
    readMins: row.read_mins,
    body: row.body,
    coverUrl: image,
    featuredImageAlt: row.featured_image_alt || row.title,
    updatedAt: row.updated_at || row.date,
    status: getPostStatus(row),
    metaTitle,
    metaDescription,
    focusKeyword: row.focus_keyword || "",
    secondaryKeywords: cleanList(row.secondary_keywords),
    canonicalUrl: row.canonical_url || "",
    robotsIndex: row.robots_index ?? true,
    robotsFollow: row.robots_follow ?? true,
    ogTitle: row.og_title || metaTitle,
    ogDescription: row.og_description || metaDescription,
    ogImage,
    twitterTitle: row.twitter_title || row.og_title || metaTitle,
    twitterDescription: row.twitter_description || row.og_description || metaDescription,
    twitterImage,
    schemaType: row.schema_type === "Article" ? "Article" : "BlogPosting",
    faqItems: parseFaqItems(row.faq_items),
    relatedPostIds: cleanList(row.related_post_ids),
    authorBio: row.author_bio || "SubscribAI editor focused on AI tools, premium subscriptions, and practical growth workflows.",
    authorImage: row.author_image || null,
    authorSocialLinks: row.author_social_links || {},
  };
}

export function findPost(slug: string): Post | undefined {
  return STATIC_POSTS.find((p) => p.slug === slug);
}

function mergeWithDemoPosts(posts: Post[]): Post[] {
  const seen = new Set(posts.map((post) => post.slug));
  return [
    ...posts,
    ...STATIC_POSTS.filter((post) => !seen.has(post.slug)),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getAllPosts(): Promise<Post[]> {
  if (!supabaseConfigured()) return STATIC_POSTS;
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("published", true)
      .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
      .order("date", { ascending: false });
    if (error || !data || data.length === 0) return STATIC_POSTS;
    return mergeWithDemoPosts((data as BlogPostRow[]).map(rowToPost));
  } catch {
    return STATIC_POSTS;
  }
}

export async function getPost(slug: string): Promise<Post | undefined> {
  if (!supabaseConfigured()) return STATIC_POSTS.find((p) => p.slug === slug);
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
      .maybeSingle();
    if (error || !data) return STATIC_POSTS.find((p) => p.slug === slug);
    return rowToPost(data as BlogPostRow);
  } catch {
    return undefined;
  }
}

export function getBlogCategories(posts: Post[]) {
  const counts = new Map<string, number>();
  posts.forEach((post) => counts.set(post.category, (counts.get(post.category) || 0) + 1));
  return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}

export function getBlogTags(posts: Post[]) {
  return Array.from(new Set(posts.flatMap((post) => post.tags))).sort();
}

export function getBlogArchives(posts: Post[]) {
  const counts = new Map<string, number>();
  posts.forEach((post) => {
    const label = new Date(post.date).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return Array.from(counts, ([label, count]) => ({ label, count }));
}
