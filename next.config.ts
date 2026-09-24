import type { NextConfig } from "next";

/* Content-Security-Policy. 'unsafe-inline' for scripts/styles is required
   by Next.js hydration scripts and the GA/GTM/Meta-Pixel inline loaders in
   app/layout.tsx (no nonce infrastructure here). img-src stays https:-wide
   because product/blog images are admin-configured URLs (Cloudinary today,
   anywhere tomorrow). Update connect-src if a new client-side API is added. */
const isDev = process.env.NODE_ENV === "development";
const CSP = [
  "default-src 'self'",
  // Dev needs 'unsafe-eval' for webpack/react-refresh eval'd source maps.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://cdnjs.cloudflare.com",
  "connect-src 'self' http://localhost:4000 http://127.0.0.1:4000 ws://localhost:3001 ws://127.0.0.1:3001 https://subscribai-api.onrender.com https://*.supabase.co https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://vitals.vercel-insights.com",
  "frame-src https://www.googletagmanager.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.apps.net.pk https://apps.net.pk",
  "frame-ancestors 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].filter(Boolean).join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    /* Optimizer stays OFF — deliberately, and it costs nothing here.
       The only asset any <Image> points at is /assets/subscribai-logo.png,
       which is now pre-optimized to 448×108 / 9 KB (down from 537×130 / 39 KB)
       and is never rendered wider than 160 CSS px. Serving it statically means
       no per-request transforms counting against the Vercel image quota, and
       no format-support risk, for ~5 KB more than an AVIF transform would give.
       Product and blog artwork is Cloudinary-hosted and optimized at the URL
       level instead — see lib/cloudinary-url.ts.
       Flip this to `false` only if a future <Image> needs true responsive
       resizing off a large local source. */
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
