# Cutover guide — Next.js → NestJS

The NestJS backend (`api/`) now reimplements all the moved logic. This guide is
the **Phase 6** checklist: repoint the frontend at the new API, verify, then
delete the old Next.js routes.

> ⚠️ Do these steps **after** the API is deployed to Render and `/health/ready`
> returns `{ ok: true }`. Do NOT delete the old `app/api/*` routes until each
> replacement is verified live — otherwise the site breaks between deploys.

## Endpoint map (old → new)

| Old (Next.js, same-origin) | New (NestJS, `NEXT_PUBLIC_API_URL`) | Auth |
| --- | --- | --- |
| `POST /api/orders` | `POST /orders` | optional Bearer |
| `PATCH /api/orders/:id` | `PATCH /orders/:id` | public (callback) |
| `POST /api/create-payment` | `POST /payments` | public |
| `GET /api/payment-status` | `GET /payments/status` | public |
| `GET/POST /api/sahulatpay-callback` | `GET/POST /payments/callback` | public |
| `POST /api/traffic` | `POST /traffic` | optional Bearer |
| `GET /api/fx-rate` | `GET /fx-rate` | public |
| `POST /api/admin/upload` | `POST /uploads` | Bearer (admin) |
| `POST /api/admin/upload-signature` | `POST /uploads/signature` | Bearer (admin) |
| `GET/POST /api/admin/stock` | `GET/POST /stock` | Bearer (admin) |
| `GET/PATCH/DELETE /api/admin/stock/:id` | `…/stock/:id` | Bearer (admin) |
| `POST /api/admin/stock/:id/renew` | `POST /stock/:id/renew` | Bearer (admin) |
| `GET /api/admin/stock/expiring-soon` | `GET /stock/expiring-soon` | Bearer (admin) |
| `GET /api/cron/stock-expiry-reminders` | `GET /cron/stock-expiry-reminders` + `@Cron` | CRON_SECRET |
| Server Action `createProduct/updateProduct/deleteProduct` | `POST/PATCH/DELETE /admin/products[/:id]` | Bearer (admin) |
| Server Action `createPost/updatePost/deletePost` | `POST/PATCH/DELETE /admin/blog[/:slug]` | Bearer (admin) |
| Server Action `createReview/updateReview/deleteReview` | `POST/PATCH/DELETE /admin/reviews[/:id]` | Bearer (admin) |
| Server Action `saveSettings` | `POST /admin/settings` | Bearer (admin) |
| Server Action `updateOrderStatus/Notes` | `PATCH /orders/:id` | (admin via UI) |

## Frontend files to repoint (use `lib/api-client.ts`)

- `app/(public)/checkout/page.tsx` — `/api/orders`, `/api/create-payment`, `/api/payment-status` → `apiPost("/orders")`, `apiPost("/payments")`, `apiGet("/payments/status?…")`
- `components/TrafficCapture.tsx` — `/api/traffic` → `apiPost("/traffic")`
- `lib/fx.tsx` — `/api/fx-rate` → `apiGet("/fx-rate")` (or leave the Next route; it's harmless)
- `app/admin/ImagePicker.tsx`, `app/admin/MultiImagePicker.tsx` — `/api/admin/upload` → `apiUpload("/uploads", file, folder)`
- Stock admin pages/components calling `/api/admin/stock*` → `apiGet/apiPost/apiPatch/apiDelete("/stock…", { auth: true })`
- Admin forms currently using Server Actions (`products`, `blog`, `reviews`, `settings`, `orders`, `stock`) → convert `<form action={serverAction}>` to client `onSubmit` that calls the matching `apiPost/apiPatch/apiDelete(..., { auth: true })`, then `router.refresh()`.

> Reads (product/blog/review/settings listing in RSC) stay as-is — Hybrid scope
> keeps them calling Supabase directly. Only mutations/integrations move.

## After verification — delete these old routes

```
app/api/orders/, app/api/create-payment/, app/api/payment-status/,
app/api/payment-diagnostics/, app/api/sahulatpay-callback/, app/api/traffic/,
app/api/admin/upload/, app/api/admin/upload-signature/, app/api/admin/stock/,
app/api/cron/
```
And remove the `crons` block from root `vercel.json` (cron now runs in NestJS).
Server Action files can be deleted once their forms call the API instead.

## Env wiring recap
- Frontend (Vercel): set `NEXT_PUBLIC_API_URL` = Render URL.
- Backend (Render): set `FRONTEND_ORIGIN` = Vercel domain (+ `http://localhost:3001` for dev).
- Set Render `TZ` if the 08:00 cron must match Asia/Karachi.

## Not yet ported (intentional)
- `importDemoPosts` admin action (depends on the large static `data/blogs.ts`
  seed). Low value for the API; re-add later if needed.
- `app/api/admin/diagnostics`, `app/api/debug/region` — dev/diagnostic helpers;
  keep in Next or port on demand.
