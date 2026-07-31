-- ============================================================================
-- 16 — Product options: hide shared plan + image fit
-- ============================================================================
-- Adds the two columns behind the new admin Product form controls:
--   * hide_shared_plan — buy box offers Private only when true
--   * image_fit        — "cover" (fill/crop) or "contain" (fit whole logo)
--
-- Paste into the Supabase SQL Editor and press Run.
-- Safe to re-run: both statements use "if not exists".
-- ============================================================================

-- Also (re)applies the earlier homepage-tools column, so one paste brings the
-- products table fully up to date if 8-homepage-tools.sql was never run.
alter table products
  add column if not exists show_on_homepage boolean not null default false;

create index if not exists products_show_on_homepage_idx
  on products(show_on_homepage, sort_order);

alter table products
  add column if not exists hide_shared_plan boolean not null default false;

alter table products
  add column if not exists image_fit text not null default 'contain';

-- Only the two CSS object-fit values this UI supports.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_image_fit_check'
  ) then
    alter table products
      add constraint products_image_fit_check
      check (image_fit in ('cover', 'contain'));
  end if;
end $$;

-- Refresh PostgREST's schema cache, otherwise saves keep failing with
-- "Could not find the '<column>' column of 'products' in the schema cache".
notify pgrst, 'reload schema';
