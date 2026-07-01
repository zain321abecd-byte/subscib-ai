-- ===========================================================================
-- 7-portal-team.sql
-- Portal (back-office) teammates — completely separate from public.users
-- (storefront customers). Modeled after lifecycle-backend's UserGroup pattern,
-- with the key difference that this table is portal-only.
--
--   public.portal_users             ← teammates (invited by superadmin)
--   public.portal_groups            ← permission groups (Admins, Editors, …)
--   public.portal_group_members     ← many-to-many join
--
-- Storefront customers never appear in these tables. They cannot log into
-- the admin portal even if their public.users email matches a portal_users
-- email — different tables + a JWT `principal` claim keep the two audiences
-- completely disjoint.
-- ===========================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ── portal_users ───────────────────────────────────────────────────────────
create table if not exists public.portal_users (
  id                  uuid primary key default gen_random_uuid(),
  email               citext not null unique,
  password_hash       text,                              -- NULL until invite accepted
  name                text,
  status              text not null default 'invited',   -- 'invited' | 'active' | 'disabled'
  is_superadmin       boolean not null default false,    -- bypasses every permission check
  invite_token        text unique,                       -- one-time; cleared on accept
  invite_sent_at      timestamptz,
  invite_accepted_at  timestamptz,
  invited_by          uuid references public.portal_users(id) on delete set null,
  last_login_at       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint portal_users_status_chk
    check (status in ('invited', 'active', 'disabled'))
);

create index if not exists portal_users_status_idx on public.portal_users (status);
create index if not exists portal_users_invite_token_idx on public.portal_users (invite_token);

-- Auto-touch updated_at.
create or replace function public.portal_users_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists portal_users_touch on public.portal_users;
create trigger portal_users_touch
  before update on public.portal_users
  for each row execute function public.portal_users_touch_updated_at();

-- ── portal_groups ──────────────────────────────────────────────────────────
create table if not exists public.portal_groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  description  text,
  -- Array of permission keys (matches the catalog in api/src/auth/permissions.ts)
  permissions  jsonb not null default '[]'::jsonb,
  is_system    boolean not null default false,     -- true for seeded groups → can't delete
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create or replace function public.portal_groups_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists portal_groups_touch on public.portal_groups;
create trigger portal_groups_touch
  before update on public.portal_groups
  for each row execute function public.portal_groups_touch_updated_at();

-- ── portal_group_members ──────────────────────────────────────────────────
create table if not exists public.portal_group_members (
  group_id  uuid not null references public.portal_groups(id) on delete cascade,
  user_id   uuid not null references public.portal_users(id)  on delete cascade,
  added_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists portal_group_members_user_idx on public.portal_group_members (user_id);

-- ── Seeded groups ─────────────────────────────────────────────────────────
-- Keep in sync with api/src/portal/portal-permissions.ts (single source of
-- truth). The default membership on each group can be tweaked from the UI
-- without touching this migration.
insert into public.portal_groups (name, description, permissions, is_system)
values
  (
    'Admins',
    'Full access to everything except superadmin-only actions (user deletion, role assignment).',
    to_jsonb(array[
      'products:read','products:write','products:delete',
      'orders:read','orders:write','orders:refund','orders:revenue',
      'blog:read','blog:write','blog:delete',
      'reviews:read','reviews:moderate','reviews:delete',
      'freebies:read','freebies:write','freebies:delete',
      'stock:read','stock:write',
      'settings:read','settings:write',
      'emails:read','emails:send',
      'users:read','users:write',
      'analytics:view'
    ]),
    true
  ),
  (
    'Managers',
    'Day-to-day operations: products, orders, revenue, reviews moderation, blog read.',
    to_jsonb(array[
      'products:read','products:write',
      'orders:read','orders:write','orders:refund','orders:revenue',
      'blog:read',
      'reviews:read','reviews:moderate',
      'freebies:read','freebies:write',
      'stock:read','stock:write',
      'settings:read',
      'emails:read','emails:send',
      'analytics:view'
    ]),
    true
  ),
  (
    'Editors',
    'Content-only: add or edit products and blog posts. No orders, no revenue.',
    to_jsonb(array[
      'products:read','products:write',
      'blog:read','blog:write',
      'freebies:read','freebies:write',
      'reviews:read',
      'stock:read'
    ]),
    true
  )
on conflict (name) do nothing;

comment on table public.portal_users is
  'Back-office teammates invited by the superadmin. Completely disjoint from public.users (storefront customers).';
comment on table public.portal_groups is
  'Named permission groups. Members inherit every permission key listed here. See api/src/portal/portal-permissions.ts.';
comment on table public.portal_group_members is
  'Many-to-many between portal_users and portal_groups. A user with membership in multiple groups gets the union of their permission keys.';
