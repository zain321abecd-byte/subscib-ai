# SubscribAI Admin Panel — Setup

Once you have your Supabase + Cloudinary accounts, follow these 5 steps in order and you'll have a fully working admin panel at `/admin`.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New project. Give it a name and a strong database password.
2. After it provisions, open **Project Settings → API**. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never ship to browser)

## 2. Run the schema

In the Supabase dashboard:

1. Open **SQL Editor → New query**.
2. Paste the entire contents of `supabase/schema.sql` and click **Run**.
3. You should see "Success. No rows returned." That sets up all 7 tables, RLS policies, triggers, and the realtime publication.

## 3. Create your admin user

1. In Supabase, **Authentication → Users → Add user → Create new user** (with email + password). Disable email confirmation if you want to skip the verification email.
2. Open **SQL Editor** again and run (replace `you@example.com` with the email you just used):

   ```sql
   insert into admins (user_id, email, role)
   select id, email, 'superadmin'
   from auth.users
   where email = 'you@example.com';
   ```

   You're now an admin. Repeat for any other team members.

## 4. Set up Cloudinary

1. Go to [cloudinary.com](https://cloudinary.com) → sign up (free tier is plenty for product images).
2. **Dashboard → Settings → Upload → Upload presets → Add upload preset**:
   - Name: `subscribai_admin`
   - Signing mode: **Signed**
   - (everything else default)
3. Back in **Dashboard → Settings → API Keys** copy:
   - **Cloud name** → `CLOUDINARY_CLOUD_NAME` and `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`
4. Set `CLOUDINARY_UPLOAD_PRESET=subscribai_admin`.

## 5. Add the env vars

Locally, fill them into `.env.local` (see `.env.example` for the full list).

On Vercel, add them under **Project → Settings → Environment Variables**. Set scope to **Production + Preview + Development** for the public ones, **Production + Preview** only for the service-role and Cloudinary secrets.

Then redeploy.

## (Optional) Seed the catalog

The site renders a static fallback catalog of 18 products until you add real ones via the admin. To start with the static catalog already loaded into the DB:

```bash
node scripts/seed.mjs
```

You can then edit, delete, or rearrange them via `/admin/products`. Re-running is idempotent (it upserts by id).

## Day-to-day usage

- `/admin/login` — sign in (email + password from step 3).
- `/admin` — dashboard with live order feed and revenue stats.
- `/admin/products` — full catalog CRUD with Cloudinary uploads.
- `/admin/blog` — write/edit posts. Drafts (unpublished) hidden from the public site.
- `/admin/orders` — every order, filterable by status. Open one to update status / add notes.
- `/admin/reviews` — manage testimonials. `Approved = false` hides them.
- `/admin/freebies` — lead-magnet listings on `/freebies`.
- `/admin/settings` — WhatsApp number, contact email, hero copy, social links.
- `/admin/delivery` — Subscription Delivery Automation (see below).

## Subscription Delivery Automation

`/admin/delivery` turns a delivery into: pick a template → pick the subscription →
paste the credentials → preview → send. The message goes out on WhatsApp (and
optionally by email), and every send is logged.

**Setup**

1. Run `supabase/21-delivery-automation.sql` in the Supabase SQL editor. It
   creates `message_templates` + `delivery_messages`, seeds an English and an
   Urdu template for each message type, and grants the new `delivery:read`,
   `delivery:send`, `delivery:templates` keys to the seeded Admins / Managers
   portal groups.
2. Set `INTERNAL_API_TOKEN` to the same value in `.env.local` and `api/.env` —
   that's how the admin Server Actions authenticate to the backend.
3. Configure a WhatsApp provider in `api/.env` (all optional, see
   `api/.env.example`):
   - **Cloud API (Meta):** `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN`.
   - **Any other gateway:** `WHATSAPP_CUSTOM_URL` (+ token / field names).
   - **Nothing configured → manual mode:** the message is still rendered and
     logged, and the admin gets a one-click `wa.me` link. Useful from day one,
     while API access is pending.

**Screens**

- `/admin/delivery` — composer with a live preview (`delivery:read` to open,
  `delivery:send` to send).
- `/admin/delivery/templates` — create / edit / activate / delete templates,
  scoped by type, language, and (optionally) product (`delivery:templates`).
- `/admin/delivery/history` — every message with status, template, and which
  teammate sent it; view, copy, or resend.
- Order detail pages show **Send delivery message**, which opens the composer
  pre-filled with the customer and the purchased subscription.

**Templates** use `{{variable}}` (or `{variable}`) placeholders —
`customer_name`, `subscription_name`, `plan_name`, `email`, `password`,
`account_details`, `start_date`, `renewal_date`, `expiry_date`, `notes`,
`order_number`, plus `support_email` / `support_whatsapp` / `brand_name`, which
are filled from Site settings. Empty placeholders are dropped rather than sent
as literal text.

**Automatic reminders.** `DeliveryRemindersService` sweeps
`subscription_sales` daily at 09:00 server time: a renewal reminder
`DELIVERY_REMINDER_DAYS_BEFORE` days before `renew_date` (once per day per
sale) and a one-off expiry notice after `expiry_date` passes. Trigger it by
hand with `GET /delivery/cron/reminders` and the `CRON_SECRET` bearer (add
`?dry_run=1` to see what it would do). It skips itself in manual mode, and
`DELIVERY_REMINDERS_ENABLED=false` turns it off.

**Safeguards**

- Phone numbers are validated twice — libphonenumber-js in the Server Action
  (Pakistani numbers may be typed as `03001234567`) and an E.164 check on the
  API — before any provider is called.
- An identical message to the same number inside
  `DELIVERY_DUPLICATE_WINDOW_MINUTES` (default 10) is refused until the admin
  confirms, which stops double-clicks and re-submitted forms.
- The delivery log holds the credentials that were sent (that's what makes copy
  / resend work). Both tables are admin-only via RLS, the password field is
  masked in the composer preview, and history hides each message body until an
  admin clicks **Reveal**.

## Architecture notes

- **Single deploy.** All admin logic runs as Next.js Server Actions / Route Handlers — no separate backend.
- **RLS-enforced.** Public-facing pages use the anon key (read-only). Admin mutations use the cookie-aware server client and pass through `is_admin()` in Postgres.
- **Realtime orders.** The dashboard subscribes to `postgres_changes` on `orders` — new orders appear without a reload.
- **Static fallback.** If Supabase isn't configured (or is down), the public site falls back to the bundled static catalog so customers can still browse and place orders.
- **Cache invalidation.** Each admin save calls `revalidatePath` to bust the relevant ISR pages, so changes go live within seconds.
