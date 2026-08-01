-- ============================================================================
-- 19 — Product image crop
-- ============================================================================
-- Stores the square crop chosen in Admin → Products → Crop as "x,y,w,h" in
-- source-image pixels. Applied on delivery (Cloudinary transform), so the same
-- framing shows on the shop grid, homepage rails, related products and the
-- product page.
--
-- NULL / empty means no crop — the picture is shown as uploaded.
--
-- Paste into the Supabase SQL Editor and press Run. Safe to re-run.
-- ============================================================================

alter table products
  add column if not exists image_crop text;

notify pgrst, 'reload schema';
