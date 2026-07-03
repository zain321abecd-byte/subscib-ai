-- ===========================================================================
-- 8-daily-sales.sql
-- Daily Sales / Renewals — separate from stock_items (which tracks OUR own
-- inventory expiry). This table tracks CUSTOMER subscriptions: when the
-- customer's plan expires, when to renew, when to nudge them by WhatsApp.
--
-- Access model:
--   • RLS on, is_admin() gates read/write (server actions use service role
--     which bypasses RLS anyway — RLS is defence in depth for the anon key).
--   • Portal permission keys sales:read / sales:write / sales:delete gate
--     the admin UI + server actions (see requireAdmin("sales:read")).
--   • Existing seeded Admins group is granted all three so today's admins
--     can immediately use the feature; Managers get read/write (no delete).
-- ===========================================================================

create extension if not exists pgcrypto;

-- ── subscription_sales ─────────────────────────────────────────────────────
create table if not exists public.subscription_sales (
  id                     uuid primary key default gen_random_uuid(),
  customer_name          text not null,
  customer_email         text,
  customer_phone         text not null,
  -- product_id is 'text' because public.products.id is a text slug in this
  -- project — matches products.id type. If a product is deleted the FK is
  -- nulled but product_name (snapshot below) survives.
  product_id             text references public.products(id) on delete set null,
  product_name           text not null,
  plan_name              text,
  sale_price             numeric(10, 2),
  currency               text not null default 'PKR',
  sale_date              date not null default current_date,
  expiry_date            date not null,
  renew_date             date not null,
  status                 text not null default 'active',
  payment_method         text,
  transaction_id         text,
  notes                  text,
  reminder_message       text,
  last_reminder_sent_at  timestamptz,
  renewed_at             timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint subscription_sales_status_chk
    check (status in ('active', 'renewal_due', 'renewed', 'expired', 'cancelled'))
);

-- Index the columns the admin UI filters + sorts by. Renew/expiry are the
-- hot paths (dashboard "renewals due today" + "expiring soon" cards).
create index if not exists subscription_sales_renew_date_idx      on public.subscription_sales (renew_date);
create index if not exists subscription_sales_expiry_date_idx     on public.subscription_sales (expiry_date);
create index if not exists subscription_sales_status_idx          on public.subscription_sales (status);
create index if not exists subscription_sales_customer_phone_idx  on public.subscription_sales (customer_phone);
create index if not exists subscription_sales_product_id_idx      on public.subscription_sales (product_id);

-- Auto-touch updated_at on any change.
create or replace function public.subscription_sales_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists subscription_sales_touch on public.subscription_sales;
create trigger subscription_sales_touch
  before update on public.subscription_sales
  for each row execute function public.subscription_sales_touch_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.subscription_sales enable row level security;

drop policy if exists "sales admin read"  on public.subscription_sales;
drop policy if exists "sales admin write" on public.subscription_sales;

-- Admins-only. Public/anon users have zero access.
create policy "sales admin read"  on public.subscription_sales for select using (is_admin());
create policy "sales admin write" on public.subscription_sales for all
  using (is_admin()) with check (is_admin());

comment on table public.subscription_sales is
  'Customer subscription sales — separate from stock_items (that is inventory expiry). Tracks renewal dates + WhatsApp reminders.';

-- ── Portal permission keys ────────────────────────────────────────────────
-- Grant the new sales:* keys to the seeded Admins / Managers groups so the
-- feature is immediately usable by everyone who already had back-office
-- access. Editors intentionally don't get sales access.
update public.portal_groups
   set permissions = (
     select jsonb_agg(distinct k)
       from jsonb_array_elements_text(
         permissions || '["sales:read","sales:write","sales:delete"]'::jsonb
       ) as k
   )
 where name = 'Admins';

update public.portal_groups
   set permissions = (
     select jsonb_agg(distinct k)
       from jsonb_array_elements_text(
         permissions || '["sales:read","sales:write"]'::jsonb
       ) as k
   )
 where name = 'Managers';
