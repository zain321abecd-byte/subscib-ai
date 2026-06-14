import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseService } from "../supabase/supabase.service";
import { cleanList, estimateReadingTime, parseFaqItems, slugifyBlogTitle } from "../common/blog-seo";

type Status = "Draft" | "Published" | "Scheduled";

function parseSocialLinks(value: unknown): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, string>;
  return String(value || "")
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

function normalize(raw: any) {
  const str = (k: string) => String(raw?.[k] ?? "").trim();
  const title = str("title");
  const body = str("body");
  const status = (str("status") || "Draft") as Status;
  const scheduledAt = str("scheduled_at");
  const publishDate = str("date") || new Date().toISOString().slice(0, 10);
  const slug = slugifyBlogTitle(str("slug") || title);
  const coverUrl = str("cover_url");
  const ogImage = str("og_image");

  return {
    title,
    slug,
    excerpt: str("excerpt"),
    body,
    date: publishDate,
    read_mins: Number(str("read_mins")) || estimateReadingTime(body),
    tag: str("tag") || "Guide",
    tags: cleanList(raw?.tags),
    author: str("author"),
    author_initials: str("author_initials").slice(0, 4),
    author_color: str("author_color") || "var(--brand-soft)",
    author_bio: str("author_bio") || null,
    author_image: str("author_image") || null,
    author_social_links: parseSocialLinks(raw?.author_social_links),
    category_name: str("category_name") || "AI Guides",
    cover_url: coverUrl || null,
    featured_image_alt: str("featured_image_alt") || null,
    featured: raw?.featured === true || raw?.featured === "on",
    status,
    published: status === "Published" || (status === "Scheduled" && !!scheduledAt),
    scheduled_at: status === "Scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
    meta_title: str("meta_title") || null,
    meta_description: str("meta_description") || null,
    focus_keyword: str("focus_keyword") || null,
    secondary_keywords: cleanList(raw?.secondary_keywords),
    canonical_url: str("canonical_url") || null,
    robots_index: raw?.robots_index !== "noindex" && raw?.robots_index !== false,
    robots_follow: raw?.robots_follow !== "nofollow" && raw?.robots_follow !== false,
    og_title: str("og_title") || null,
    og_description: str("og_description") || null,
    og_image: ogImage || coverUrl || null,
    twitter_title: str("twitter_title") || null,
    twitter_description: str("twitter_description") || null,
    twitter_image: str("twitter_image") || ogImage || coverUrl || null,
    schema_type: str("schema_type") === "Article" ? "Article" : "BlogPosting",
    faq_items: parseFaqItems(raw?.faq_items ?? raw?.faq_items_json),
    related_post_ids: cleanList(raw?.related_post_ids),
  };
}

type PostInput = ReturnType<typeof normalize>;

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

@Injectable()
export class BlogService {
  constructor(private readonly supabase: SupabaseService) {}

  private async uniqueSlug(supabase: SupabaseClient, baseSlug: string, originalSlug?: string) {
    let candidate = baseSlug;
    let suffix = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data } = await supabase.from("blog_posts").select("slug").eq("slug", candidate).maybeSingle();
      if (!data || candidate === originalSlug) return candidate;
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  async create(body: any) {
    const post = normalize(body);
    const err = validate(post);
    if (err) throw new BadRequestException(err);

    const supabase = this.supabase.admin();
    const slug = await this.uniqueSlug(supabase, post.slug);
    const { error } = await supabase.from("blog_posts").insert({ ...post, slug });
    if (error) throw new InternalServerErrorException(error.message);
    return { ok: true, slug };
  }

  async update(originalSlug: string, body: any) {
    if (!originalSlug) throw new BadRequestException("Missing original slug.");
    const post = normalize(body);
    const err = validate(post);
    if (err) throw new BadRequestException(err);

    const supabase = this.supabase.admin();
    const slug = await this.uniqueSlug(supabase, post.slug, originalSlug);
    const { error } = await supabase.from("blog_posts").update({ ...post, slug }).eq("slug", originalSlug);
    if (error) throw new InternalServerErrorException(error.message);

    if (slug !== originalSlug) {
      await supabase.from("redirects").upsert(
        { old_slug: originalSlug, new_slug: slug, status_code: 301 },
        { onConflict: "old_slug" },
      );
    }
    return { ok: true, slug };
  }

  async remove(slug: string) {
    if (!slug) throw new BadRequestException("Missing slug.");
    const { error } = await this.supabase.admin().from("blog_posts").delete().eq("slug", slug);
    if (error) throw new InternalServerErrorException(error.message);
    return { ok: true, slug };
  }
}
