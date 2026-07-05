-- ============================================================
-- SubscribAI — COMPLETE database setup (idempotent)
-- ============================================================
-- Run this ONCE in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE / guards,
-- so it backfills any missing tables, columns, policies, and indexes.
--
-- This single file = schema.sql + 2-migrations.sql merged, with the realtime
-- step made re-run-safe.
-- ============================================================

-- ============================================================
-- 1. PRODUCTS
-- ============================================================
create table if not exists products (
  id            text primary key,
  name          text not null,
  description   text,
  price         numeric(10, 2) not null,
  category      text not null,
  brand         text,
  tag           text,
  icon_class    text,
  media_class   text,
  image_url     text,
  icon_bg_color text,
  display_source text,
  in_stock      boolean not null default true,
  featured      boolean not null default false,
  sort_order    int not null default 0,
  variation_config jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists products_category_idx on products(category);
create index if not exists products_featured_idx on products(featured);

-- ============================================================
-- 2. BLOG POSTS + taxonomy
-- ============================================================
create table if not exists blog_posts (
  id               uuid unique default gen_random_uuid(),
  slug             text primary key,
  title            text not null,
  excerpt          text not null,
  body             text not null,
  date             date not null,
  read_mins        int not null,
  tag              text not null,
  author           text not null,
  author_initials  text not null,
  author_color     text not null,
  author_id        uuid,
  author_bio       text,
  author_image     text,
  author_social_links jsonb not null default '{}'::jsonb,
  category_id      uuid,
  category_name    text,
  tags             text[] not null default '{}'::text[],
  cover_url        text,
  featured_image_alt text,
  featured         boolean not null default false,
  published        boolean not null default true,
  status           text not null default 'Published',
  scheduled_at     timestamptz,
  meta_title       text,
  meta_description text,
  focus_keyword    text,
  secondary_keywords text[] not null default '{}'::text[],
  canonical_url    text,
  robots_index     boolean not null default true,
  robots_follow    boolean not null default true,
  og_title         text,
  og_description   text,
  og_image         text,
  twitter_title    text,
  twitter_description text,
  twitter_image    text,
  schema_type      text not null default 'BlogPosting',
  faq_items        jsonb not null default '[]'::jsonb,
  related_post_ids text[] not null default '{}'::text[],
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Ensure pre-existing blog_posts tables have all newer columns BEFORE the
-- indexes below reference them (status, scheduled_at, tags). This is what
-- caused the "column status does not exist" error on older databases.
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

create index if not exists blog_posts_published_idx on blog_posts(published, date desc);
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

-- ============================================================
-- 3. ORDERS
-- ============================================================
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text unique not null,
  customer_email   text not null,
  customer_phone   text,
  customer_name    text,
  items            jsonb not null,
  subtotal_usd     numeric(10, 2),
  subtotal_pkr     numeric(12, 2),
  status           text not null default 'pending',
  payment_method   text,
  transaction_id   text,
  notes            text,
  delivered_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_status_idx on orders(status);
create index if not exists orders_created_idx on orders(created_at desc);
create index if not exists orders_email_idx on orders(customer_email);

-- ============================================================
-- 3B. TRAFFIC SESSIONS
-- ============================================================
create table if not exists traffic_sessions (
  session_id   text primary key,
  first_seen   timestamptz not null default now(),
  last_seen    timestamptz not null default now(),
  pageviews    int not null default 0,
  source       text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  referrer     text,
  landing_page text,
  last_page    text,
  user_id      uuid references auth.users(id) on delete set null,
  user_email   text,
  browser      text,
  os           text,
  device_type  text,
  platform     text,
  user_agent   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists traffic_sessions_last_seen_idx on traffic_sessions(last_seen desc);
create index if not exists traffic_sessions_first_seen_idx on traffic_sessions(first_seen desc);
create index if not exists traffic_sessions_source_idx on traffic_sessions(source);
create index if not exists traffic_sessions_user_email_idx on traffic_sessions(user_email);

-- ============================================================
-- 3C. STOCK EXPIRY MANAGEMENT
-- ============================================================
create table if not exists stock_items (
  id                          uuid primary key default gen_random_uuid(),
  item_name                   text not null,
  category                    text,
  quantity                    numeric(12, 2) not null check (quantity > 0),
  unit                        text,
  expiry_date                 date not null,
  reminder_days_before_expiry int not null default 7 check (reminder_days_before_expiry >= 0),
  contact_email               text not null,
  supplier_name               text,
  status                      text not null default 'active'
                              check (status in ('active', 'expiringSoon', 'expired', 'renewed')),
  notes                       text,
  last_reminder_sent_at       timestamptz,
  last_expired_reminder_sent_at timestamptz,
  renewed_at                  timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists stock_items_expiry_date_idx on stock_items(expiry_date);
create index if not exists stock_items_status_idx on stock_items(status);
create index if not exists stock_items_supplier_idx on stock_items(supplier_name);

-- ============================================================
-- 4. REVIEWS
-- ============================================================
create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  initials     text not null,
  color        text,
  photo_url    text,
  rating       int not null check (rating between 1 and 5),
  text         text not null,
  product_id   text references products(id) on delete set null,
  product_name text,
  approved     boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists reviews_product_idx on reviews(product_id);

-- ============================================================
-- 5. FREEBIES (legacy table; kept for compatibility)
-- ============================================================
create table if not exists freebies (
  id           text primary key,
  title        text not null,
  description  text not null,
  icon_class   text,
  file_url     text,
  whatsapp_msg text,
  sort_order   int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 6. SITE SETTINGS (key-value store)
-- ============================================================
create table if not exists site_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

insert into site_settings (key, value) values
  ('whatsapp_number',  '"15550132026"'),
  ('contact_email',    '"contact@subscribai.com"'),
  ('support_phone',    '""'),
  ('business_name',    '"SubscribAI"'),
  ('business_address', '""'),
  ('footer_text',      '""'),
  ('hero_headline',    '"Premium AI subscriptions, paid in your local currency."'),
  ('hero_subtext',     '"Activated to your inbox in under 30 minutes."'),
  ('social_instagram', '""'),
  ('social_facebook',  '""'),
  ('social_tiktok',    '""'),
  ('social_youtube',   '""'),
  ('meta_pixel_id',              '""'),
  ('facebook_pixel_id',          '""'),
  ('google_site_verification',   '""'),
  ('google_analytics_id',        '""'),
  ('google_tag_manager_id',      '""'),
  ('currency_display',           '"local"')
on conflict (key) do nothing;

-- ============================================================
-- 7. ADMINS (role gate)
-- ============================================================
create table if not exists admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null default 'admin',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 8. UPDATED_AT TRIGGERS
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();

drop trigger if exists trg_blog_posts_updated_at on blog_posts;
create trigger trg_blog_posts_updated_at before update on blog_posts
  for each row execute function set_updated_at();

drop trigger if exists trg_blog_categories_updated_at on blog_categories;
create trigger trg_blog_categories_updated_at before update on blog_categories
  for each row execute function set_updated_at();

drop trigger if exists trg_blog_authors_updated_at on blog_authors;
create trigger trg_blog_authors_updated_at before update on blog_authors
  for each row execute function set_updated_at();

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at before update on orders
  for each row execute function set_updated_at();

drop trigger if exists trg_stock_items_updated_at on stock_items;
create trigger trg_stock_items_updated_at before update on stock_items
  for each row execute function set_updated_at();

drop trigger if exists trg_site_settings_updated_at on site_settings;
create trigger trg_site_settings_updated_at before update on site_settings
  for each row execute function set_updated_at();

-- ============================================================
-- 9. ROW-LEVEL SECURITY
-- ============================================================
alter table products        enable row level security;
alter table blog_posts      enable row level security;
alter table blog_categories enable row level security;
alter table blog_tags       enable row level security;
alter table blog_authors    enable row level security;
alter table redirects       enable row level security;
alter table orders          enable row level security;
alter table traffic_sessions enable row level security;
alter table stock_items     enable row level security;
alter table reviews         enable row level security;
alter table freebies        enable row level security;
alter table site_settings   enable row level security;
alter table admins          enable row level security;

create or replace function is_admin()
returns boolean as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$ language sql stable security definer;

-- products
drop policy if exists "products read public"  on products;
drop policy if exists "products admin write"  on products;
create policy "products read public" on products for select using (true);
create policy "products admin write" on products for all using (is_admin()) with check (is_admin());

-- blog_posts
drop policy if exists "blog read published"   on blog_posts;
drop policy if exists "blog admin write"      on blog_posts;
create policy "blog read published" on blog_posts for select using (published = true or is_admin());
create policy "blog admin write" on blog_posts for all using (is_admin()) with check (is_admin());

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

-- orders (admins all; customers their own)
drop policy if exists "orders admin read"  on orders;
drop policy if exists "orders admin write" on orders;
create policy "orders admin read"  on orders for select using (is_admin());
create policy "orders admin write" on orders for all using (is_admin()) with check (is_admin());

-- traffic_sessions
drop policy if exists "traffic sessions admin read" on traffic_sessions;
create policy "traffic sessions admin read" on traffic_sessions for select using (is_admin());

-- stock_items
drop policy if exists "stock items admin read" on stock_items;
drop policy if exists "stock items admin write" on stock_items;
create policy "stock items admin read" on stock_items for select using (is_admin());
create policy "stock items admin write" on stock_items for all using (is_admin()) with check (is_admin());

-- reviews
drop policy if exists "reviews read approved" on reviews;
drop policy if exists "reviews admin write"   on reviews;
create policy "reviews read approved" on reviews for select using (approved = true or is_admin());
create policy "reviews admin write" on reviews for all using (is_admin()) with check (is_admin());

-- freebies
drop policy if exists "freebies read active" on freebies;
drop policy if exists "freebies admin write" on freebies;
create policy "freebies read active" on freebies for select using (active = true or is_admin());
create policy "freebies admin write" on freebies for all using (is_admin()) with check (is_admin());

-- site_settings
drop policy if exists "settings read public" on site_settings;
drop policy if exists "settings admin write" on site_settings;
create policy "settings read public" on site_settings for select using (true);
create policy "settings admin write" on site_settings for all using (is_admin()) with check (is_admin());

-- admins
drop policy if exists "admins read self" on admins;
create policy "admins read self" on admins for select using (auth.uid() = user_id or is_admin());

-- ============================================================
-- 10. REALTIME (re-run safe — ignores "already added")
-- ============================================================
do $$
begin
  begin
    alter publication supabase_realtime add table orders;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table products;
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================================
-- 11. LATER COLUMN ADDITIONS (from 2-migrations.sql)
-- ============================================================
-- products
alter table products add column if not exists gallery jsonb not null default '[]'::jsonb;
alter table products add column if not exists show_in_related boolean not null default true;
alter table products add column if not exists related_product_ids jsonb not null default '[]'::jsonb;
alter table products add column if not exists private_price       numeric(10, 2);
alter table products add column if not exists private_description text;
alter table products add column if not exists shared_label        text default 'Shared';
alter table products add column if not exists private_label       text default 'Private';
alter table products add column if not exists variation_config jsonb;
alter table products add column if not exists features jsonb not null default '[]'::jsonb;
alter table products add column if not exists icon_bg_color  text;
alter table products add column if not exists display_source text;

-- orders attribution + user link
alter table orders add column if not exists utm_source    text;
alter table orders add column if not exists utm_medium    text;
alter table orders add column if not exists utm_campaign  text;
alter table orders add column if not exists referrer      text;
alter table orders add column if not exists landing_page  text;
alter table orders add column if not exists package_tier  text;
alter table orders add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_user_id_idx on orders(user_id);

drop policy if exists "orders read own" on orders;
create policy "orders read own" on orders for select using (auth.uid() = user_id);

-- reviews photo
alter table reviews add column if not exists photo_url text;

-- (blog_posts columns are added earlier in this file, before their indexes.)

-- One-shot PKR price conversion (guarded — runs only once)
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

-- blog backfill of computed defaults
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

-- ============================================================
-- DONE. Next: add yourself as an admin (after you sign up once):
--
--   insert into admins (user_id, email)
--   select id, email from auth.users where email = 'YOUR-EMAIL@example.com'
--   on conflict (user_id) do nothing;
-- ============================================================
