# SubscribAI — Deployment Guide

## 1. First-time Vercel setup

```bash
# Install Vercel CLI globally (once)
npm i -g vercel

# Link this folder to a Vercel project

vercel link
```

Pick **"Create new project"** (or link to an existing one). When asked for the
framework, pick **Next.js** (auto-detected).

## 2. Add environment variables to Vercel

The app reads these env vars at runtime. Set them in the Vercel dashboard
(Settings → Environment Variables) for **Production**, **Preview**, and
**Development**:

| Variable | Example | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://subscribai.com` | Used in canonical URLs, sitemap, OG tags |
| `SAHULATPAY_BASE_URL` | `https://api.assanpay.com` | SahulatPay API host |
| `SAHULATPAY_MERCHANT_ID` | `0ec2814d-…` | From the AssanPay dashboard |
| `SAHULATPAY_API_KEY` | `SPAY-…` | From the AssanPay dashboard |
| `SAHULATPAY_MASTER_SECRET_KEY` | hex string | Decryption key from AssanPay portal |
| `SAHULATPAY_WALLET_MODE` | `direct` | Default initiation mode |
| `SAHULATPAY_JAZZCASH_MODE` | `async` | JZ-specific mode |
| `SAHULATPAY_EASYPAISA_MODE` | `direct` | EP-specific mode |
| `SITE_URL` | `https://subscribai.com` | Used in SahulatPay callback URLs |

After adding, run `vercel env pull` locally if you want to sync them.

## 3. Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

Vercel auto-deploys on every push to your linked Git branch:
- `main` → Production
- any other branch → Preview URL

## 4. Custom domain

In the Vercel dashboard: **Settings → Domains → Add**. Point your DNS:
- A record `@` → `76.76.21.21`
- CNAME `www` → `cname.vercel-dns.com`

After DNS propagates (5–60 min), update `NEXT_PUBLIC_SITE_URL` and `SITE_URL`
in env vars to the custom domain, then redeploy: `vercel --prod`.

## 5. Update SahulatPay callback URL

Once your custom domain is live, log in to the AssanPay merchant portal and
register your callback URL as:

```
https://yourdomain.com/api/sahulatpay-callback
```

Without this, the gateway can't notify your server when wallet payments
complete (you'll only see status changes via the polling fallback).

## 6. Post-deploy checklist

- [ ] `https://yourdomain.com/sitemap.xml` returns 200 with all routes listed
- [ ] `https://yourdomain.com/robots.txt` returns 200 with the sitemap line
- [ ] `https://yourdomain.com/manifest.webmanifest` returns 200
- [ ] `https://yourdomain.com/api/payment-diagnostics` shows
      `sahulatPayConfigured: true`
- [ ] Submit `https://yourdomain.com/sitemap.xml` to Google Search Console
- [ ] Test a real JazzCash payment end-to-end on the live URL
      (callbacks won't fire on localhost)

## 7. Local development

```bash

npm install
npm run dev      # http://localhost:3001
npm run build    # production build, fails fast on type errors
npm run typecheck
```

## 8. SEO — what's already set up

- Per-page `<title>`, `description`, `canonical`
- Open Graph + Twitter Card on every page
- `Organization` and `WebSite` JSON-LD on the home/global layout
- `Product` and `BreadcrumbList` JSON-LD on every product detail page
- Auto-generated `/sitemap.xml` (re-builds with every deploy)
- Auto-generated `/robots.txt`
- Auto-generated `/manifest.webmanifest` (PWA-ready)
- Theme color meta tag for mobile chrome
- `noindex` on `/cart`, `/checkout`, `/account` (private pages)
- Security headers via `vercel.json` (X-Content-Type-Options, X-Frame-Options,
  Referrer-Policy, Permissions-Policy)

## 9. Things to add later (optional)

- Custom Open Graph image generator (`app/opengraph-image.tsx` with `@vercel/og`)
- Google Analytics or Plausible — install `@next/third-parties` and add to `layout.tsx`
- Real product images (replace the colored gradients in the product card media)
- Vercel Web Analytics — `npm i @vercel/analytics` then `<Analytics />` in layout
- Vercel Speed Insights — `npm i @vercel/speed-insights`, add to layout
- Email subscription / cart-abandonment recovery
- Real auth on `/account` (currently just a stub page)
