-- ============================================================================
-- FIX: "Could not find the 'show_on_homepage' column of 'products'
--       in the schema cache"
-- ============================================================================
-- Cause: supabase/8-homepage-tools.sql was never applied to this project, so
-- the column the admin product form writes does not exist. It was also left
-- out of RUN-ALL-PENDING.sql, which is why it was missed.
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to re-run: every statement is "if not exists".
-- ============================================================================

-- 1. The column the admin Products form saves.
alter table products
  add column if not exists show_on_homepage boolean not null default false;

-- 2. Index used when the homepage queries the secondary tools section.
create index if not exists products_show_on_homepage_idx
  on products(show_on_homepage, sort_order);

-- 3. Tell PostgREST to re-read the schema. Without this the API can keep
--    serving the cached schema and the same error persists for a few minutes.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Verify (should return one row: show_on_homepage | boolean | false):
--   select column_name, data_type, column_default
--   from information_schema.columns
--   where table_name = 'products' and column_name = 'show_on_homepage';
-- ---------------------------------------------------------------------------
