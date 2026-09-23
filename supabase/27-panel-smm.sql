-- ===========================================================================
-- 27-panel-smm.sql
-- SMM Panel — runs inside the EXISTING subscribai Supabase project.
--
-- This replaces the two standalone files in panel/supabase/. Those were
-- written for a separate project and a separate Supabase Auth user base; this
-- version lives alongside the shop instead.
--
-- Three things differ from the standalone version, all deliberate:
--
--  1. Every table is prefixed `panel_`. The shop already owns `orders` and
--     `users`, so unprefixed names would collide. Prefixing everything (not
--     just the two that clash) means a future shop table can never collide
--     either.
--
--  2. Identity is public.users — the same account a customer signs into the
--     shop with. There is no Supabase Auth user here, so nothing hangs off
--     auth.users and no signup trigger exists. A panel profile is created
--     lazily by the app the first time someone opens /panel.
--
--  3. RLS is enabled with NO policies. Because panel identity is a JWT from
--     our own API rather than a Supabase session, auth.uid() is always null
--     here and a policy keyed on it could only ever deny. Enabling RLS with
--     no policies makes that explicit and total: the anon and authenticated
--     keys cannot read or write these tables at all. Every panel query runs
--     server-side through the service-role client with an explicit user_id
--     filter — the same pattern the /admin portal already uses.
--
-- Safe to re-run. Nothing here alters, drops or reads an existing shop table
-- except to reference public.users(id).
-- ===========================================================================

create extension if not exists pgcrypto;

-- ── profiles ──────────────────────────────────────────────────────────────
-- One row per shop customer who has used the panel. user_id IS the shop
-- account id, so there is no second identity to keep in sync — and no second
-- password to forget.
create table if not exists public.panel_profiles (
  user_id     uuid primary key references public.users(id) on delete cascade,
  -- 'user' places orders; 'admin' runs the panel. Separate from public.users.role
  -- on purpose: running the shop and running the panel are different jobs.
  role        text not null default 'user',
  status      text not null default 'active',
  api_key     text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint panel_profiles_role_chk   check (role in ('user', 'admin')),
  constraint panel_profiles_status_chk check (status in ('active', 'suspended'))
);

create index if not exists panel_profiles_role_idx   on public.panel_profiles (role);
create index if not exists panel_profiles_status_idx on public.panel_profiles (status);

-- ── wallets ───────────────────────────────────────────────────────────────
-- Balance is never written directly by application code: it moves only
-- through panel_wallet_transactions and the trigger below, so the ledger and
-- the balance cannot disagree.
create table if not exists public.panel_wallets (
  user_id    uuid primary key references public.panel_profiles(user_id) on delete cascade,
  balance    numeric(14, 2) not null default 0,
  currency   text not null default 'PKR',
  updated_at timestamptz not null default now(),

  constraint panel_wallets_balance_chk check (balance >= 0)
);

-- ── wallet ledger ─────────────────────────────────────────────────────────
create table if not exists public.panel_wallet_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.panel_profiles(user_id) on delete cascade,
  -- credit: top-up or refund. debit: an order.
  type          text not null,
  amount        numeric(14, 2) not null,
  -- Balance after this row was applied — makes any statement reconstructable
  -- without replaying the whole ledger.
  balance_after numeric(14, 2) not null default 0,
  reference     text,
  note          text,
  created_by    uuid references public.panel_profiles(user_id) on delete set null,
  created_at    timestamptz not null default now(),

  constraint panel_wallet_tx_type_chk   check (type in ('credit', 'debit')),
  constraint panel_wallet_tx_amount_chk check (amount > 0)
);

create index if not exists panel_wallet_tx_user_idx    on public.panel_wallet_transactions (user_id, created_at desc);
create index if not exists panel_wallet_tx_created_idx on public.panel_wallet_transactions (created_at desc);

