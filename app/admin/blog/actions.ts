"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { ensureUniqueSlug, slugify } from "@/lib/slug";

type PostInput = {
  title: string;
  excerpt: string;
  body: string;
  date: string;
  read_mins: number;
  tag: string;
  author: string;
  author_initials: string;
  author_color: string;
  cover_url: string | null;
  featured: boolean;
  published: boolean;
};

function parse(formData: FormData): PostInput {
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const num = (k: string) => Number(formData.get(k) ?? 0);
  return {
    title: str("title"),
    excerpt: str("excerpt"),
    body: str("body"),
    date: str("date"),
    read_mins: num("read_mins"),
    tag: str("tag") || "Guide",
    author: str("author"),
    author_initials: str("author_initials").slice(0, 4),
    author_color: str("author_color") || "var(--brand-soft)",
    cover_url: str("cover_url") || null,
    featured: formData.get("featured") === "on",
    published: formData.get("published") === "on",
  };
}

function validate(p: PostInput): string | null {
  if (!p.title) return "Title is required.";
  if (!p.excerpt) return "Excerpt is required.";
  if (!p.body) return "Body is required.";
  if (!p.date) return "Date is required.";
  if (!p.author) return "Author is required.";
  if (!p.author_initials) return "Author initials are required.";
  if (!Number.isFinite(p.read_mins) || p.read_mins < 1) return "Read minutes must be at least 1.";
  if (!["Guide", "Compare", "Automation", "News"].includes(p.tag)) return "Invalid tag.";
  return null;
}

function bustCaches(slug: string) {
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/blog");
}

export async function createPost(formData: FormData): Promise<{ ok: false; error: string } | never> {
  const p = parse(formData);
  const err = validate(p);
  if (err) return { ok: false, error: err };

  const supabase = await getSupabaseServer();
  const slug = await ensureUniqueSlug(supabase, "blog_posts", "slug", slugify(p.title));

  const { error } = await supabase.from("blog_posts").insert({ slug, ...p });
  if (error) return { ok: false, error: error.message };
  bustCaches(slug);
  redirect(`/admin/blog?created=${encodeURIComponent(slug)}`);
}

export async function updatePost(formData: FormData): Promise<{ ok: false; error: string } | never> {
  const p = parse(formData);
  const originalSlug = String(formData.get("__original_slug") || "").trim();
  if (!originalSlug) return { ok: false, error: "Missing original slug." };
  const err = validate(p);
  if (err) return { ok: false, error: err };

  // Slug is sticky on edits.
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("blog_posts").update(p).eq("slug", originalSlug);
  if (error) return { ok: false, error: error.message };
  bustCaches(originalSlug);
  redirect(`/admin/blog?updated=${encodeURIComponent(originalSlug)}`);
}

export async function deletePost(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") || "").trim();
  if (!slug) redirect(`/admin/blog?error=${encodeURIComponent("Missing slug.")}`);
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("blog_posts").delete().eq("slug", slug);
  if (error) redirect(`/admin/blog?error=${encodeURIComponent(error.message)}`);
  bustCaches(slug);
  redirect(`/admin/blog?deleted=${encodeURIComponent(slug)}`);
}
