-- ===========================================================================
-- 25-fix-newsletter-consent.sql
--
-- Clean up the newsletter list after the consent bug.
--
-- WHAT WENT WRONG
-- Every completed order ran an upsert into email_subscribers with
-- `subscribed: true, unsubscribed_at: null`. Two consequences:
--   1. Customers were added to the marketing list without ever asking for it.
--      There is no newsletter signup form on the site, so EVERY row in this
--      table arrived this way — "Newsletter subscribers" in the admin panel
--      was simply the customer list.
--   2. A customer who clicked Unsubscribe was silently re-subscribed the next
--      time they ordered, which made the unsubscribe link meaningless.
--
-- The code no longer does either (api/src/orders/orders.service.ts). This
-- migration repairs the rows that were already created.
--
-- RUN THE DRY RUN FIRST. The cleanup is not reversible from the app — a row
-- set back to subscribed=false can only become true again through a genuine
-- opt-in.
-- ===========================================================================

-- ── Dry run — look before you leap ────────────────────────────────────────
-- How many contacts are marked subscribed, and where did they come from?
--
--   select source,
--          count(*) filter (where subscribed)            as marked_subscribed,
--          count(*) filter (where not subscribed)        as opted_out,
--          count(*) filter (where unsubscribed_at is not null) as has_unsubscribed_before
--     from public.email_subscribers
--    group by source
--    order by source;
--
-- Anything with source = 'order' was never a real opt-in.

-- ── 1. Withdraw consent that was never given ──────────────────────────────
-- Order-derived contacts go back to opted out. They stay in the table as
-- contacts, and the admin panel can still reach them through the "customers"
-- audience, which reads the orders table directly. What changes is that they
-- are no longer counted as newsletter subscribers.
update public.email_subscribers
   set subscribed = false,
       updated_at = now()
 where source = 'order'
   and subscribed = true;

-- ── 2. Restore unsubscribes that were overwritten ─────────────────────────
-- Anyone carrying an unsubscribed_at timestamp asked to be removed at some
-- point. If a later order flipped them back to subscribed, honour the original
-- request — the timestamp is the evidence it happened.
update public.email_subscribers
   set subscribed = false,
       updated_at = now()
 where unsubscribed_at is not null
   and subscribed = true;

-- ── 3. Verify ─────────────────────────────────────────────────────────────
-- After running, this should show subscribers only from genuine opt-in
-- sources (there may be none until a signup form exists — that is correct,
-- not a failure):
--
--   select source, count(*) as still_subscribed
--     from public.email_subscribers
--    where subscribed = true
--    group by source;

comment on table public.email_subscribers is
  'Marketing contacts. subscribed=true means the person actively opted in. Orders create rows opted OUT — buying is not consent to marketing, and an order must never overwrite an unsubscribe.';