-- ── activity log ──────────────────────────────────────────────────────────
create table if not exists public.panel_activity_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.panel_profiles(user_id) on delete set null,
  action     text not null,
  meta       jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists panel_activity_user_idx    on public.panel_activity_logs (user_id, created_at desc);
create index if not exists panel_activity_created_idx on public.panel_activity_logs (created_at desc);

-- ── settings ──────────────────────────────────────────────────────────────
create table if not exists public.panel_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.panel_settings (key, value)
values
  ('branding', '{"name":"SubscribAI Panel","currency":"PKR"}'::jsonb),
  ('signups',  '{"enabled":true}'::jsonb)
on conflict (key) do nothing;

-- ── providers ─────────────────────────────────────────────────────────────
-- Upstream SMM APIs. Nearly all speak the same dialect: POST with
-- key + action=services|add|status|balance.
create table if not exists public.panel_providers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  api_url        text not null,
  -- Held server-side only; never selected into a client component.
  api_key        text not null,
  balance        numeric(14, 2),
  currency       text not null default 'USD',
  active         boolean not null default true,
  last_synced_at timestamptz,
  last_error     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── catalog ───────────────────────────────────────────────────────────────
create table if not exists public.panel_service_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  platform   text not null default 'other',
  sort_order int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),

  constraint panel_categories_platform_chk check (platform in
    ('instagram','tiktok','youtube','facebook','twitter','telegram','spotify','other'))
);

create index if not exists panel_categories_sort_idx on public.panel_service_categories (sort_order, name);

create table if not exists public.panel_services (
  id                  uuid primary key default gen_random_uuid(),
  category_id         uuid references public.panel_service_categories(id) on delete set null,
  name                text not null,
  description         text,
  -- What the customer pays per 1000 units.
  rate_per_1000       numeric(12, 2) not null default 0,
  min_quantity        int not null default 10,
  max_quantity        int not null default 100000,
  speed               text,
  active              boolean not null default true,
  sort_order          int not null default 0,

  -- Where the order actually goes. Null = fulfilled by hand.
  provider_id         uuid references public.panel_providers(id) on delete set null,
  provider_service_id text,
  -- What the provider charges us per 1000, for the margin figure in reports.
  provider_rate       numeric(12, 2),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint panel_services_rate_chk     check (rate_per_1000 >= 0),
  constraint panel_services_quantity_chk check (min_quantity > 0 and max_quantity >= min_quantity)
);

create index if not exists panel_services_category_idx on public.panel_services (category_id, sort_order);
create index if not exists panel_services_active_idx   on public.panel_services (active);

-- ── orders ────────────────────────────────────────────────────────────────
create table if not exists public.panel_orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.panel_profiles(user_id) on delete cascade,
  service_id        uuid references public.panel_services(id) on delete set null,
  -- Snapshot: the catalog may change, an order's history must not.
  service_name      text not null,
  rate_per_1000     numeric(12, 2) not null default 0,

  link              text not null,
  quantity          int not null,
  charge            numeric(14, 2) not null,

  status            text not null default 'pending',
  start_count       int,
  remains           int,

  provider_id       uuid references public.panel_providers(id) on delete set null,
  provider_order_id text,
  provider_status   text,

  note              text,
  -- Set when a failed or cancelled order has been paid back, so a double
  -- refund is impossible.
  refunded_at       timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint panel_orders_status_chk   check (status in ('pending','processing','in_progress','completed','partial','cancelled','failed')),
  constraint panel_orders_quantity_chk check (quantity > 0),
  constraint panel_orders_charge_chk   check (charge >= 0)
);

create index if not exists panel_orders_user_idx    on public.panel_orders (user_id, created_at desc);
create index if not exists panel_orders_status_idx  on public.panel_orders (status, created_at desc);
create index if not exists panel_orders_created_idx on public.panel_orders (created_at desc);

