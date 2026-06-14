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

-- Three-step variation selector. Stores:
-- {
--   "plans": [{"id":"essential","label":"Essential"}],
--   "durations": [{"id":"1-month","label":"1 Month"}],
--   "prices": [{"planId":"essential","accountType":"private","durationId":"1-month","price":2499}]
-- }
-- Account type is fixed in the app as "private" | "shared".
alter table products
  add column if not exists variation_config jsonb;

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

-- ============================================================
-- Blog SEO system (2026-05): richer admin fields, schema data,
-- author/category/tag models, scheduling, and slug redirects.
-- ============================================================
alter table blog_posts add column if not exists id uuid unique default gen_random_uuid();
alter table blog_posts add column if not exists author_id uuid;
alter table blog_posts add column if not exists author_bio text;
alter table blog_posts add column if not exists author_image text;
alter table blog_posts add column if not exists author_social_links jsonb not null default '{}'::jsonb;
alter table blog_posts add column if not exists category_id uuid;
alter table blog_posts add column if not exists category_name text;
alter table blog_posts add column if not exists tags text[] not null default '{}'::text[];
alter table blog_posts add column if not exists featured_image_alt text;
alter table blog_posts add column if not exists status text not null default 'Published';
alter table blog_posts add column if not exists scheduled_at timestamptz;
alter table blog_posts add column if not exists meta_title text;
alter table blog_posts add column if not exists meta_description text;
alter table blog_posts add column if not exists focus_keyword text;
alter table blog_posts add column if not exists secondary_keywords text[] not null default '{}'::text[];
alter table blog_posts add column if not exists canonical_url text;
alter table blog_posts add column if not exists robots_index boolean not null default true;
alter table blog_posts add column if not exists robots_follow boolean not null default true;
alter table blog_posts add column if not exists og_title text;
alter table blog_posts add column if not exists og_description text;
alter table blog_posts add column if not exists og_image text;
alter table blog_posts add column if not exists twitter_title text;
alter table blog_posts add column if not exists twitter_description text;
alter table blog_posts add column if not exists twitter_image text;
alter table blog_posts add column if not exists schema_type text not null default 'BlogPosting';
alter table blog_posts add column if not exists faq_items jsonb not null default '[]'::jsonb;
alter table blog_posts add column if not exists related_post_ids text[] not null default '{}'::text[];

update blog_posts
set
  category_name = coalesce(category_name, case tag
    when 'Automation' then 'Automation'
    when 'Compare' then 'Subscriptions'
    when 'News' then 'Growth'
    else 'AI Guides'
  end),
  featured_image_alt = coalesce(featured_image_alt, title),
  meta_title = coalesce(meta_title, title),
  meta_description = coalesce(meta_description, excerpt),
  og_title = coalesce(og_title, title),
  og_description = coalesce(og_description, excerpt),
  og_image = coalesce(og_image, cover_url),
  twitter_title = coalesce(twitter_title, title),
  twitter_description = coalesce(twitter_description, excerpt),
  twitter_image = coalesce(twitter_image, cover_url),
  status = case when published then 'Published' else 'Draft' end
where true;

create index if not exists blog_posts_status_idx on blog_posts(status, scheduled_at);
create index if not exists blog_posts_featured_idx on blog_posts(featured, date desc);
create index if not exists blog_posts_tags_idx on blog_posts using gin(tags);

create table if not exists blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  meta_title text,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists blog_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists blog_authors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text,
  image text,
  social_links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists redirects (
  id uuid primary key default gen_random_uuid(),
  old_slug text unique not null,
  new_slug text not null,
  status_code int not null default 301,
  created_at timestamptz not null default now()
);

alter table blog_categories enable row level security;
alter table blog_tags enable row level security;
alter table blog_authors enable row level security;
alter table redirects enable row level security;

drop policy if exists "blog categories read public" on blog_categories;
drop policy if exists "blog categories admin write" on blog_categories;
create policy "blog categories read public" on blog_categories for select using (true);
create policy "blog categories admin write" on blog_categories for all using (is_admin()) with check (is_admin());

drop policy if exists "blog tags read public" on blog_tags;
drop policy if exists "blog tags admin write" on blog_tags;
create policy "blog tags read public" on blog_tags for select using (true);
create policy "blog tags admin write" on blog_tags for all using (is_admin()) with check (is_admin());

drop policy if exists "blog authors read public" on blog_authors;
drop policy if exists "blog authors admin write" on blog_authors;
create policy "blog authors read public" on blog_authors for select using (true);
create policy "blog authors admin write" on blog_authors for all using (is_admin()) with check (is_admin());

drop policy if exists "redirects read public" on redirects;
drop policy if exists "redirects admin write" on redirects;
create policy "redirects read public" on redirects for select using (true);
create policy "redirects admin write" on redirects for all using (is_admin()) with check (is_admin());

-- ============================================================
-- Stock Expiry Management (2026-06): admin inventory reminders.
-- ============================================================
create table if not exists stock_items (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  category text,
  quantity numeric(12, 2) not null check (quantity > 0),
  unit text,
  expiry_date date not null,
  reminder_days_before_expiry int not null default 7 check (reminder_days_before_expiry >= 0),
  contact_email text not null,
  supplier_name text,
  status text not null default 'active' check (status in ('active', 'expiringSoon', 'expired', 'renewed')),
  notes text,
  last_reminder_sent_at timestamptz,
  last_expired_reminder_sent_at timestamptz,
  renewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stock_items_expiry_date_idx on stock_items(expiry_date);
create index if not exists stock_items_status_idx on stock_items(status);
create index if not exists stock_items_supplier_idx on stock_items(supplier_name);

drop trigger if exists trg_stock_items_updated_at on stock_items;
create trigger trg_stock_items_updated_at before update on stock_items
  for each row execute function set_updated_at();

alter table stock_items enable row level security;

drop policy if exists "stock items admin read" on stock_items;
drop policy if exists "stock items admin write" on stock_items;
create policy "stock items admin read" on stock_items for select using (is_admin());
create policy "stock items admin write" on stock_items for all using (is_admin()) with check (is_admin());
