# Running SubscribAI locally (frontend + NestJS API)

Two services run together:

| Service | Port | Folder |
| --- | --- | --- |
| Next.js frontend | 3001 | repo root |
| NestJS API | 4000 | `api/` |

The frontend calls the API via `NEXT_PUBLIC_API_URL` (set to `http://localhost:4000`
in `.env.local`). The API allows the frontend origin via `FRONTEND_ORIGIN` in `api/.env`.

## First-time setup

```bash
npm install            # root (frontend) deps + concurrently
npm install --prefix api   # backend deps
```

Env files are already created:
- `.env.local` — frontend (has `NEXT_PUBLIC_API_URL=http://localhost:4000`)
- `api/.env` — backend (SahulatPay configured; fill SUPABASE_*/CLOUDINARY_*/SMTP_* to enable those features)

## Run both with one command

```bash
npm run dev:all
```

Or run them in separate terminals:

```bash
npm run dev:web    # http://localhost:3001
npm run dev:api    # http://localhost:4000  (watch mode)
```

## Smoke test the API

```bash
curl http://localhost:4000/health        # { ok: true }
curl http://localhost:4000/fx-rate       # live USD→PKR/INR
```

## What now goes through the API

- Storefront checkout → `POST /orders`, `POST /payments`, `GET /payments/status`
- Image uploads (admin) → `POST /uploads`
- Traffic analytics → `POST /traffic`
- FX rates → `GET /fx-rate`

Admin content writes (products/blog/reviews/settings) still use Next.js Server
Actions (they write to Supabase directly and keep working locally). Their REST
equivalents exist on the API for a later cutover — see `api/CUTOVER.md`.

## Notes
- If `SUPABASE_*` is empty in `api/.env`, DB-backed endpoints (orders, stock,
  admin, traffic) degrade gracefully — the API still boots and payments work.
- SahulatPay callbacks need a public URL; for local UI testing the redirect/poll
  flow works, but server-to-server callbacks won't reach `localhost`.
