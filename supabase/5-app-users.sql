-- ===========================================================================
-- 5-app-users.sql
-- Custom user/auth table managed by the NestJS backend (not Supabase Auth).
-- The backend hashes passwords with bcrypt and issues JWTs against this table.
-- ===========================================================================

-- Extensions must be created BEFORE any table that uses their types.
-- pgcrypto → gen_random_uuid()  |  citext → case-insensitive email column
create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.users (
  id                  uuid primary key default gen_random_uuid(),
  email               citext not null unique,
  password_hash       text not null,
  name                text,
  phone               text,
  role                text not null default 'customer',  -- 'customer' | 'admin'
  email_verified_at   timestamptz,
  verification_token  text,                              -- one-time, cleared on verify
  verification_sent_at timestamptz,
  password_reset_token text,
  password_reset_expires timestamptz,
  last_login_at       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);
create index if not exists users_verification_token_idx on public.users (verification_token);
create index if not exists users_password_reset_token_idx on public.users (password_reset_token);

-- Auto-touch updated_at on every UPDATE.
create or replace function public.users_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
before update on public.users
for each row execute function public.users_touch_updated_at();

-- The backend connects with the service-role key and bypasses RLS, so we
-- enable RLS with NO public policies — protecting the table from anon clients
-- that might end up with the anon key.
alter table public.users enable row level security;
-- (no policies → anon/authenticated cannot read this table at all)

-- The orders table already has user_id; point it at public.users instead of
-- auth.users now that we own the auth lifecycle. Steps:
--   1. drop the old FK (if any) to auth.users
--   2. null out user_ids that don't correspond to a public.users row — those
--      are legacy Supabase Auth orders (the customer can claim them again by
--      signing up with the same email; we then re-link by email)
--   3. add the new FK to public.users
do $$
declare
  fk_name text;
begin
  for fk_name in
    select conname from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'f'
      and conname like '%user%'
  loop
    execute format('alter table public.orders drop constraint %I', fk_name);
  end loop;
end$$;

-- Detach orphaned user_ids so the new FK can be validated cleanly.
update public.orders
  set user_id = null
  where user_id is not null
    and user_id not in (select id from public.users);

alter table public.orders
  add constraint orders_user_id_fkey
  foreign key (user_id) references public.users(id)
  on delete set null;

comment on table public.users is
  'Application users managed by the NestJS backend. Passwords are bcrypt hashes. Supersedes auth.users for new signups.';
