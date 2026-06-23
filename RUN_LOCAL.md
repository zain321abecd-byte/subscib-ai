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
- `api/.env` — backend (PayFast configured; fill SUPABASE_*/CLOUDINARY_*/SMTP_* to enable those features)

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

- Storefront checkout → `POST /orders`, `POST /payments/init`, `GET /payments/status`
- Payment return / IPN from PayFast → `GET/POST /payments/return`, `POST /payments/ipn`
- Image uploads (admin) → `POST /uploads`
- Traffic analytics → `POST /traffic`
- FX rates → `GET /fx-rate`

Admin content writes (products/blog/reviews/settings) still use Next.js Server
Actions (they write to Supabase directly and keep working locally). Their REST
equivalents exist on the API for a later cutover — see `api/CUTOVER.md`.

## PayFast handshake flow

1. Browser → `POST /payments/init` with basket + customer details
2. Backend → `POST` to `/Ecommerce/api/Transaction/GetAccessToken` (PayFast)
3. Backend returns `{ action, fields }` — the browser auto-submits a hidden
   form-POST to PayFast's hosted checkout page
4. Customer pays on PayFast (bank / card / wallet — chosen on their page)
5. PayFast redirects browser → `GET /payments/return?…` (also `POST /payments/ipn`
   server-to-server). Backend verifies the `validation_hash`
   (`sha256("basket_id|secured_key|merchant_id|err_code")`) and updates the order
6. Backend 303-redirects browser to `/thank-you?orderId=…&status=paid|failed|pending`

## Notes
- If `SUPABASE_*` is empty in `api/.env`, DB-backed endpoints (orders, stock,
  admin, traffic) degrade gracefully — the API still boots and payments work.
- PayFast IPN + return URLs need a public host. For local UI testing the
  redirect flow works, but server-to-server IPN won't reach `localhost` —
  tunnel via ngrok / cloudflared and set `PAYFAST_PUBLIC_API_URL` to the tunnel.
- PayFast hosts are merchant-specific. Confirm yours with PayFast support.
  Common ones: live = `https://ipg1.apps.net.pk` (or ipg2/ipg3…),
  UAT/sandbox = `https://ipguat.apps.net.pk`.
