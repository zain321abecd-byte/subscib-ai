import type { MetadataRoute } from "next";

// Defensive: trailing slashes in the env would produce "host//sitemap.xml".
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://subscribai.com").replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Hide private/transactional pages from search engines
        disallow: ["/api/", "/admin/", "/cart", "/checkout", "/account"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
