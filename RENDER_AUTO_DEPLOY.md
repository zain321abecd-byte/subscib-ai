# Render Auto Deploy Setup

Use this for the Nest backend in `api/`. The frontend stays on Vercel.

## One-time Render setup

1. Open Render Dashboard.
2. Create or open the backend Web Service.
3. Connect GitHub repo:
   `https://github.com/zain321abecd-byte/subscib-ai`
4. Set branch:
   `main`
5. Set root directory:
   `api`
6. Set build command:
   `npm install && npm run build`
7. Set start command:
   `npm run start:prod`
8. Set health check path:
   `/health`
9. In Settings -> Auto-Deploy, choose:
   `On Commit`

After this, every push to `main` will rebuild and redeploy the backend.

## Blueprint option

This repo also includes `render.yaml` at the repo root. In Render, you can create
a Blueprint from the GitHub repo and Render will use that file to configure the
backend service.

Secret values in `render.yaml` use `sync: false`, so Render asks for them in the
dashboard instead of storing them in Git.

## Required backend environment variables

Set these in Render Environment:

```text
FRONTEND_ORIGIN=https://subscribai.com
SITE_URL=https://subscribai.com
NEXT_PUBLIC_SITE_URL=https://subscribai.com
PAYFAST_PUBLIC_API_URL=https://api.subscribai.com
API_URL=https://api.subscribai.com

SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

PAYFAST_BASE_URL=...
PAYFAST_MERCHANT_ID=...
PAYFAST_MERCHANT_NAME=SubscribAI
PAYFAST_SECURED_KEY=...
PAYFAST_CURRENCY=PKR

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_UPLOAD_PRESET=subscribai_admin

SMTP_HOST=mail.subscribai.com
SMTP_PORT=587
SMTP_USER=support@subscribai.com
SMTP_PASS=...
SMTP_SECURE=false
EMAIL_FROM=SubscribAI <support@subscribai.com>
EMAIL_REPLY_TO=support@subscribai.com

CRON_SECRET=...
```

Do not put secret values in `NEXT_PUBLIC_*` variables.
