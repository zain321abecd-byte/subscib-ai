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
| `NEXT_PUBLIC_API_URL` | `https://api.subscribai.com` | URL of the NestJS backend (Render) |

Backend env vars (set on Render, not Vercel — see `api/.env.example`):

| Variable | Example | Purpose |
|---|---|---|
| `PAYFAST_BASE_URL` | `https://ipg1.apps.net.pk` | Merchant-specific live host (PayFast tells you yours: ipg1/ipg2/ipg3…). UAT: `https://ipguat.apps.net.pk` |
| `PAYFAST_MERCHANT_ID` | `619747` | From the PayFast merchant portal |
| `PAYFAST_MERCHANT_NAME` | `SubscribAI` | Brand name shown on the PayFast hosted page |
| `PAYFAST_SECURED_KEY` | `26fGLi…` | Used in token requests + `validation_hash` |
| `PAYFAST_CURRENCY` | `PKR` | Transaction currency |
| `PAYFAST_PUBLIC_API_URL` | `https://api.subscribai.com` | Where PayFast sends SUCCESS / FAILURE / IPN |
| `SITE_URL` | `https://subscribai.com` | Frontend origin (used for redirects) |
| `FRONTEND_ORIGIN` | `https://subscribai.com` | CORS allow-list (comma-separated) |

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

## 5. Update PayFast callback URL

Once your custom domain is live, log in to the PayFast merchant portal and
register the following on your merchant profile:

```
SUCCESS_URL  : https://api.yourdomain.com/payments/return?outcome=success
FAILURE_URL  : https://api.yourdomain.com/payments/return?outcome=failure
CHECKOUT_URL : https://api.yourdomain.com/payments/ipn
```

(All three live on the **backend** host — the customer's browser is redirected
back via SUCCESS/FAILURE; the gateway pings CHECKOUT for server-to-server IPN.
The backend then 303-redirects the customer to `/thank-you` on the frontend.)

## 6. Post-deploy checklist

- [ ] `https://yourdomain.com/sitemap.xml` returns 200 with all routes listed
- [ ] `https://yourdomain.com/robots.txt` returns 200 with the sitemap line
- [ ] `https://yourdomain.com/manifest.webmanifest` returns 200
- [ ] `https://api.yourdomain.com/health` returns `{ ok: true }`
- [ ] Submit `https://yourdomain.com/sitemap.xml` to Google Search Console
- [ ] Test a real PayFast payment end-to-end on the live URL
      (SUCCESS_URL / FAILURE_URL / CHECKOUT_URL must all resolve publicly —
      they won't fire on localhost without a tunnel)

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
