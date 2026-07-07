import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/products";
import { getAllPosts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [PRODUCTS, POSTS] = await Promise.all([getAllProducts(), getAllPosts()]);
  const now = new Date();

  // Static high-value pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"),                       lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: absoluteUrl("/shop"),                   lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: absoluteUrl("/prices"),                 lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: absoluteUrl("/blog"),                   lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: absoluteUrl("/faq"),                    lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/contact"),                lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/custom-pricing"),         lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/business-bundle-inquiry"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/refund"),                 lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: absoluteUrl("/terms"),                  lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: absoluteUrl("/privacy"),                lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];

  // Per-product pages — high priority since these are the buying pages
  const productPages: MetadataRoute.Sitemap = PRODUCTS.map((p) => ({
    url: absoluteUrl(`/product/${p.id}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: p.featured ? 0.9 : 0.8,
  }));

  // Per-blog-post pages
  const blogPages: MetadataRoute.Sitemap = POSTS.filter((p) => p.robotsIndex).map((p) => ({
    url: absoluteUrl(`/blog/${p.slug}`),
    lastModified: new Date(p.updatedAt || p.date),
    changeFrequency: "monthly",
    priority: p.featured ? 0.7 : 0.6,
  }));

  const seen = new Set<string>();
  return [...staticPages, ...productPages, ...blogPages].filter((entry) => {
    const key = entry.url.replace(/\/+$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
