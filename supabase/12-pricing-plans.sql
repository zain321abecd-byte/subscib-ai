-- Dynamic Pricing Plans
-- Run this in Supabase SQL Editor. Safe to run more than once.

create table if not exists public.pricing_plans (
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

alter table public.pricing_plans
  add column if not exists button_text text;

create index if not exists pricing_plans_active_sort_idx
  on public.pricing_plans(is_active, sort_order);

create index if not exists pricing_plans_slug_idx
  on public.pricing_plans(slug);

insert into public.pricing_plans (
  name, slug, description, monthly_price, yearly_price, currency,
  features, badge_text, button_text, is_popular, is_active, price_type, sort_order
)
values
  (
    'Creator',
    'creator',
    'Solo creators & freelancers',
    8055,
    72495,
    'PKR',
    array[
      '2 AI subscriptions of your choice',
      'Prompt vault (200+ curated prompts)',
      'Weekly drops & tips',
      'Email support'
    ],
    null,
    'Choose Creator',
    false,
    true,
    'fixed',
    10
  ),
  (
    'Growth',
    'growth',
    'Teams scaling content & ops',
    16387,
    147483,
    'PKR',
    array[
      '4 AI subscriptions of your choice',
      'All automation packs included',
      'Prompt vault + workflow library',
      'WhatsApp priority support'
    ],
    'Most Popular',
    'Choose Growth',
    true,
    true,
    'fixed',
    20
  ),
  (
    'Business',
    'business',
    'Agencies & established teams',
    0,
    0,
    'PKR',
    array[
      'Unlimited AI subscriptions',
      'Custom automation builds',
      'Dedicated account manager',
      'Onboarding & training'
    ],
    null,
    'Custom Pricing',
    false,
    true,
    'custom',
    30
  )
on conflict (slug) do nothing;

update public.pricing_plans
set button_text = coalesce(button_text, 'Choose Creator')
where slug = 'creator';

update public.pricing_plans
set button_text = coalesce(button_text, 'Choose Growth')
where slug = 'growth';

update public.pricing_plans
set button_text = coalesce(button_text, 'Custom Pricing')
where slug = 'business';

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pricing_plans_updated_at on public.pricing_plans;

create trigger trg_pricing_plans_updated_at
before update on public.pricing_plans
for each row
execute function public.set_updated_at();

alter table public.pricing_plans enable row level security;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
  );
$$ language sql stable security definer;

drop policy if exists "pricing plans read active" on public.pricing_plans;
drop policy if exists "pricing plans admin write" on public.pricing_plans;

create policy "pricing plans read active"
on public.pricing_plans
for select
using (is_active = true or public.is_admin());

create policy "pricing plans admin write"
on public.pricing_plans
for all
using (public.is_admin())
with check (public.is_admin());
