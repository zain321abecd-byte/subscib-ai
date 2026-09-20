-- ===========================================================================
-- 23-product-request-forms.sql
-- Product Request Form System.
--
-- The flow:
--   admin creates a form  →  system generates /forms/<slug>
--   customer opens the link, enters name + phone + email, submits
--   a sale_request lands in the admin panel as `pending`
--   admin accepts  →  a row is created in subscription_sales (Daily Sales)
--   admin declines →  the request is kept with an optional reason
--
-- Design notes:
--   • sale_requests snapshots the product name, plan and price at submit time.
--     Editing or deleting a form later must never rewrite the history of what
--     a customer actually agreed to.
--   • The public endpoint re-reads price and product from product_forms and
--     ignores whatever the browser posted, so a forged price can't get in.
--   • Request numbers come from a sequence + trigger rather than a count(*),
--     so two simultaneous submissions can't be handed the same number.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ── product_forms ─────────────────────────────────────────────────────────
create table if not exists public.product_forms (
  id            uuid primary key default gen_random_uuid(),
  -- URL segment: subscribai.com/forms/<slug>
  slug          text not null unique,
  -- Admin-facing label, e.g. "ChatGPT Plus Plan".
  name          text not null,
  product_type  text not null default 'subscription',

  -- Optional link to the catalog. Null for things not sold as products.
  product_id    text references public.products(id) on delete set null,
  -- Always stored, even when linked, so the form keeps working if the
  -- catalog row is renamed or removed.
  product_name  text not null,

  plan_duration text not null default 'monthly',
  -- Free text shown to the customer, e.g. "Monthly Renewable".
  renewal_note  text,
  price         numeric(10, 2),
  currency      text not null default 'PKR',
  -- Optional blurb above the form fields.
  intro         text,

  active        boolean not null default true,
  created_by    uuid references public.portal_users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint product_forms_type_chk
    check (product_type in ('subscription', 'digital', 'service')),
  constraint product_forms_duration_chk
    check (plan_duration in ('monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time')),
  constraint product_forms_slug_chk
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint product_forms_price_chk
    check (price is null or price >= 0)
);

create index if not exists product_forms_active_idx on public.product_forms (active, created_at desc);
create index if not exists product_forms_product_idx on public.product_forms (product_id);

create or replace function public.product_forms_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists product_forms_touch on public.product_forms;
create trigger product_forms_touch
  before update on public.product_forms
  for each row execute function public.product_forms_touch_updated_at();

-- ── sale_requests ─────────────────────────────────────────────────────────
create sequence if not exists public.sale_request_no_seq start with 1;

create table if not exists public.sale_requests (
  id             uuid primary key default gen_random_uuid(),
  -- Human-facing id, e.g. SB-000125. Filled by the trigger below.
  request_no     text unique,

  form_id        uuid references public.product_forms(id) on delete set null,

  -- Snapshot of the form at submit time.
  form_name      text,
  product_id     text,
  product_name   text not null,
  plan_duration  text,
  plan_label     text,
  price          numeric(10, 2),
  currency       text not null default 'PKR',

  -- What the customer typed. Nothing else is collected.
  customer_name  text not null,
  customer_phone text not null,
  customer_email text,

  status         text not null default 'pending',
  decline_reason text,
  -- Set when accepted, so the request and the sale stay linked and a second
  -- accept can be refused instead of creating a duplicate sale.
  sale_id        uuid references public.subscription_sales(id) on delete set null,
  reviewed_by    uuid references public.portal_users(id) on delete set null,
  reviewed_at    timestamptz,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint sale_requests_status_chk
    check (status in ('pending', 'accepted', 'declined'))
);

create index if not exists sale_requests_status_idx  on public.sale_requests (status, created_at desc);
create index if not exists sale_requests_form_idx    on public.sale_requests (form_id);
create index if not exists sale_requests_phone_idx   on public.sale_requests (customer_phone);
create index if not exists sale_requests_created_idx on public.sale_requests (created_at desc);

-- Request number: SB-000125. Sequence-backed so concurrent submissions can't
-- collide the way a count(*)+1 would.
create or replace function public.sale_requests_set_request_no()
returns trigger language plpgsql as $$
begin
  if new.request_no is null then
    new.request_no := 'SB-' || lpad(nextval('public.sale_request_no_seq')::text, 6, '0');
  end if;
  return new;
end $$;

drop trigger if exists sale_requests_number on public.sale_requests;
create trigger sale_requests_number
  before insert on public.sale_requests
  for each row execute function public.sale_requests_set_request_no();

create or replace function public.sale_requests_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists sale_requests_touch on public.sale_requests;
create trigger sale_requests_touch
  before update on public.sale_requests
  for each row execute function public.sale_requests_touch_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────
-- Both tables are admin-only. The public form page and its submit endpoint run
-- server-side with the service role, so the anon key never needs access — and
-- a customer can't enumerate other people's requests.
alter table public.product_forms enable row level security;
alter table public.sale_requests enable row level security;

drop policy if exists "product_forms admin read"  on public.product_forms;
drop policy if exists "product_forms admin write" on public.product_forms;
create policy "product_forms admin read"  on public.product_forms for select using (is_admin());
create policy "product_forms admin write" on public.product_forms for all
  using (is_admin()) with check (is_admin());

drop policy if exists "sale_requests admin read"  on public.sale_requests;
drop policy if exists "sale_requests admin write" on public.sale_requests;
create policy "sale_requests admin read"  on public.sale_requests for select using (is_admin());
create policy "sale_requests admin write" on public.sale_requests for all
  using (is_admin()) with check (is_admin());

comment on table public.product_forms is
  'Public request forms. Each one publishes a /forms/<slug> page that collects a customer name, phone and email against a fixed product.';
comment on table public.sale_requests is
  'Submissions from /forms/<slug>, pending admin approval. Accepting creates the subscription_sales row and links it via sale_id.';
