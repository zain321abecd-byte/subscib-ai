import type { BlogPostRow } from "@/lib/supabase/types";

export type FaqItem = { question: string; answer: string };

export type SeoCheck = {
  label: string;
  passed: boolean;
};

export type SeoScore = {
  score: number;
  label: "Poor SEO" | "Average SEO" | "Good SEO" | "Excellent SEO";
  checks: SeoCheck[];
};

export function slugifyBlogTitle(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export function estimateReadingTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function cleanList(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseFaqItems(value: unknown): FaqItem[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        question: String((item as FaqItem)?.question || "").trim(),
        answer: String((item as FaqItem)?.answer || "").trim(),
      }))
      .filter((item) => item.question && item.answer);
  }

  if (typeof value !== "string" || !value.trim()) return [];
  try {
    return parseFaqItems(JSON.parse(value));
  } catch {
    return [];
  }
}

export function extractHeadings(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => {
      const match = line.trim().match(/^(#{2,3})\s+(.+)$/);
      if (!match) return null;
      const text = match[2].replace(/[#*_`]/g, "").trim();
      return {
        level: match[1].length,
        text,
        id: slugifyBlogTitle(text),
      };
    })
    .filter(Boolean) as Array<{ level: 2 | 3; text: string; id: string }>;
}

export function getFirstParagraph(content: string) {
  return (
    content
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .find((part) => part && !part.startsWith("#") && !part.startsWith("![")) || ""
  );
}

export function calculateSeoScore(input: {
  title: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  canonicalUrl: string;
  featuredImageAlt: string;
  ogImage: string;
  faqItems: FaqItem[];
}) {
  const keyword = input.focusKeyword.trim().toLowerCase();
  const title = input.title.toLowerCase();
  const metaDescription = input.metaDescription.toLowerCase();
  const firstParagraph = getFirstParagraph(input.content).toLowerCase();
  const hasInternalLink = /\]\(\/(?!\/)|href=["']\//i.test(input.content);
  const hasExternalLink = /https?:\/\/(?!subscribai\.com)/i.test(input.content);
  const hasHeadings = extractHeadings(input.content).length > 0;
  const wordCount = input.content.trim().split(/\s+/).filter(Boolean).length;
  const cleanSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) && input.slug.length <= 72;

  const checks: SeoCheck[] = [
    { label: "Meta title exists and is 50-60 characters", passed: input.metaTitle.length >= 50 && input.metaTitle.length <= 60 },
    { label: "Meta description exists and is 140-160 characters", passed: input.metaDescription.length >= 140 && input.metaDescription.length <= 160 },
    { label: "Focus keyword exists", passed: keyword.length > 0 },
    { label: "Focus keyword appears in title", passed: !!keyword && title.includes(keyword) },
    { label: "Focus keyword appears in meta description", passed: !!keyword && metaDescription.includes(keyword) },
    { label: "Focus keyword appears in first paragraph", passed: !!keyword && firstParagraph.includes(keyword) },
    { label: "Slug is clean and short", passed: cleanSlug },
    { label: "Featured image has alt text", passed: input.featuredImageAlt.trim().length > 0 },
    { label: "At least one internal link exists", passed: hasInternalLink },
    { label: "At least one external link exists", passed: hasExternalLink },
    { label: "H2/H3 headings exist", passed: hasHeadings },
    { label: "FAQ section exists", passed: input.faqItems.length > 0 },
    { label: "Content length is enough", passed: wordCount >= 700 },
    { label: "Canonical URL exists or auto-generated", passed: input.canonicalUrl.trim().length > 0 || input.slug.trim().length > 0 },
    { label: "OG image exists", passed: input.ogImage.trim().length > 0 },
  ];

  const score = Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);
  const label =
    score >= 90 ? "Excellent SEO" :
    score >= 74 ? "Good SEO" :
    score >= 50 ? "Average SEO" :
    "Poor SEO";

  return { score, label, checks } satisfies SeoScore;
}

export function getPostStatus(post: Pick<BlogPostRow, "status" | "published" | "scheduled_at">) {
  if (post.status) return post.status;
  if (post.scheduled_at && new Date(post.scheduled_at) > new Date()) return "Scheduled";
  return post.published ? "Published" : "Draft";
}
