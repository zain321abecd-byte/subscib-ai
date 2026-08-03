-- ============================================================================
-- 20 — Correct product names to their official brand spelling
-- ============================================================================
-- These names appear in page titles, Google results, the cart, order emails
-- and the Product schema, so misspellings read as carelessness to a buyer
-- comparing sellers.
--
-- Two are real typos rather than capitalisation: "Envento" → "Envato" and
-- "Loveable" → "Lovable".
--
-- reviews.product_name is updated in the same pass: the product page matches
-- reviews with `review.product === product.name`, so renaming a product
-- without renaming its reviews would silently detach them.
--
-- Paste into the Supabase SQL Editor and press Run. Safe to re-run.
-- ============================================================================

-- Products ------------------------------------------------------------------
update products set name = 'Ahrefs'         where name = 'Ahref';
update products set name = 'Claude AI'      where name = 'Claude Ai';
update products set name = 'Envato Elements' where name = 'Envento Elements';
update products set name = 'Lovable'        where name = 'Loveable';
update products set name = 'NordVPN'        where name = 'Nord Vpn';
update products set name = 'Surfshark VPN'  where name = 'SurfShark Vpn';
update products set name = 'YouTube Premium' where name = 'Youtube Premium';
update products set name = 'Microsoft 365 Copilot'
  where name = 'Microsoft 365 CoPilot Premium Plan With 1TB Storage';

-- Reviews: keep them attached to the renamed products ------------------------
update reviews set product_name = 'Ahrefs'         where product_name = 'Ahref';
update reviews set product_name = 'Claude AI'      where product_name = 'Claude Ai';
update reviews set product_name = 'Envato Elements' where product_name = 'Envento Elements';
update reviews set product_name = 'Lovable'        where product_name = 'Loveable';
update reviews set product_name = 'NordVPN'        where product_name = 'Nord Vpn';
update reviews set product_name = 'Surfshark VPN'  where product_name = 'SurfShark Vpn';
update reviews set product_name = 'YouTube Premium' where product_name = 'Youtube Premium';
update reviews set product_name = 'Microsoft 365 Copilot'
  where product_name = 'Microsoft 365 CoPilot Premium Plan With 1TB Storage';

-- Verify:
--   select name from products order by name;
