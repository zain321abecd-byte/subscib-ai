-- ============================================================================
-- 15 — Coupons / promo codes
-- Run in the Supabase SQL editor. Depends on is_admin() from schema.sql.
-- ============================================================================

create table if not exists coupons (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  -- percent: value is 1..100 (% off cart subtotal)
  -- fixed:   value is a PKR amount off the cart subtotal
  discount_type text not null default 'percent' check (discount_type in ('percent', 'fixed')),
  value         numeric not null check (value > 0),
  active        boolean not null default true,
  expires_at    timestamptz,          -- null = never expires
  max_uses      int,                  -- null = unlimited
  used_count    int not null default 0,
  note          text,                 -- admin-only memo
  created_at    timestamptz not null default now()
);

create index if not exists coupons_code_idx on coupons (lower(code));

alter table coupons enable row level security;

-- Shoppers may read active coupons (needed to validate a typed code);
-- admins see everything and manage rows.
drop policy if exists "coupons read active" on coupons;
drop policy if exists "coupons admin write" on coupons;
create policy "coupons read active" on coupons for select
  using (active = true or is_admin());
create policy "coupons admin write" on coupons for all
  using (is_admin()) with check (is_admin());

-- Atomic usage bump, callable by shoppers at order time. SECURITY DEFINER so
-- the anon role can increment without a broad update policy.
create or replace function redeem_coupon(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update coupons
     set used_count = used_count + 1
   where lower(code) = lower(p_code)
     and active = true;
$$;

grant execute on function redeem_coupon(text) to anon, authenticated;
