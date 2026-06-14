"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BLOGS } from "@/data/blogs";
import { cleanList, estimateReadingTime, parseFaqItems, slugifyBlogTitle } from "@/lib/blog-seo";
import { getSupabaseServer } from "@/lib/supabase/server";

type Status = "Draft" | "Published" | "Scheduled";

type PostInput = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  date: string;
  read_mins: number;
  tag: string;
  tags: string[];
  author: string;
  author_initials: string;
  author_color: string;
  author_bio: string | null;
  author_image: string | null;
  author_social_links: Record<string, string>;
  category_name: string;
  cover_url: string | null;
  featured_image_alt: string | null;
  featured: boolean;
  published: boolean;
  status: Status;
  scheduled_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  secondary_keywords: string[];
  canonical_url: string | null;
  robots_index: boolean;
  robots_follow: boolean;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image: string | null;
  schema_type: "BlogPosting" | "Article";
  faq_items: Array<{ question: string; answer: string }>;
  related_post_ids: string[];
};

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseSocialLinks(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, line) => {
      const [label, ...urlParts] = line.split(":");
      const url = urlParts.join(":").trim();
      if (label && url) acc[label.trim().toLowerCase()] = url;
      return acc;
    }, {});
}

function parse(formData: FormData): PostInput {
  const title = str(formData, "title");
  const body = str(formData, "body");
  const status = (str(formData, "status") || "Draft") as Status;
  const scheduledAt = str(formData, "scheduled_at");
  const publishDate = str(formData, "date") || new Date().toISOString().slice(0, 10);
  const slug = slugifyBlogTitle(str(formData, "slug") || title);
  const coverUrl = str(formData, "cover_url");
  const ogImage = str(formData, "og_image");

  return {
    title,
    slug,
    excerpt: str(formData, "excerpt"),
    body,
    date: publishDate,
    read_mins: Number(str(formData, "read_mins")) || estimateReadingTime(body),
    tag: str(formData, "tag") || "Guide",
    tags: cleanList(str(formData, "tags")),
    author: str(formData, "author"),
    author_initials: str(formData, "author_initials").slice(0, 4),
    author_color: str(formData, "author_color") || "var(--brand-soft)",
    author_bio: str(formData, "author_bio") || null,
    author_image: str(formData, "author_image") || null,
    author_social_links: parseSocialLinks(str(formData, "author_social_links")),
    category_name: str(formData, "category_name") || "AI Guides",
    cover_url: coverUrl || null,
    featured_image_alt: str(formData, "featured_image_alt") || null,
    featured: formData.get("featured") === "on",
    status,
    published: status === "Published" || (status === "Scheduled" && !!scheduledAt),
    scheduled_at: status === "Scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
    meta_title: str(formData, "meta_title") || null,
    meta_description: str(formData, "meta_description") || null,
    focus_keyword: str(formData, "focus_keyword") || null,
    secondary_keywords: cleanList(str(formData, "secondary_keywords")),
    canonical_url: str(formData, "canonical_url") || null,
    robots_index: formData.get("robots_index") !== "noindex",
    robots_follow: formData.get("robots_follow") !== "nofollow",
    og_title: str(formData, "og_title") || null,
    og_description: str(formData, "og_description") || null,
    og_image: ogImage || coverUrl || null,
    twitter_title: str(formData, "twitter_title") || null,
    twitter_description: str(formData, "twitter_description") || null,
    twitter_image: str(formData, "twitter_image") || ogImage || coverUrl || null,
    schema_type: str(formData, "schema_type") === "Article" ? "Article" : "BlogPosting",
    faq_items: parseFaqItems(str(formData, "faq_items_json")),
    related_post_ids: cleanList(str(formData, "related_post_ids")),
  };
}

function validate(post: PostInput): string | null {
  if (!post.title) return "Title is required.";
  if (!post.slug) return "Slug is required.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) return "Slug must use lowercase letters, numbers, and hyphens only.";
  if (!post.excerpt) return "Excerpt is required.";
  if (!post.body) return "Body is required.";
  if (!post.author) return "Author is required.";
  if (!post.author_initials) return "Author initials are required.";
  if (!Number.isFinite(post.read_mins) || post.read_mins < 1) return "Reading time must be at least 1 minute.";
  if (!["Draft", "Published", "Scheduled"].includes(post.status)) return "Invalid status.";
  if (post.status === "Scheduled" && !post.scheduled_at) return "Scheduled posts need a scheduled date and time.";
  if (!["BlogPosting", "Article"].includes(post.schema_type)) return "Invalid schema type.";
  return null;
}

