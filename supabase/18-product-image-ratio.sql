-- ============================================================================
-- 18 — Product image ratio
-- ============================================================================
-- Stores the crop ratio chosen when uploading a product picture. The framing
-- is then used everywhere the product appears: homepage sections, shop grid,
-- "You may also like", and the product page gallery.
--
-- Values: 'original' | '1:1' | '4:3' | '16:9' | '3:4'
-- 'original' means no crop, which is how every existing product renders today.
--
-- Paste into the Supabase SQL Editor and press Run. Safe to re-run.
-- ============================================================================

alter table products
  add column if not exists image_ratio text not null default 'original';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_image_ratio_check'
  ) then
    alter table products
      add constraint products_image_ratio_check
      check (image_ratio in ('original', '1:1', '4:3', '16:9', '3:4'));
  end if;
end $$;

notify pgrst, 'reload schema';

-- Verify:
--   select name, image_ratio from products order by name;