create table if not exists public.panel_order_status_history (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.panel_orders(id) on delete cascade,
  status     text not null,
  note       text,
  changed_by uuid references public.panel_profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists panel_order_history_order_idx on public.panel_order_status_history (order_id, created_at desc);

-- ── top-up requests ───────────────────────────────────────────────────────
-- A customer says "I paid"; an admin approves, and approval is what credits
-- the wallet. No payment gateway is trusted to move money on its own here.
create table if not exists public.panel_payment_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.panel_profiles(user_id) on delete cascade,
  amount         numeric(14, 2) not null,
  method         text not null default 'bank',
  reference      text,
  note           text,
  status         text not null default 'pending',
  admin_note     text,
  reviewed_by    uuid references public.panel_profiles(user_id) on delete set null,
  reviewed_at    timestamptz,
  -- Links to the ledger row created on approval.
  transaction_id uuid references public.panel_wallet_transactions(id) on delete set null,
  created_at     timestamptz not null default now(),

  constraint panel_payments_status_chk check (status in ('pending','approved','rejected')),
  constraint panel_payments_amount_chk check (amount > 0)
);

create index if not exists panel_payments_user_idx   on public.panel_payment_requests (user_id, created_at desc);
create index if not exists panel_payments_status_idx on public.panel_payment_requests (status, created_at desc);

-- ── support ───────────────────────────────────────────────────────────────
create table if not exists public.panel_tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.panel_profiles(user_id) on delete cascade,
  subject    text not null,
  status     text not null default 'open',
  order_id   uuid references public.panel_orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint panel_tickets_status_chk check (status in ('open','answered','closed'))
);

create table if not exists public.panel_ticket_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.panel_tickets(id) on delete cascade,
  author_id  uuid references public.panel_profiles(user_id) on delete set null,
  is_staff   boolean not null default false,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists panel_tickets_user_idx           on public.panel_tickets (user_id, updated_at desc);
create index if not exists panel_ticket_messages_ticket_idx on public.panel_ticket_messages (ticket_id, created_at);

-- ═══ Automation ═══════════════════════════════════════════════════════════

-- Own updated_at helper rather than reusing a shop one, so a later change to
-- shop triggers can never alter panel behaviour.
create or replace function public.panel_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists panel_profiles_touch on public.panel_profiles;
create trigger panel_profiles_touch before update on public.panel_profiles
  for each row execute function public.panel_touch_updated_at();

drop trigger if exists panel_providers_touch on public.panel_providers;
create trigger panel_providers_touch before update on public.panel_providers
  for each row execute function public.panel_touch_updated_at();

drop trigger if exists panel_services_touch on public.panel_services;
create trigger panel_services_touch before update on public.panel_services
  for each row execute function public.panel_touch_updated_at();

drop trigger if exists panel_orders_touch on public.panel_orders;
create trigger panel_orders_touch before update on public.panel_orders
  for each row execute function public.panel_touch_updated_at();

drop trigger if exists panel_tickets_touch on public.panel_tickets;
create trigger panel_tickets_touch before update on public.panel_tickets
  for each row execute function public.panel_touch_updated_at();

-- Balance follows the ledger. Every transaction applies itself to the wallet
-- and stamps the resulting balance on the row, inside one transaction.
create or replace function public.panel_apply_wallet_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_balance numeric(14, 2);
begin
  -- Lock the wallet row so two concurrent orders can't both read the same
  -- starting balance and overspend it.
  select balance into next_balance from public.panel_wallets where user_id = new.user_id for update;
  if not found then
    insert into public.panel_wallets (user_id) values (new.user_id);
    next_balance := 0;
  end if;

  if new.type = 'credit' then
    next_balance := next_balance + new.amount;
  else
    next_balance := next_balance - new.amount;
    if next_balance < 0 then
      raise exception 'Insufficient balance: % available, % requested', next_balance + new.amount, new.amount
        using errcode = 'check_violation';
    end if;
  end if;

  update public.panel_wallets
     set balance = next_balance, updated_at = now()
   where user_id = new.user_id;

  new.balance_after := next_balance;
  return new;