function bustCaches(...slugs: string[]) {
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  revalidatePath("/robots.txt");
  revalidatePath("/admin/blog");
  slugs.filter(Boolean).forEach((slug) => revalidatePath(`/blog/${slug}`));
}

function demoPostToRow(post: (typeof BLOGS)[number], sortIndex: number) {
  const date = new Date(post.date);
  const isoDate = Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
  const tag =
    post.category === "Automation" ? "Automation" :
    post.category === "Subscriptions" ? "Compare" :
    post.category === "Growth" ? "News" :
    "Guide";

  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    body: post.content,
    date: isoDate,
    read_mins: post.readingTime,
    tag,
    tags: post.tags,
    author: post.author,
    author_initials: post.authorInitials,
    author_color: post.authorColor,
    author_bio: "Sharing practical AI, subscription, and digital growth guides from the SubscribAI editorial team.",
    author_image: null,
    author_social_links: {},
    category_name: post.category,
    cover_url: post.image,
    featured_image_alt: post.title,
    featured: Boolean(post.featured || sortIndex < 3),
    published: true,
    status: "Published" as const,
    scheduled_at: null,
    meta_title: post.title,
    meta_description: post.excerpt,
    focus_keyword: post.tags[0] || null,
    secondary_keywords: post.tags.slice(1),
    canonical_url: null,
    robots_index: true,
    robots_follow: true,
    og_title: post.title,
    og_description: post.excerpt,
    og_image: post.image,
    twitter_title: post.title,
    twitter_description: post.excerpt,
    twitter_image: post.image,
    schema_type: "BlogPosting" as const,
    faq_items: [],
    related_post_ids: [],
  };
}

export async function importDemoPosts(): Promise<void> {
  const supabase = await getSupabaseServer();
  const slugs = BLOGS.map((post) => post.slug);
  const { data, error: readError } = await supabase
    .from("blog_posts")
    .select("slug")
    .in("slug", slugs);

  if (readError) redirect(`/admin/blog?error=${encodeURIComponent(readError.message)}`);

  const existing = new Set((data ?? []).map((row: { slug: string }) => row.slug));
  const missing = BLOGS
    .map((post, index) => demoPostToRow(post, index))
    .filter((post) => !existing.has(post.slug));

  if (missing.length === 0) {
    redirect("/admin/blog?imported=0");
  }

  const { error } = await supabase.from("blog_posts").insert(missing);
  if (error) redirect(`/admin/blog?error=${encodeURIComponent(error.message)}`);

  bustCaches(...missing.map((post) => post.slug));
  redirect(`/admin/blog?imported=${missing.length}`);
}

async function uniqueSlug(baseSlug: string, originalSlug?: string) {
  const supabase = await getSupabaseServer();
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const { data } = await supabase.from("blog_posts").select("slug").eq("slug", candidate).maybeSingle();
    if (!data || candidate === originalSlug) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function createPost(formData: FormData): Promise<{ ok: false; error: string } | never> {
  const post = parse(formData);
  const error = validate(post);
  if (error) return { ok: false, error };

  const supabase = await getSupabaseServer();
  const slug = await uniqueSlug(post.slug);
  const { error: insertError } = await supabase.from("blog_posts").insert({ ...post, slug });
  if (insertError) return { ok: false, error: insertError.message };

  bustCaches(slug);
  redirect(`/admin/blog?created=${encodeURIComponent(slug)}`);
}

export async function updatePost(formData: FormData): Promise<{ ok: false; error: string } | never> {
  const post = parse(formData);
  const originalSlug = str(formData, "__original_slug");
  if (!originalSlug) return { ok: false, error: "Missing original slug." };
  const error = validate(post);
  if (error) return { ok: false, error };

  const supabase = await getSupabaseServer();
  const slug = await uniqueSlug(post.slug, originalSlug);
  const { error: updateError } = await supabase.from("blog_posts").update({ ...post, slug }).eq("slug", originalSlug);
  if (updateError) return { ok: false, error: updateError.message };

  if (slug !== originalSlug) {
    await supabase.from("redirects").upsert({
      old_slug: originalSlug,
      new_slug: slug,
      status_code: 301,
    }, { onConflict: "old_slug" });
  }

  bustCaches(originalSlug, slug);
  redirect(`/admin/blog?updated=${encodeURIComponent(slug)}`);
}

export async function deletePost(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  if (!slug) redirect(`/admin/blog?error=${encodeURIComponent("Missing slug.")}`);
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("blog_posts").delete().eq("slug", slug);
  if (error) redirect(`/admin/blog?error=${encodeURIComponent(error.message)}`);
  bustCaches(slug);
  redirect(`/admin/blog?deleted=${encodeURIComponent(slug)}`);
}
