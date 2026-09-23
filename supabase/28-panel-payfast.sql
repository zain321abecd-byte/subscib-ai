-- ===========================================================================
-- 28-panel-payfast.sql
-- Pay wallet top-ups through the existing PayFast gateway.
--
-- Run after 27-panel-smm.sql. Safe to re-run.
--
-- Until now a top-up was a claim ("I paid by bank transfer") that an admin
-- confirmed by hand. PayFast top-ups are confirmed by the gateway instead, so
-- panel_payment_requests grows a few columns to carry that:
--
--   gateway         'manual' (the existing flow) or 'payfast'
--   basket_id       what we send PayFast as BASKET_ID, and what its callbacks
--                   come back with. Unique, because it is the idempotency key:
--                   PayFast calls us twice for every payment (once on the
--                   browser redirect, once server-to-server via IPN) and the
--                   wallet must only ever be credited once.
--   gateway_txn_id  PayFast's transaction_id, for reconciliation
--   gateway_err_code  PayFast's err_code, kept even on success ("000")
--   paid_at         when the gateway confirmed it
--
-- Existing rows become gateway='manual', which is what they were.
-- ===========================================================================

alter table public.panel_payment_requests
  add column if not exists gateway          text not null default 'manual',
  add column if not exists basket_id        text,
  add column if not exists gateway_txn_id   text,
  add column if not exists gateway_err_code text,
  add column if not exists paid_at          timestamptz;

-- Idempotency key for the gateway callbacks. Partial, so the manual flow (which
-- has no basket) isn't forced to invent one.
create unique index if not exists panel_payments_basket_idx
  on public.panel_payment_requests (basket_id)
  where basket_id is not null;

create index if not exists panel_payments_gateway_idx
  on public.panel_payment_requests (gateway, status, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'panel_payments_gateway_chk'
  ) then
    alter table public.panel_payment_requests
      add constraint panel_payments_gateway_chk check (gateway in ('manual', 'payfast'));
  end if;
end $$;

-- A gateway payment can end in a state the manual flow never had: the customer
-- reached PayFast and it declined. That is not the same as an admin rejecting a
-- claim, so it gets its own status rather than being flattened into 'rejected'.
alter table public.panel_payment_requests
  drop constraint if exists panel_payments_status_chk;
alter table public.panel_payment_requests
  add constraint panel_payments_status_chk
  check (status in ('pending', 'approved', 'rejected', 'failed'));

comment on column public.panel_payment_requests.basket_id is
  'BASKET_ID sent to PayFast. Unique — it is the idempotency key that stops the browser return and the IPN both crediting the wallet.';
comment on column public.panel_payment_requests.gateway is
  'manual = customer claims they paid and an admin confirms. payfast = the gateway confirms.';

-- ═══ Check what you have ══════════════════════════════════════════════════
--   select gateway, status, count(*), sum(amount)
--     from public.panel_payment_requests
--    group by gateway, status order by gateway, status;
