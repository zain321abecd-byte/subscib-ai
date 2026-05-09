-- Run this AFTER schema.sql to add new columns introduced after the initial setup.
-- Idempotent: safe to run multiple times.

-- Multi-image gallery: array of Cloudinary URLs (excluding the cover image_url
-- which stays as the primary). Stored as jsonb so we can preserve order and
-- attach metadata later (e.g. alt text) without another migration.
alter table products
  add column if not exists gallery jsonb not null default '[]'::jsonb;

-- Whether the product appears in the "You may also like" section on other
-- product detail pages. Defaults to true so existing rows keep their behaviour.
alter table products
  add column if not exists show_in_related boolean not null default true;

-- Admin-curated list of related products to recommend in "You may also like"
-- on THIS product's detail page. Empty array → fall back to same-category
-- products that have show_in_related = true.
alter table products
  add column if not exists related_product_ids jsonb not null default '[]'::jsonb;

-- Two-tier package pricing. The existing `price` + `description` represent the
-- SHARED tier. These optional fields enable a second PRIVATE tier shown on the
-- product page side-by-side. If `private_price` is null, only the shared tier
-- is displayed.
alter table products
  add column if not exists private_price       numeric(10, 2);
alter table products
  add column if not exists private_description text;
alter table products
  add column if not exists shared_label        text default 'Shared';
alter table products
  add column if not exists private_label       text default 'Private';

-- Per-product feature bullets shown under the price (e.g.
-- "Activated within 30 minutes"). Empty array → fall back to the four built-in
-- defaults so older products keep their existing bullets.
alter table products
  add column if not exists features jsonb not null default '[]'::jsonb;

-- Traffic attribution captured when a customer first lands on the site, then
-- attached to whichever order they place.
alter table orders
  add column if not exists utm_source    text;
alter table orders
  add column if not exists utm_medium    text;
alter table orders
  add column if not exists utm_campaign  text;
alter table orders
  add column if not exists referrer      text;
alter table orders
  add column if not exists landing_page  text;
alter table orders
  add column if not exists package_tier  text;  -- "shared" | "private"

-- Link each order to the customer (Supabase Auth user) who placed it.
-- Anonymous orders left over from earlier remain (user_id stays null).
alter table orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_user_id_idx on orders(user_id);

-- Allow each customer to read their own orders (admins continue to see all
-- via the existing is_admin() policy).
drop policy if exists "orders read own" on orders;
create policy "orders read own" on orders
  for select using (auth.uid() = user_id);

-- ============================================================
-- Products: per-product icon-background color + display-source choice
-- (added 2026-05). Lets admins pick a custom color behind the brand icon
-- and explicitly choose whether image or brand renders as the main visual
-- when both are set.
-- ============================================================
alter table products
  add column if not exists icon_bg_color  text;
alter table products
  add column if not exists display_source text;  -- "image" | "brand"; null = auto (image > brand)

-- ============================================================
-- Reviews: optional customer photo. When set, replaces the initials
-- avatar on the homepage / product pages. URL is uploaded via
-- Cloudinary through the admin ImagePicker.
-- ============================================================
alter table reviews
  add column if not exists photo_url text;

-- ============================================================
-- Currency switch (2026-05): the canonical product price is now
-- stored in PKR (Rs) instead of USD. The display layer converts
-- to USD for non-PK visitors using the live FX rate.
--
-- One-shot conversion of existing rows (run ONCE — guarded by a
-- marker setting so re-running this file is safe).
-- ============================================================
do $$
declare
  already_run boolean;
begin
  select coalesce((select (value)::text = '"true"' from site_settings where key = 'prices_in_pkr'), false)
    into already_run;
  if not already_run then
    update products set price         = round(price * 280, 2)         where price is not null;
    update products set private_price = round(private_price * 280, 2) where private_price is not null;
    insert into site_settings (key, value)
      values ('prices_in_pkr', '"true"')
      on conflict (key) do update set value = excluded.value, updated_at = now();
  end if;
end $$;
