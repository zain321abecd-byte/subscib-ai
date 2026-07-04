-- ============================================================================
-- 9-dynamic-settings.sql
-- Seed the site_settings keys that the new dynamic admin panel exposes.
-- Only inserts missing keys — existing values are never overwritten
-- (uses `on conflict (key) do nothing`).
--
-- Every value is stored as JSONB. For plain strings we wrap in `to_jsonb`
-- so `""`, `"SubscribAI"`, etc. all round-trip cleanly through the
-- getSiteSettings() reader.
--
-- Safe to re-run — idempotent.
-- ============================================================================

insert into public.site_settings (key, value) values
  -- Business / contact
  ('support_phone',              to_jsonb('' ::text)),
  ('business_name',              to_jsonb('SubscribAI' ::text)),
  ('business_address',           to_jsonb('' ::text)),
  ('footer_text',                to_jsonb('' ::text)),

  -- Tracking (canonical spellings — legacy `seo_*` keys stay as they are).
  ('meta_pixel_id',              to_jsonb('' ::text)),
  ('google_site_verification',   to_jsonb('' ::text)),
  ('google_analytics_id',        to_jsonb('' ::text)),
  ('google_tag_manager_id',      to_jsonb('' ::text)),

  -- Currency display preference (used by future currency toggles).
  ('currency_display',           to_jsonb('local' ::text))
on conflict (key) do nothing;

-- One-shot copy of the legacy tracking values into the canonical keys,
-- so a site that had `seo_google_verification` set but not
-- `google_site_verification` doesn't lose the value at cutover. Run
-- once during deploy; safe to re-run — no-ops after the first pass
-- because canonical values are only written when they'd otherwise be blank.
update public.site_settings dst
   set value = src.value
  from public.site_settings src
 where dst.key = 'google_site_verification'
   and src.key = 'seo_google_verification'
   and (dst.value is null or dst.value::text in ('""', 'null'));

update public.site_settings dst
   set value = src.value
  from public.site_settings src
 where dst.key = 'google_analytics_id'
   and src.key = 'seo_google_analytics'
   and (dst.value is null or dst.value::text in ('""', 'null'));

update public.site_settings dst
   set value = src.value
  from public.site_settings src
 where dst.key = 'meta_pixel_id'
   and src.key = 'seo_facebook_pixel'
   and (dst.value is null or dst.value::text in ('""', 'null'));

comment on table public.site_settings is
  'Editable at runtime from /admin/settings. Every consumer reads via lib/site-settings.getSiteSettings() which is tagged-cached and invalidated by the save server action.';
