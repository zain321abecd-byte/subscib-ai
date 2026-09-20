-- ===========================================================================
-- 24-deleted-sales-and-account-book.sql
--
-- Two additions:
--   1. Soft delete for Daily Sales, so a deleted sale can be reviewed and
--      restored instead of vanishing.
--   2. The Account Book: what you owe vendors, what customers owe you.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ═══ 1. Soft delete for subscription_sales ════════════════════════════════
-- Deleting used to remove the row outright, so a mistake was unrecoverable and
-- the revenue history silently changed. Deleting now stamps these columns; the
-- Daily Sales list filters them out and the Deleted Sales page shows them with
-- a Restore action.
alter table public.subscription_sales
  add column if not exists deleted_at    timestamptz,
  add column if not exists deleted_by    uuid references public.portal_users(id) on delete set null,
  add column if not exists delete_reason text;

-- Every "live sales" read filters on deleted_at is null, so index that path.
create index if not exists subscription_sales_deleted_idx
  on public.subscription_sales (deleted_at);

comment on column public.subscription_sales.deleted_at is
  'Soft delete. Non-null means the sale is in Deleted Sales and excluded from Daily Sales, revenue and renewal reminders.';

-- ═══ 2. Account Book ══════════════════════════════════════════════════════

-- ── Vendor payables — money the business owes ─────────────────────────────
create table if not exists public.vendor_payables (
  id             uuid primary key default gen_random_uuid(),
  vendor_name    text not null,
  vendor_contact text,
  description    text,                       -- product / service the bill is for
  amount         numeric(12, 2) not null default 0,
  paid_amount    numeric(12, 2) not null default 0,
  currency       text not null default 'PKR',
  due_date       date,
  -- Derived from the amounts by the trigger below rather than typed, so the
  -- status can never disagree with the numbers.
  status         text not null default 'pending',
  notes          text,
  created_by     uuid references public.portal_users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint vendor_payables_status_chk check (status in ('pending', 'partial', 'paid')),
  constraint vendor_payables_amount_chk check (amount >= 0),
  constraint vendor_payables_paid_chk   check (paid_amount >= 0)
);

create index if not exists vendor_payables_status_idx on public.vendor_payables (status, due_date);
create index if not exists vendor_payables_vendor_idx on public.vendor_payables (vendor_name);

-- ── Customer receivables — money owed to the business ─────────────────────
create table if not exists public.customer_receivables (
  id              uuid primary key default gen_random_uuid(),
  customer_name   text not null,
  customer_phone  text,
  product_name    text,
  invoice_no      text,
  amount          numeric(12, 2) not null default 0,
  received_amount numeric(12, 2) not null default 0,
  currency        text not null default 'PKR',
  due_date        date,
  status          text not null default 'pending',
  notes           text,
  -- Optional link back to the sale this invoice is for.
  sale_id         uuid references public.subscription_sales(id) on delete set null,
  created_by      uuid references public.portal_users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint customer_receivables_status_chk check (status in ('pending', 'partial', 'paid')),
  constraint customer_receivables_amount_chk check (amount >= 0),
  constraint customer_receivables_received_chk check (received_amount >= 0)
);

create index if not exists customer_receivables_status_idx   on public.customer_receivables (status, due_date);
create index if not exists customer_receivables_customer_idx on public.customer_receivables (customer_name);

-- ── Status derived from the amounts ───────────────────────────────────────
-- paid when settled, pending when nothing has moved, partial in between.
-- Overpayment still counts as paid rather than flipping to partial.
create or replace function public.account_book_sync_status()
returns trigger language plpgsql as $$
declare
  settled numeric(12, 2);
begin
  settled := case tg_table_name
               when 'vendor_payables' then new.paid_amount
               else new.received_amount
             end;

  if new.amount > 0 and settled >= new.amount then
    new.status := 'paid';
  elsif settled > 0 then
    new.status := 'partial';
  else
    new.status := 'pending';
  end if;

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists vendor_payables_status on public.vendor_payables;
create trigger vendor_payables_status
  before insert or update on public.vendor_payables
  for each row execute function public.account_book_sync_status();

drop trigger if exists customer_receivables_status on public.customer_receivables;
create trigger customer_receivables_status
  before insert or update on public.customer_receivables
  for each row execute function public.account_book_sync_status();

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.vendor_payables      enable row level security;
alter table public.customer_receivables enable row level security;

drop policy if exists "vendor_payables admin read"  on public.vendor_payables;
drop policy if exists "vendor_payables admin write" on public.vendor_payables;
create policy "vendor_payables admin read"  on public.vendor_payables for select using (is_admin());
create policy "vendor_payables admin write" on public.vendor_payables for all
  using (is_admin()) with check (is_admin());

drop policy if exists "customer_receivables admin read"  on public.customer_receivables;
drop policy if exists "customer_receivables admin write" on public.customer_receivables;
create policy "customer_receivables admin read"  on public.customer_receivables for select using (is_admin());
create policy "customer_receivables admin write" on public.customer_receivables for all
  using (is_admin()) with check (is_admin());

comment on table public.vendor_payables is
  'Account Book — money owed to vendors. status is derived from amount vs paid_amount by trigger.';
comment on table public.customer_receivables is
  'Account Book — money customers owe. status is derived from amount vs received_amount by trigger.';

-- ── Portal permission keys ────────────────────────────────────────────────
-- accounts:* gates the Account Book. Money owed and owing is more sensitive
-- than the sales list, so it gets its own keys rather than riding on sales:*.
update public.portal_groups
   set permissions = (
     select jsonb_agg(distinct k)
       from jsonb_array_elements_text(permissions || '["accounts:read","accounts:write"]'::jsonb) as k
   )
 where name = 'Admins';

update public.portal_groups
   set permissions = (
     select jsonb_agg(distinct k)
       from jsonb_array_elements_text(permissions || '["accounts:read"]'::jsonb) as k
   )
 where name = 'Managers';
