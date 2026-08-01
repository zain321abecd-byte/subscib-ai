-- ============================================================================
-- 17 — Correct the image_fit default (and existing rows)
-- ============================================================================
-- The first version of 16-product-options.sql created image_fit with
-- `default 'cover'`, so every existing product was stamped 'cover' when the
-- column was added. 'contain' is the historical rendering (whole logo, no
-- crop), so this restores it and leaves 'cover' as a per-product opt-in
-- chosen from Admin → Products → Logo fit.
--
-- Paste into the Supabase SQL Editor and press Run. Safe to re-run.
-- ============================================================================

-- 1. Future rows default to the non-destructive option.
alter table products alter column image_fit set default 'contain';

-- 2. Reset rows that were auto-stamped 'cover' by the old default.
--    NOTE: if you have already hand-picked "Fill container" for a product,
--    re-apply it from the admin after running this.
update products set image_fit = 'contain' where image_fit = 'cover';

notify pgrst, 'reload schema';

-- Verify — every row should read 'contain':
--   select name, image_fit from products order by name;
