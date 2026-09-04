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
  // subscribai-api.onrender.com is the Render backend the portal/admin login
  // fetches (NEXT_PUBLIC_API_URL) — omitting it broke sign-in with
  // "Failed to fetch".
  "connect-src 'self' https://subscribai-api.onrender.com https://*.supabase.co https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://vitals.vercel-insights.com",
  "frame-src https://www.googletagmanager.com",
  "object-src 'none'",
  "base-uri 'self'",
  // Checkout hands off to PayFast by auto-submitting a hidden <form> to the
  // gateway's hosted page (ipg.apps.net.pk prod / ipguat.apps.net.pk UAT).
  // 'self' alone silently blocks that submit and strands the customer after
  // the order is created.
  // Wildcard rather than the two known hosts: a CSP form-action block is
  // silent (console-only), which is indistinguishable from "stuck on
  // Redirecting…". Covers any PayFast host the gateway hands back.
  "form-action 'self' https://*.apps.net.pk https://apps.net.pk",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    /* Optimization ON. Every <Image> in the app points at a local asset
       (/assets/subscribai-logo.png — a 537×130 PNG rendered at ~149px wide),
       so the optimizer converts it to AVIF/WebP at the right DPR instead of
       shipping the full PNG on every page. Product and blog artwork uses plain
       <img> with admin-supplied URLs and is unaffected by this flag.
       Re-add `unoptimized: true` if the app is ever deployed to a host without
       the Next image optimizer. */
    formats: ["image/avif", "image/webp"],
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
