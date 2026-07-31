import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/products";
import { getAllPosts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site-url";

/**
 * `lastModified` has to be truthful or Google discards the signal.
 *
 * This previously stamped `new Date()` on every static page and every product,
 * so each fetch of the sitemap claimed the entire site had just changed. Google
 * treats an always-"now" lastmod as noise and discounts it for the whole file —
 * including the blog entries that were accurate.
 *
 * Now: real DB timestamps where they exist, field omitted where no meaningful
 * change date exists. An omitted lastmod is valid; a false one is worse than none.
 */
function newest(dates: (string | undefined)[]): Date | undefined {
  const times = dates
    .filter((d): d is string => !!d)
    .map((d) => new Date(d).getTime())
    .filter((t) => Number.isFinite(t));
  return times.length ? new Date(Math.max(...times)) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [PRODUCTS, POSTS] = await Promise.all([getAllProducts(), getAllPosts()]);

  const productsChanged = newest(PRODUCTS.map((p) => p.updatedAt));
  const postsChanged = newest(POSTS.map((p) => p.updatedAt || p.date));
  // Home surfaces both the catalog and the blog, so it changes when either does.
  const homeChanged = newest([productsChanged?.toISOString(), postsChanged?.toISOString()]);

  // Content-driven pages: dated from the newest underlying row.
  const datedStatic: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"),       lastModified: homeChanged,     changeFrequency: "daily",  priority: 1.0 },
    { url: absoluteUrl("/shop"),   lastModified: productsChanged, changeFrequency: "daily",  priority: 0.9 },
    { url: absoluteUrl("/prices"), lastModified: productsChanged, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/blog"),   lastModified: postsChanged,    changeFrequency: "weekly", priority: 0.7 },
  ];

  // Editorial / legal pages: no reliable change date, so send none.
  const undatedStatic: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/faq"),                     changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/about"),                   changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/contact"),                 changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/custom-pricing"),          changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/business-bundle-inquiry"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/refund"),                  changeFrequency: "yearly",  priority: 0.3 },
    { url: absoluteUrl("/terms"),                   changeFrequency: "yearly",  priority: 0.3 },
    { url: absoluteUrl("/privacy"),                 changeFrequency: "yearly",  priority: 0.3 },
  ];

  // Per-product pages — high priority since these are the buying pages.
  const productPages: MetadataRoute.Sitemap = PRODUCTS.map((p) => ({
    url: absoluteUrl(`/product/${p.id}`),
    lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
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
  return [...datedStatic, ...undatedStatic, ...productPages, ...blogPages].filter((entry) => {
    const key = entry.url.replace(/\/+$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
