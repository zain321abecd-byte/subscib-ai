import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";

// Private/transactional pages that no crawler should index
const PRIVATE = ["/api/", "/admin/", "/account", "/cart", "/checkout", "/login", "/auth/", "/thank-you"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE,
      },
      // Explicitly welcome AI-search crawlers (GEO): being cited in
      // ChatGPT / Claude / Perplexity / Gemini answers is a traffic
      // channel for this store, so give them the same access as Google.
      ...["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "anthropic-ai", "Claude-Web", "PerplexityBot", "Google-Extended", "Applebot-Extended", "cohere-ai"].map(
        (userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })
      ),
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
