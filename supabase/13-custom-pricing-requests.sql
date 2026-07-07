-- Custom Pricing Requests
-- Run this in Supabase SQL Editor. Safe to run more than once.

create table if not exists public.custom_pricing_requests (
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

create index if not exists custom_pricing_requests_status_idx
  on public.custom_pricing_requests(status);

create index if not exists custom_pricing_requests_created_at_idx
  on public.custom_pricing_requests(created_at desc);

create index if not exists custom_pricing_requests_email_idx
  on public.custom_pricing_requests(email);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_custom_pricing_requests_updated_at on public.custom_pricing_requests;

create trigger trg_custom_pricing_requests_updated_at
before update on public.custom_pricing_requests
for each row
execute function public.set_updated_at();

alter table public.custom_pricing_requests enable row level security;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
  );
$$ language sql stable security definer;

drop policy if exists "custom pricing requests admin read" on public.custom_pricing_requests;
drop policy if exists "custom pricing requests admin write" on public.custom_pricing_requests;

create policy "custom pricing requests admin read"
on public.custom_pricing_requests
for select
using (public.is_admin());

create policy "custom pricing requests admin write"
on public.custom_pricing_requests
for all
using (public.is_admin())
with check (public.is_admin());
