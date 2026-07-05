import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "cdn.simpleicons.org" },
    ],
  },
  /**
   * Keep native/CommonJS-only Node modules OUT of the Next bundler.
   * Bundling them for serverless functions on Vercel silently mangles
   * conditional requires and produces "Cannot find module" / crash
   * at runtime — which is what /product/* was hitting in production
   * while working fine locally.
   *
   *   • isomorphic-dompurify  → wraps DOMPurify with a Node fallback
   *     that dynamic-requires `jsdom` at runtime
   *   • jsdom                 → the fallback itself (native modules,
   *                             big surface area, must stay external)
   */
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
};

export default nextConfig;
