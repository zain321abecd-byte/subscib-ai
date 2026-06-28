import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/products";
import { getAllPosts } from "@/lib/blog";

// Defensive: any trailing slash in the env would compound with the leading
// slash on each path → "//", which Google reports as a 404 / canonical issue.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://subscribai.com").replace(/\/+$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [PRODUCTS, POSTS] = await Promise.all([getAllProducts(), getAllPosts()]);
  const now = new Date();

  // Static high-value pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,         lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${SITE_URL}/shop`,     lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${SITE_URL}/prices`,   lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${SITE_URL}/blog`,     lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${SITE_URL}/faq`,      lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`,  lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/refund`,   lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${SITE_URL}/terms`,    lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${SITE_URL}/privacy`,  lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];

  // Per-product pages — high priority since these are the buying pages
  const productPages: MetadataRoute.Sitemap = PRODUCTS.map((p) => ({
    url: `${SITE_URL}/product/${p.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p.featured ? 0.9 : 0.8,
  }));

  // Per-blog-post pages
  const blogPages: MetadataRoute.Sitemap = POSTS.filter((p) => p.robotsIndex).map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.updatedAt || p.date),
    changeFrequency: "monthly",
    priority: p.featured ? 0.7 : 0.6,
  }));

  return [...staticPages, ...productPages, ...blogPages];
}
