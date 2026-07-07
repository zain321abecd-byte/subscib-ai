-- Bundle Orders
-- Run this in Supabase SQL Editor after the base schema.

alter table public.orders
  add column if not exists fulfillment_status text not null default 'pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_fulfillment_status_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_fulfillment_status_check
      check (fulfillment_status in ('pending', 'in_progress', 'activated', 'rejected', 'expired'));
  end if;
end $$;

create index if not exists orders_fulfillment_status_idx
  on public.orders(fulfillment_status);

create table if not exists public.business_bundle_inquiries (
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

create index if not exists business_bundle_inquiries_status_idx
  on public.business_bundle_inquiries(status);

create index if not exists business_bundle_inquiries_created_at_idx
  on public.business_bundle_inquiries(created_at desc);

create index if not exists business_bundle_inquiries_email_idx
  on public.business_bundle_inquiries(email);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_business_bundle_inquiries_updated_at on public.business_bundle_inquiries;

create trigger trg_business_bundle_inquiries_updated_at
before update on public.business_bundle_inquiries
for each row
execute function public.set_updated_at();

alter table public.business_bundle_inquiries enable row level security;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
  );
$$ language sql stable security definer;

drop policy if exists "business bundle inquiries admin read" on public.business_bundle_inquiries;
drop policy if exists "business bundle inquiries admin write" on public.business_bundle_inquiries;

create policy "business bundle inquiries admin read"
on public.business_bundle_inquiries
for select
using (public.is_admin());

create policy "business bundle inquiries admin write"
on public.business_bundle_inquiries
for all
using (public.is_admin())
with check (public.is_admin());
