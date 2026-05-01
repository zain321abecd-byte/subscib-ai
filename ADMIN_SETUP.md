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

## Architecture notes

- **Single deploy.** All admin logic runs as Next.js Server Actions / Route Handlers — no separate backend.
- **RLS-enforced.** Public-facing pages use the anon key (read-only). Admin mutations use the cookie-aware server client and pass through `is_admin()` in Postgres.
- **Realtime orders.** The dashboard subscribes to `postgres_changes` on `orders` — new orders appear without a reload.
- **Static fallback.** If Supabase isn't configured (or is down), the public site falls back to the bundled static catalog so customers can still browse and place orders.
- **Cache invalidation.** Each admin save calls `revalidatePath` to bust the relevant ISR pages, so changes go live within seconds.