end $$;

drop trigger if exists panel_wallet_tx_apply on public.panel_wallet_transactions;
create trigger panel_wallet_tx_apply
  before insert on public.panel_wallet_transactions
  for each row execute function public.panel_apply_wallet_transaction();

-- Every status change writes history, without the app having to remember to.
create or replace function public.panel_record_order_status()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.panel_order_status_history (order_id, status) values (new.id, new.status);
  end if;
  return new;
end $$;

drop trigger if exists panel_orders_status_history on public.panel_orders;
create trigger panel_orders_status_history after insert or update on public.panel_orders
  for each row execute function public.panel_record_order_status();

-- ═══ Row level security ═══════════════════════════════════════════════════
-- Enabled everywhere, with no policies anywhere. See the header: panel
-- identity is our own API's JWT, so auth.uid() is null in every one of these
-- tables and any policy keyed on it would deny unconditionally. Rather than
-- write policies that only pretend to grant access, access is closed to the
-- anon and authenticated keys entirely and every read and write goes through
-- the service-role client on the server, which filters by user_id explicitly.
--
-- Practical consequence: never query a panel_* table from a browser client.
alter table public.panel_profiles            enable row level security;
alter table public.panel_wallets             enable row level security;
alter table public.panel_wallet_transactions enable row level security;
alter table public.panel_activity_logs       enable row level security;
alter table public.panel_settings            enable row level security;
alter table public.panel_providers           enable row level security;
alter table public.panel_service_categories  enable row level security;
alter table public.panel_services            enable row level security;
alter table public.panel_orders              enable row level security;
alter table public.panel_order_status_history enable row level security;
alter table public.panel_payment_requests    enable row level security;
alter table public.panel_tickets             enable row level security;
alter table public.panel_ticket_messages     enable row level security;

-- ═══ Starter catalog ══════════════════════════════════════════════════════
-- Enough to see the panel working before any provider is connected. Delete
-- freely; nothing depends on these rows.
insert into public.panel_service_categories (name, platform, sort_order)
select v.name, v.platform, v.sort_order
  from (values
    ('Instagram Followers', 'instagram', 10),
    ('Instagram Likes',     'instagram', 20),
    ('TikTok Views',        'tiktok',    30),
    ('YouTube Views',       'youtube',   40),
    ('Facebook Page Likes', 'facebook',  50),
    ('Telegram Members',    'telegram',  60)
  ) as v(name, platform, sort_order)
 where not exists (select 1 from public.panel_service_categories);

insert into public.panel_services (category_id, name, description, rate_per_1000, min_quantity, max_quantity, speed, sort_order)
select c.id,
       c.name || ' — standard',
       'Starter row so the catalog is not empty. Replace with your real service.',
       case c.platform when 'instagram' then 120 when 'tiktok' then 45 when 'youtube' then 250 else 90 end,
       50, 50000,
       '0-1 hour', 10
  from public.panel_service_categories c
 where not exists (select 1 from public.panel_services);

comment on table public.panel_profiles is 'Panel identity, keyed to the shop account in public.users. Created lazily on first /panel visit.';
comment on table public.panel_wallets is 'Current panel balance per user. Only panel_wallet_transactions may move it.';
comment on table public.panel_wallet_transactions is 'Money ledger. Inserting a row applies it to the wallet and stamps balance_after.';
comment on table public.panel_providers is 'Upstream SMM APIs. api_key is server-only and never selected into a client component.';
comment on table public.panel_orders is 'Panel orders. Charge and debit are computed server-side from the catalog, never from the browser.';

-- ═══ Making the first panel admin ═════════════════════════════════════════
-- Sign in to /panel once with your normal shop account (this creates the
-- profile row), then promote it:
--
--   update public.panel_profiles set role = 'admin'
--    where user_id = (select id from public.users where email = 'you@example.com');
