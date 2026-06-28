-- ===========================================================================
-- 6-roles-permissions.sql
-- Adds the 5-role system + per-user permission overrides on public.users.
--
-- Backend reference: api/src/auth/permissions.ts holds the canonical
-- permission catalog + role defaults. This migration is purely structural.
-- ===========================================================================

-- 1) Widen the existing `role` column. We DROP the old default ('customer')
--    then re-add it so future inserts still default to customer.
alter table public.users
  alter column role drop default;

-- 2) Constrain to the documented set. Using a CHECK constraint (not an enum)
--    so we can change it without a re-deploy of every dependent view.
alter table public.users
  drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check
  check (role in ('superadmin', 'admin', 'manager', 'editor', 'customer'));

alter table public.users
  alter column role set default 'customer';

-- 3) Per-user permission overrides. NULL = use role defaults.
--    Shape: { "grant": ["orders:read"], "revoke": ["products:delete"] }
--    - grant: extra keys this user has, beyond their role's defaults
--    - revoke: keys this user is denied, even if their role would include them
alter table public.users
  add column if not exists permissions jsonb not null default '{}'::jsonb;

create index if not exists users_role_idx on public.users (role);

comment on column public.users.role is
  'One of: superadmin (full access incl. user mgmt), admin (full access except creating other admins/superadmins), manager (products+orders+revenue), editor (products+blog write, no orders/revenue), customer.';

comment on column public.users.permissions is
  'Per-user overrides on top of role defaults. Shape: { "grant": [keys], "revoke": [keys] }. Empty {} = inherit role defaults verbatim.';
