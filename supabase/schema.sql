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
  show_on_homepage boolean not null default false,
  sort_order    int not null default 0,
  variation_config jsonb,                       -- 3-step variation selector config
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists products_category_idx on products(category);
create index if not exists products_featured_idx on products(featured);

-- ============================================================
-- 2. BLOG POSTS
-- ============================================================
create table if not exists blog_posts (
  id               uuid unique default gen_random_uuid(),
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

create index if not exists blog_posts_published_idx on blog_posts(published, date desc);
create index if not exists blog_posts_status_idx on blog_posts(status, scheduled_at);
create index if not exists blog_posts_featured_idx on blog_posts(featured, date desc);
create index if not exists blog_posts_tags_idx on blog_posts using gin(tags);

create table if not exists blog_categories (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text unique not null,
  description      text,
  meta_title       text,
  meta_description text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists blog_tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists blog_authors (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  bio          text,
  image        text,
  social_links jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists redirects (
  id          uuid primary key default gen_random_uuid(),
  old_slug    text unique not null,
  new_slug    text not null,
  status_code int not null default 301,
  created_at  timestamptz not null default now()
);

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
  fulfillment_status text not null default 'pending'
                   check (fulfillment_status in ('pending', 'in_progress', 'activated', 'rejected', 'expired')),
  payment_method   text,                         -- jazzcash | easypaisa | card | whatsapp
  transaction_id   text,
  notes            text,                         -- admin internal notes
  delivered_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_status_idx on orders(status);
create index if not exists orders_fulfillment_status_idx on orders(fulfillment_status);
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
-- 3D. CONTACT MESSAGES
-- ============================================================
create table if not exists contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  message    text not null,
  status     text not null default 'unread'
             check (status in ('unread', 'read', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_messages_status_idx on contact_messages(status);
create index if not exists contact_messages_created_at_idx on contact_messages(created_at desc);
create index if not exists contact_messages_email_idx on contact_messages(email);

-- ============================================================
-- 3E. PRICING PLANS
-- ============================================================
create table if not exists pricing_plans (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique not null,
  description   text not null default '',
  monthly_price numeric(12, 2) not null default 0 check (monthly_price >= 0),
  yearly_price  numeric(12, 2) not null default 0 check (yearly_price >= 0),
  currency      text not null default 'PKR',
  features      text[] not null default '{}'::text[],
  badge_text    text,
  button_text   text,
  is_popular    boolean not null default false,
  is_active     boolean not null default true,
  price_type    text not null default 'fixed' check (price_type in ('fixed', 'custom')),
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table pricing_plans add column if not exists button_text text;

create index if not exists pricing_plans_active_sort_idx on pricing_plans(is_active, sort_order);
create index if not exists pricing_plans_slug_idx on pricing_plans(slug);

insert into pricing_plans (name, slug, description, monthly_price, yearly_price, currency, features, badge_text, button_text, is_popular, is_active, price_type, sort_order)
values
  ('Creator', 'creator', 'Solo creators & freelancers', 8055, 72495, 'PKR',
   array['2 AI subscriptions of your choice', 'Prompt vault (200+ curated prompts)', 'Weekly drops & tips', 'Email support'],
   null, 'Choose Creator', false, true, 'fixed', 10),
  ('Growth', 'growth', 'Teams scaling content & ops', 16387, 147483, 'PKR',
   array['4 AI subscriptions of your choice', 'All automation packs included', 'Prompt vault + workflow library', 'WhatsApp priority support'],
   'Most Popular', 'Choose Growth', true, true, 'fixed', 20),
  ('Business', 'business', 'Agencies & established teams', 0, 0, 'PKR',
   array['Unlimited AI subscriptions', 'Custom automation builds', 'Dedicated account manager', 'Onboarding & training'],
   null, 'Custom Pricing', false, true, 'custom', 30)
on conflict (slug) do nothing;

update pricing_plans set button_text = coalesce(button_text, 'Choose Creator') where slug = 'creator';
update pricing_plans set button_text = coalesce(button_text, 'Choose Growth') where slug = 'growth';
update pricing_plans set button_text = coalesce(button_text, 'Custom Pricing') where slug = 'business';

-- ============================================================
-- 3F. BUSINESS BUNDLE INQUIRIES
-- ============================================================
create table if not exists business_bundle_inquiries (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text not null,
  whatsapp       text not null,
  company_name   text not null,
  team_size      text not null,
  required_tools text not null,
  message        text not null,
  status         text not null default 'new'
                 check (status in ('new', 'contacted', 'resolved', 'rejected')),
  admin_note     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists business_bundle_inquiries_status_idx on business_bundle_inquiries(status);
create index if not exists business_bundle_inquiries_created_at_idx on business_bundle_inquiries(created_at desc);
create index if not exists business_bundle_inquiries_email_idx on business_bundle_inquiries(email);

-- ============================================================
-- 3G. CUSTOM PRICING REQUESTS
-- ============================================================
create table if not exists custom_pricing_requests (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null,
  email          text not null,
  whatsapp       text not null,
  company_name   text,
  team_size      text,
  required_tools text not null,
  billing_cycle  text not null default 'monthly'
                 check (billing_cycle in ('monthly', 'yearly')),
  budget         text,
  message        text not null,
  status         text not null default 'new'
                 check (status in ('new', 'contacted', 'in_progress', 'converted', 'rejected')),
  admin_note     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists custom_pricing_requests_status_idx on custom_pricing_requests(status);
create index if not exists custom_pricing_requests_created_at_idx on custom_pricing_requests(created_at desc);
create index if not exists custom_pricing_requests_email_idx on custom_pricing_requests(email);

-- ============================================================
-- 4. REVIEWS
-- ============================================================
create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  initials     text not null,
  color        text,                             -- CSS var or hex
  photo_url    text,                             -- optional Cloudinary URL; replaces initials avatar when set
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

drop trigger if exists trg_contact_messages_updated_at on contact_messages;
create trigger trg_contact_messages_updated_at before update on contact_messages
  for each row execute function set_updated_at();

drop trigger if exists trg_pricing_plans_updated_at on pricing_plans;
create trigger trg_pricing_plans_updated_at before update on pricing_plans
  for each row execute function set_updated_at();

drop trigger if exists trg_business_bundle_inquiries_updated_at on business_bundle_inquiries;
create trigger trg_business_bundle_inquiries_updated_at before update on business_bundle_inquiries
  for each row execute function set_updated_at();

drop trigger if exists trg_custom_pricing_requests_updated_at on custom_pricing_requests;
create trigger trg_custom_pricing_requests_updated_at before update on custom_pricing_requests
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
alter table blog_categories enable row level security;
alter table blog_tags      enable row level security;
alter table blog_authors   enable row level security;
alter table redirects      enable row level security;
alter table orders         enable row level security;
alter table traffic_sessions enable row level security;
alter table stock_items    enable row level security;
alter table contact_messages enable row level security;
alter table pricing_plans  enable row level security;
alter table business_bundle_inquiries enable row level security;
alter table custom_pricing_requests enable row level security;
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

drop policy if exists "blog categories read public" on blog_categories;
drop policy if exists "blog categories admin write" on blog_categories;
create policy "blog categories read public" on blog_categories for select using (true);
create policy "blog categories admin write" on blog_categories for all
  using (is_admin()) with check (is_admin());

drop policy if exists "blog tags read public" on blog_tags;
drop policy if exists "blog tags admin write" on blog_tags;
create policy "blog tags read public" on blog_tags for select using (true);
create policy "blog tags admin write" on blog_tags for all
  using (is_admin()) with check (is_admin());

drop policy if exists "blog authors read public" on blog_authors;
drop policy if exists "blog authors admin write" on blog_authors;
create policy "blog authors read public" on blog_authors for select using (true);
create policy "blog authors admin write" on blog_authors for all
  using (is_admin()) with check (is_admin());

drop policy if exists "redirects read public" on redirects;
drop policy if exists "redirects admin write" on redirects;
create policy "redirects read public" on redirects for select using (true);
create policy "redirects admin write" on redirects for all
  using (is_admin()) with check (is_admin());

-- ----- orders (admin-only; clients post orders via service-role server action) -----
drop policy if exists "orders admin read"  on orders;
drop policy if exists "orders admin write" on orders;
create policy "orders admin read"  on orders for select using (is_admin());
create policy "orders admin write" on orders for all
  using (is_admin()) with check (is_admin());

-- ----- traffic_sessions (written by server route; admin-only read) -----
drop policy if exists "traffic sessions admin read" on traffic_sessions;
create policy "traffic sessions admin read" on traffic_sessions for select using (is_admin());

-- ----- stock_items (admin-only) -----
drop policy if exists "stock items admin read" on stock_items;
drop policy if exists "stock items admin write" on stock_items;
create policy "stock items admin read" on stock_items for select using (is_admin());
create policy "stock items admin write" on stock_items for all
  using (is_admin()) with check (is_admin());

-- ----- contact_messages (server route inserts; admin-only read/update) -----
drop policy if exists "contact messages admin read" on contact_messages;
drop policy if exists "contact messages admin write" on contact_messages;
create policy "contact messages admin read" on contact_messages for select using (is_admin());
create policy "contact messages admin write" on contact_messages for all
  using (is_admin()) with check (is_admin());

-- ----- pricing_plans (public read active; admin write) -----
drop policy if exists "pricing plans read active" on pricing_plans;
drop policy if exists "pricing plans admin write" on pricing_plans;
create policy "pricing plans read active" on pricing_plans for select using (is_active = true or is_admin());
create policy "pricing plans admin write" on pricing_plans for all
  using (is_admin()) with check (is_admin());

-- ----- business_bundle_inquiries (server route inserts; admin-only read/update) -----
drop policy if exists "business bundle inquiries admin read" on business_bundle_inquiries;
drop policy if exists "business bundle inquiries admin write" on business_bundle_inquiries;
create policy "business bundle inquiries admin read" on business_bundle_inquiries for select using (is_admin());
create policy "business bundle inquiries admin write" on business_bundle_inquiries for all
  using (is_admin()) with check (is_admin());

-- ----- custom_pricing_requests (server route inserts; admin-only read/update) -----
drop policy if exists "custom pricing requests admin read" on custom_pricing_requests;
drop policy if exists "custom pricing requests admin write" on custom_pricing_requests;
create policy "custom pricing requests admin read" on custom_pricing_requests for select using (is_admin());
create policy "custom pricing requests admin write" on custom_pricing_requests for all
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
