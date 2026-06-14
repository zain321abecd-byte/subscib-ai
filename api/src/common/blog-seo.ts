// Ported subset of lib/blog-seo.ts — the helpers the write-path needs.

export type FaqItem = { question: string; answer: string };

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
