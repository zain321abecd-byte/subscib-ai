# SubscribAI API (NestJS)

Standalone backend service for SubscribAI. Lives in the same repo as the
Next.js frontend, but builds and deploys independently to **Render**. The
frontend stays on **Vercel** and talks to this API over HTTP.

```
subscib-ai/        ← repo root → Vercel builds this (Next.js)
└── api/           ← this folder → Render builds this (NestJS)
```

## Local development

```bash
cd api
npm install
cp .env.example .env   # fill in SUPABASE_* values
npm run start:dev      # http://localhost:4000
```

Smoke test:

```bash
curl http://localhost:4000/health         # liveness
curl http://localhost:4000/health/ready   # confirms Supabase creds work
```

## Deploying to Render

Create a **Web Service** pointed at this repo:

| Setting | Value |
| --- | --- |
| Root Directory | `api` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start:prod` |
| Health Check Path | `/health` |
| Region | Same region as your Supabase project (latency!) |
| Instance Type | Paid / always-on (free tier sleeps → cold starts) |

Then add every variable from `.env.example` in the Render dashboard
(Environment tab). Point the frontend's `NEXT_PUBLIC_API_URL` at the Render URL,
and set this service's `FRONTEND_ORIGIN` to your Vercel domain.

## Migration status (Next.js → NestJS)

- [x] Phase 1 — skeleton: health, config, Supabase module, CORS
- [x] Phase 2 — auth: AuthGuard + AdminGuard + Bearer token verification (`/auth/me`, `/auth/admin-check`)
- [x] Phase 3 — integrations: payments (`/payments*`), uploads (`/uploads*`), notifications + cron
- [x] Phase 4 — stock (`/stock*`), orders (`/orders*`), public (`/fx-rate`, `/traffic`)
- [x] Phase 5 — admin content writes (`/admin/products|blog|reviews|settings`)
- [ ] Phase 6 — cutover: repoint frontend (`lib/api-client.ts`) + delete old routes — see [CUTOVER.md](./CUTOVER.md)

## Endpoints

Public: `GET /health`, `GET /health/ready`, `GET /fx-rate`, `POST /traffic`,
`POST /orders`, `PATCH /orders/:id`, `POST /payments`, `GET /payments/status`,
`GET|POST /payments/callback`.

Auth (Bearer): `GET /auth/me`.

Admin (Bearer + admins table): `GET /auth/admin-check`, `POST /uploads`,
`POST /uploads/signature`, `GET|POST /stock`, `GET /stock/expiring-soon`,
`GET|PATCH|DELETE /stock/:id`, `POST /stock/:id/renew`,
`POST|PATCH|DELETE /admin/products[/:id]`, `POST|PATCH|DELETE /admin/blog[/:slug]`,
`POST|PATCH|DELETE /admin/reviews[/:id]`, `POST /admin/settings`.

Cron (CRON_SECRET): `GET /cron/stock-expiry-reminders` (also runs daily via `@Cron`).
