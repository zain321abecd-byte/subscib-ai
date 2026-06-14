-- Stock Expiry Management
-- Run in Supabase SQL Editor if your database already has the earlier schema files applied.

create table if not exists stock_items (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  category text,
  quantity numeric(12, 2) not null check (quantity > 0),
  unit text,
  expiry_date date not null,
  reminder_days_before_expiry int not null default 7 check (reminder_days_before_expiry >= 0),
  contact_email text not null,
  supplier_name text,
  status text not null default 'active' check (status in ('active', 'expiringSoon', 'expired', 'renewed')),
  notes text,
  last_reminder_sent_at timestamptz,
  last_expired_reminder_sent_at timestamptz,
  renewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stock_items_expiry_date_idx on stock_items(expiry_date);
create index if not exists stock_items_status_idx on stock_items(status);
create index if not exists stock_items_supplier_idx on stock_items(supplier_name);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_stock_items_updated_at on stock_items;
create trigger trg_stock_items_updated_at before update on stock_items
  for each row execute function set_updated_at();

alter table stock_items enable row level security;

create or replace function is_admin()
returns boolean as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$ language sql stable security definer;

drop policy if exists "stock items admin read" on stock_items;
drop policy if exists "stock items admin write" on stock_items;
create policy "stock items admin read" on stock_items for select using (is_admin());
create policy "stock items admin write" on stock_items for all using (is_admin()) with check (is_admin());
