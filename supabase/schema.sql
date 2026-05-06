-- SubscribAI database schema
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query)

-- ============================================================
-- 1. PRODUCTS
-- ============================================================
create table if not exists products (
  id            text primary key,                -- slug-like id, e.g. "chatgpt-plus"
  name          text not null,
  description   text,
  price         numeric(10, 2) not null,
  category      text not null,
  brand         text,
  tag           text,                            -- "Best Seller", "New", etc.
  icon_class    text,                            -- legacy fontawesome class
  media_class   text,                            -- legacy media class
  image_url     text,                            -- Cloudinary URL (preferred)
  icon_bg_color text,                            -- hex color for the brand-icon tile background
  display_source text,                           -- "image" | "brand"; null = auto (image > brand)
  in_stock      boolean not null default true,
  featured      boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists products_category_idx on products(category);
create index if not exists products_featured_idx on products(featured);

-- ============================================================
-- 2. BLOG POSTS
-- ============================================================
create table if not exists blog_posts (
  slug             text primary key,
  title            text not null,
  excerpt          text not null,
  body             text not null,
  date             date not null,
  read_mins        int not null,
  tag              text not null,                -- "Guide" | "Compare" | "Automation" | "News"
  author           text not null,
  author_initials  text not null,
  author_color     text not null,
  cover_url        text,
  featured         boolean not null default false,
  published        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists blog_posts_published_idx on blog_posts(published, date desc);

-- ============================================================
-- 3. ORDERS
-- ============================================================
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text unique not null,         -- short human-readable code
  customer_email   text not null,
  customer_phone   text,
  customer_name    text,
  items            jsonb not null,               -- [{id, name, qty, price}]
  subtotal_usd     numeric(10, 2) not null,
  subtotal_pkr     numeric(12, 2),
  status           text not null default 'pending',
                   -- pending | paid | delivered | failed | refunded | cancelled
  payment_method   text,                         -- jazzcash | easypaisa | card | whatsapp
  transaction_id   text,
  notes            text,                         -- admin internal notes
  delivered_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_status_idx on orders(status);
create index if not exists orders_created_idx on orders(created_at desc);
create index if not exists orders_email_idx on orders(customer_email);

-- ============================================================
-- 4. REVIEWS
-- ============================================================
create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  initials     text not null,
  color        text,                             -- CSS var or hex
  rating       int not null check (rating between 1 and 5),
  text         text not null,
  product_id   text references products(id) on delete set null,
  product_name text,                             -- denormalized for display when product deleted
  approved     boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists reviews_product_idx on reviews(product_id);

-- ============================================================
-- 5. FREEBIES
-- ============================================================
create table if not exists freebies (
  id           text primary key,
  title        text not null,
  description  text not null,
  icon_class   text,
  file_url     text,                             -- Cloudinary or external download
  whatsapp_msg text,                             -- pre-filled WhatsApp message
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

-- Seed common settings
insert into site_settings (key, value) values
  ('whatsapp_number',  '"15550132026"'),
  ('contact_email',    '"contact@subscribai.com"'),
  ('hero_headline',    '"Premium AI subscriptions, paid in PKR"'),
  ('hero_subtext',     '"Activated to your inbox in under 30 minutes."'),
  ('social_instagram', '""'),
  ('social_facebook',  '""'),
  ('social_tiktok',    '""'),
  ('social_youtube',   '""')
on conflict (key) do nothing;

-- ============================================================
-- 7. ADMINS (role gate)
-- ============================================================
create table if not exists admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null default 'admin',  -- 'admin' | 'superadmin'
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

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at before update on orders
  for each row execute function set_updated_at();

drop trigger if exists trg_site_settings_updated_at on site_settings;
create trigger trg_site_settings_updated_at before update on site_settings
  for each row execute function set_updated_at();

-- ============================================================
-- 9. ROW-LEVEL SECURITY
-- ============================================================
-- Public can READ products, blog_posts (published), reviews (approved), freebies (active),
-- and a whitelist of site_settings. Everything else is admin-only.

alter table products       enable row level security;
alter table blog_posts     enable row level security;
alter table orders         enable row level security;
alter table reviews        enable row level security;
alter table freebies       enable row level security;
alter table site_settings  enable row level security;
alter table admins         enable row level security;

-- Helper: is the calling user an admin?
create or replace function is_admin()
returns boolean as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$ language sql stable security definer;

-- ----- products -----
drop policy if exists "products read public"  on products;
drop policy if exists "products admin write"  on products;
create policy "products read public" on products for select using (true);
create policy "products admin write" on products for all
  using (is_admin()) with check (is_admin());

-- ----- blog_posts -----
drop policy if exists "blog read published"   on blog_posts;
drop policy if exists "blog admin write"      on blog_posts;
create policy "blog read published" on blog_posts for select
  using (published = true or is_admin());
create policy "blog admin write" on blog_posts for all
  using (is_admin()) with check (is_admin());

-- ----- orders (admin-only; clients post orders via service-role server action) -----
drop policy if exists "orders admin read"  on orders;
drop policy if exists "orders admin write" on orders;
create policy "orders admin read"  on orders for select using (is_admin());
create policy "orders admin write" on orders for all
  using (is_admin()) with check (is_admin());

-- ----- reviews -----
drop policy if exists "reviews read approved" on reviews;
drop policy if exists "reviews admin write"   on reviews;
create policy "reviews read approved" on reviews for select
  using (approved = true or is_admin());
create policy "reviews admin write" on reviews for all
  using (is_admin()) with check (is_admin());

-- ----- freebies -----
drop policy if exists "freebies read active" on freebies;
drop policy if exists "freebies admin write" on freebies;
create policy "freebies read active" on freebies for select
  using (active = true or is_admin());
create policy "freebies admin write" on freebies for all
  using (is_admin()) with check (is_admin());

-- ----- site_settings (read all; admin write) -----
drop policy if exists "settings read public" on site_settings;
drop policy if exists "settings admin write" on site_settings;
create policy "settings read public" on site_settings for select using (true);
create policy "settings admin write" on site_settings for all
  using (is_admin()) with check (is_admin());

-- ----- admins (admin-only read; insert via SQL editor only) -----
drop policy if exists "admins read self" on admins;
create policy "admins read self" on admins for select using (auth.uid() = user_id or is_admin());

-- ============================================================
-- 10. REALTIME
-- ============================================================
-- Add tables to the realtime publication so the admin panel can subscribe.
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table products;
