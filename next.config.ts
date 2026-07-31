import type { NextConfig } from "next";

/* Content-Security-Policy. 'unsafe-inline' for scripts/styles is required
   by Next.js hydration scripts and the GA/GTM/Meta-Pixel inline loaders in
   app/layout.tsx (no nonce infrastructure here). img-src stays https:-wide
   because product/blog images are admin-configured URLs (Cloudinary today,
   anywhere tomorrow). Update connect-src if a new client-side API is added. */
const CSP = [
  "default-src 'self'",
  // Dev needs 'unsafe-eval' for webpack/react-refresh eval'd source maps.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://cdnjs.cloudflare.com",
  "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://vitals.vercel-insights.com",
  "frame-src https://www.googletagmanager.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "cdn.simpleicons.org" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: CSP }],
      },
    ];
  },
};

export default nextConfig;
