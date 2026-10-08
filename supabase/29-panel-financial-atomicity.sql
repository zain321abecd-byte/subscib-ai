-- Atomic financial operations for the SMM panel.
-- Apply after 27-panel-smm.sql and 28-panel-payfast.sql.
-- The functions are service-role only: browser roles cannot call them.

create unique index if not exists panel_services_provider_service_unique
  on public.panel_services (provider_id, provider_service_id)
  where provider_id is not null and provider_service_id is not null;

create or replace function public.panel_place_order_atomic(
  p_user_id uuid,
  p_service_id uuid,
  p_link text,
  p_quantity integer
)
returns table(order_id uuid, charge numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  svc public.panel_services%rowtype;
  calculated numeric(14,2);
  created_id uuid;
begin
  if p_link !~* '^https?://\S+$' then raise exception 'Invalid link'; end if;
  if p_quantity <= 0 then raise exception 'Invalid quantity'; end if;

  select * into svc from public.panel_services
   where id = p_service_id and active = true;
  if not found then raise exception 'Service unavailable'; end if;
  if p_quantity < svc.min_quantity or p_quantity > svc.max_quantity then
    raise exception 'Quantity outside service limits';
  end if;

  calculated := round((svc.rate_per_1000 * p_quantity / 1000.0)::numeric, 2);
  insert into public.panel_wallet_transactions(user_id, type, amount, note)
  values (p_user_id, 'debit', calculated, svc.name || ' — ' || p_quantity::text);

  insert into public.panel_orders(
    user_id, service_id, service_name, rate_per_1000, link, quantity,
    charge, status, provider_id
  ) values (
    p_user_id, svc.id, svc.name, svc.rate_per_1000, p_link, p_quantity,
    calculated, 'pending', svc.provider_id
  ) returning id into created_id;

  return query select created_id, calculated;
end $$;

create or replace function public.panel_update_order_and_refund_atomic(
  p_order_id uuid,
  p_status text,
  p_note text,
  p_actor_id uuid
)
returns table(refunded boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.panel_orders%rowtype;
  did_refund boolean := false;
begin
  if p_status not in ('pending','processing','in_progress','completed','partial','cancelled','failed') then
    raise exception 'Invalid order status';
  end if;
  select * into ord from public.panel_orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;

  if p_status in ('cancelled','failed') and ord.refunded_at is null and ord.charge > 0 then
    insert into public.panel_wallet_transactions(user_id, type, amount, note, created_by)
    values (ord.user_id, 'credit', ord.charge, 'Refund — ' || ord.service_name, p_actor_id);
    did_refund := true;
  end if;

  update public.panel_orders
     set status = p_status,
         note = coalesce(nullif(trim(p_note), ''), ord.note),
         refunded_at = case when did_refund then now() else ord.refunded_at end
   where id = p_order_id;
  return query select did_refund;
end $$;

create or replace function public.panel_review_manual_topup_atomic(
  p_request_id uuid,
  p_decision text,
  p_admin_note text,
  p_admin_id uuid
)
returns table(transaction_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.panel_payment_requests%rowtype;
  tx_id uuid := null;
begin
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  select * into req from public.panel_payment_requests where id = p_request_id for update;
  if not found then raise exception 'Payment request not found'; end if;
  if req.status <> 'pending' then raise exception 'Payment request already reviewed'; end if;
  if req.gateway = 'payfast' and p_decision = 'approved' then
    raise exception 'PayFast payments require gateway confirmation';
  end if;

  if p_decision = 'approved' then
    insert into public.panel_wallet_transactions(user_id, type, amount, note, created_by)
    values (req.user_id, 'credit', req.amount, 'Wallet top-up approved', p_admin_id)
    returning id into tx_id;
  end if;
  update public.panel_payment_requests
     set status = p_decision, admin_note = nullif(trim(p_admin_note), ''),
         reviewed_by = p_admin_id, reviewed_at = now(), transaction_id = tx_id
   where id = p_request_id;
  return query select tx_id;
end $$;

create or replace function public.panel_settle_payfast_topup_atomic(
  p_request_id uuid,
  p_outcome text,
  p_transaction_id text,
  p_err_code text
)
returns table(result text, wallet_transaction_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.panel_payment_requests%rowtype;
  tx_id uuid := null;
  cancelled boolean;
begin
  if p_outcome not in ('paid','failed') then raise exception 'Invalid gateway outcome'; end if;
  select * into req from public.panel_payment_requests where id = p_request_id for update;
  if not found or req.gateway <> 'payfast' then return query select 'ignored'::text, null::uuid; return; end if;

  cancelled := req.status = 'rejected' and
    (coalesce(req.admin_note, '') like 'Cancelled by customer%' or
     coalesce(req.admin_note, '') like 'Cancelled automatically%');
  if req.status <> 'pending' and not (cancelled and p_outcome = 'paid') then
    return query select 'duplicate'::text, req.transaction_id; return;
  end if;

  if p_outcome = 'failed' then
    update public.panel_payment_requests set status = 'failed',
      gateway_txn_id = nullif(p_transaction_id, ''), gateway_err_code = nullif(p_err_code, ''),
      reviewed_at = now() where id = p_request_id;
    return query select 'failed'::text, null::uuid; return;
  end if;

  insert into public.panel_wallet_transactions(user_id, type, amount, reference, note)
  values (req.user_id, 'credit', req.amount, coalesce(nullif(p_transaction_id, ''), req.basket_id),
          'Wallet top-up — PayFast') returning id into tx_id;
  update public.panel_payment_requests set status = 'approved',
    gateway_txn_id = nullif(p_transaction_id, ''), gateway_err_code = nullif(p_err_code, ''),
    paid_at = now(), reviewed_at = now(), transaction_id = tx_id,
    admin_note = case when cancelled then 'Payment completed after cancellation; reconciled automatically.' else admin_note end
   where id = p_request_id;
  return query select 'credited'::text, tx_id;
end $$;

-- PUBLIC exists in both Supabase and plain Railway PostgreSQL. The named
-- Supabase roles do not exist in a vanilla Railway database, so handle them
-- conditionally and leave the owner (the API connection) able to execute.
revoke all on function public.panel_place_order_atomic(uuid,uuid,text,integer) from public;
revoke all on function public.panel_update_order_and_refund_atomic(uuid,text,text,uuid) from public;
revoke all on function public.panel_review_manual_topup_atomic(uuid,text,text,uuid) from public;
revoke all on function public.panel_settle_payfast_topup_atomic(uuid,text,text,text) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.panel_place_order_atomic(uuid,uuid,text,integer) from anon;
    revoke all on function public.panel_update_order_and_refund_atomic(uuid,text,text,uuid) from anon;
    revoke all on function public.panel_review_manual_topup_atomic(uuid,text,text,uuid) from anon;
    revoke all on function public.panel_settle_payfast_topup_atomic(uuid,text,text,text) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.panel_place_order_atomic(uuid,uuid,text,integer) from authenticated;
    revoke all on function public.panel_update_order_and_refund_atomic(uuid,text,text,uuid) from authenticated;
    revoke all on function public.panel_review_manual_topup_atomic(uuid,text,text,uuid) from authenticated;
    revoke all on function public.panel_settle_payfast_topup_atomic(uuid,text,text,text) from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.panel_place_order_atomic(uuid,uuid,text,integer) to service_role;
    grant execute on function public.panel_update_order_and_refund_atomic(uuid,text,text,uuid) to service_role;
    grant execute on function public.panel_review_manual_topup_atomic(uuid,text,text,uuid) to service_role;
    grant execute on function public.panel_settle_payfast_topup_atomic(uuid,text,text,text) to service_role;
  end if;
end $$;
