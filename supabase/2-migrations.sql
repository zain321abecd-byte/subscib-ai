-- Run this AFTER schema.sql to add new columns introduced after the initial setup.
-- Idempotent: safe to run multiple times.

-- Multi-image gallery: array of Cloudinary URLs (excluding the cover image_url
-- which stays as the primary). Stored as jsonb so we can preserve order and
-- attach metadata later (e.g. alt text) without another migration.
alter table products
  add column if not exists gallery jsonb not null default '[]'::jsonb;

-- Whether the product appears in the "You may also like" section on other
-- product detail pages. Defaults to true so existing rows keep their behaviour.
alter table products
  add column if not exists show_in_related boolean not null default true;

-- Admin-curated list of related products to recommend in "You may also like"
-- on THIS product's detail page. Empty array → fall back to same-category
-- products that have show_in_related = true.
alter table products
  add column if not exists related_product_ids jsonb not null default '[]'::jsonb;
