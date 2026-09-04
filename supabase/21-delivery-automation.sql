-- ===========================================================================
-- 21-delivery-automation.sql
-- Subscription Delivery Automation — message templates + delivery log.
--
-- What this powers:
--   • /admin/delivery            → compose + preview + send a delivery message
--   • /admin/delivery/templates  → template CRUD (per product, per language)
--   • /admin/delivery/history    → delivery log (view / copy / resend)
--   • backend cron               → renewal reminders + expiry notices
--
-- Access model (same shape as 8-daily-sales.sql):
--   • RLS on, is_admin() gates everything — the anon key cannot touch either
--     table. Server actions / the API use the service role (bypasses RLS);
--     RLS is defence in depth.
--   • Portal permission keys delivery:read / delivery:send / delivery:templates
--     gate the admin UI + server actions (requireAdmin("delivery:read")).
--
-- SECURITY NOTE: delivery_messages.message_body holds the message that was
-- actually sent, which includes the subscription credentials. That is what
-- makes "copy" / "resend" possible. The table is admin-only (RLS + service
-- role) and the UI masks the password until an admin explicitly reveals it.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ── message_templates ─────────────────────────────────────────────────────
create table if not exists public.message_templates (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  -- Which automation the template belongs to.
  kind         text not null default 'delivery',
  -- Language variant. 'en' | 'ur' (Urdu). More can be added freely.
  language     text not null default 'en',
  -- Scope the template to one product (text slug, matching products.id), or
  -- NULL for "any product". Product-specific templates win in the pickers.
  product_id   text references public.products(id) on delete set null,
  body         text not null,
  active       boolean not null default true,
  -- The template pre-selected in the composer for its (kind, language) pair.
  is_default   boolean not null default false,
  created_by   uuid references public.portal_users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint message_templates_kind_chk
    check (kind in ('delivery', 'renewal_reminder', 'expiry_notice')),
  constraint message_templates_body_chk
    check (length(btrim(body)) > 0)
);

create index if not exists message_templates_kind_idx     on public.message_templates (kind, language, active);
create index if not exists message_templates_product_idx  on public.message_templates (product_id);

create or replace function public.message_templates_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists message_templates_touch on public.message_templates;
create trigger message_templates_touch
  before update on public.message_templates
  for each row execute function public.message_templates_touch_updated_at();

-- ── delivery_messages (the log) ───────────────────────────────────────────
create table if not exists public.delivery_messages (
  id                  uuid primary key default gen_random_uuid(),

  -- Optional links back to what the message was about. Both nullable: a
  -- delivery can be sent ad-hoc, without an order or a tracked sale.
  order_id            uuid references public.orders(id) on delete set null,
  sale_id             uuid references public.subscription_sales(id) on delete set null,

  -- Template used (snapshot the name so history survives a deleted template).
  template_id         uuid references public.message_templates(id) on delete set null,
  template_name       text,
  kind                text not null default 'delivery',
  language            text not null default 'en',

  -- Snapshot of the customer + product at send time.
  customer_name       text,
  customer_phone      text not null,          -- E.164, e.g. +923001234567
  customer_email      text,
  product_id          text,
  product_name        text not null,

  -- 'whatsapp' → sent through the WhatsApp API
  -- 'manual'   → rendered for WhatsApp Web / copy-paste (no API configured)
  -- 'email'    → the same body mailed to customer_email
  channel             text not null default 'whatsapp',
  provider            text,                   -- 'cloud' | 'manual' | 'smtp'
  provider_message_id text,

  message_body        text not null,
  status              text not null default 'pending',
  error               text,

  -- Duplicate guard: sha256 of (kind|phone|product|body), written by the API
  -- so a double-click or a re-submitted form can be detected and refused
  -- unless the admin explicitly confirms the resend.
  dedupe_hash         text,

  sent_by             uuid references public.portal_users(id) on delete set null,
  sent_by_email       text,

  created_at          timestamptz not null default now(),
  sent_at             timestamptz,

  constraint delivery_messages_status_chk
    check (status in ('pending', 'sent', 'failed')),
  constraint delivery_messages_channel_chk
    check (channel in ('whatsapp', 'manual', 'email')),
  constraint delivery_messages_kind_chk
    check (kind in ('delivery', 'renewal_reminder', 'expiry_notice'))
);

create index if not exists delivery_messages_created_idx  on public.delivery_messages (created_at desc);
create index if not exists delivery_messages_phone_idx    on public.delivery_messages (customer_phone);
create index if not exists delivery_messages_order_idx    on public.delivery_messages (order_id);
create index if not exists delivery_messages_sale_idx     on public.delivery_messages (sale_id);
create index if not exists delivery_messages_status_idx   on public.delivery_messages (status);
create index if not exists delivery_messages_dedupe_idx   on public.delivery_messages (dedupe_hash, created_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.message_templates  enable row level security;
alter table public.delivery_messages  enable row level security;

drop policy if exists "message_templates admin read"  on public.message_templates;
drop policy if exists "message_templates admin write" on public.message_templates;
create policy "message_templates admin read"  on public.message_templates for select using (is_admin());
create policy "message_templates admin write" on public.message_templates for all
  using (is_admin()) with check (is_admin());

drop policy if exists "delivery_messages admin read"  on public.delivery_messages;
drop policy if exists "delivery_messages admin write" on public.delivery_messages;
create policy "delivery_messages admin read"  on public.delivery_messages for select using (is_admin());
create policy "delivery_messages admin write" on public.delivery_messages for all
  using (is_admin()) with check (is_admin());

comment on table public.message_templates is
  'Delivery / reminder message templates with {{variable}} placeholders. Scoped by kind, language, and optionally product.';
comment on table public.delivery_messages is
  'Delivery message log. message_body contains the credentials that were sent — admin-only, never exposed publicly.';

-- ── Portal permission keys ────────────────────────────────────────────────
-- Grant the new delivery:* keys to the seeded groups so the feature is
-- usable immediately. Editors intentionally get nothing here (credentials).
update public.portal_groups
   set permissions = (
     select jsonb_agg(distinct k)
       from jsonb_array_elements_text(
         permissions || '["delivery:read","delivery:send","delivery:templates"]'::jsonb
       ) as k
   )
 where name = 'Admins';

update public.portal_groups
   set permissions = (
     select jsonb_agg(distinct k)
       from jsonb_array_elements_text(
         permissions || '["delivery:read","delivery:send"]'::jsonb
       ) as k
   )
 where name = 'Managers';

-- ── Seed templates ────────────────────────────────────────────────────────
-- One default per (kind, language). Only inserted when that pair has no
-- template yet, so re-running the migration never duplicates or overwrites
-- copy the admin has since edited.
insert into public.message_templates (name, kind, language, body, active, is_default)
select 'Subscription delivered (English)', 'delivery', 'en', $tpl$Hello {{customer_name}},

Your {{subscription_name}} subscription has been successfully delivered.

Subscription Details:

Email:
{{email}}

Password:
{{password}}

Subscription Plan:
{{plan_name}}

Activation Date:
{{start_date}}

Renewal Date:
{{renewal_date}}

{{account_details}}

Please do not change the account email or password.

Thank you for choosing {{brand_name}}.

Support:
{{support_email}}$tpl$, true, true
where not exists (
  select 1 from public.message_templates where kind = 'delivery' and language = 'en'
);

insert into public.message_templates (name, kind, language, body, active, is_default)
select 'Subscription delivered (Urdu)', 'delivery', 'ur', $tpl$Assalam o Alaikum {{customer_name}},

Aap ki {{subscription_name}} subscription kamyabi se deliver kar di gayi hai.

Tafseelat:

Email:
{{email}}

Password:
{{password}}

Plan:
{{plan_name}}

Activation date:
{{start_date}}

Renewal date:
{{renewal_date}}

{{account_details}}

Baraye meherbani account ka email ya password tabdeel na karein.

{{brand_name}} ka intekhab karne ka shukriya.

Support:
{{support_email}}$tpl$, true, true
where not exists (
  select 1 from public.message_templates where kind = 'delivery' and language = 'ur'
);

insert into public.message_templates (name, kind, language, body, active, is_default)
select 'Renewal reminder (English)', 'renewal_reminder', 'en', $tpl$Hello {{customer_name}},

A quick reminder that your {{subscription_name}} subscription is due for renewal on {{renewal_date}}.

Renew before then to keep your access running without interruption. Reply to this message and we will take care of it.

Support:
{{support_email}}$tpl$, true, true
where not exists (
  select 1 from public.message_templates where kind = 'renewal_reminder' and language = 'en'
);

insert into public.message_templates (name, kind, language, body, active, is_default)
select 'Renewal reminder (Urdu)', 'renewal_reminder', 'ur', $tpl$Assalam o Alaikum {{customer_name}},

Yaad dehani: aap ki {{subscription_name}} subscription {{renewal_date}} ko renew honi hai.

Bila taatul istemal jari rakhne ke liye us tareekh se pehle renew karwa lein. Is message ka jawab dein, baqi kaam hum sambhal lenge.

Support:
{{support_email}}$tpl$, true, true
where not exists (
  select 1 from public.message_templates where kind = 'renewal_reminder' and language = 'ur'
);

insert into public.message_templates (name, kind, language, body, active, is_default)
select 'Expiry notice (English)', 'expiry_notice', 'en', $tpl$Hello {{customer_name}},

Your {{subscription_name}} subscription expired on {{expiry_date}} and access has now stopped.

Reply to this message to reactivate it — we can usually restore the same account the same day.

Support:
{{support_email}}$tpl$, true, true
where not exists (
  select 1 from public.message_templates where kind = 'expiry_notice' and language = 'en'
);

insert into public.message_templates (name, kind, language, body, active, is_default)
select 'Expiry notice (Urdu)', 'expiry_notice', 'ur', $tpl$Assalam o Alaikum {{customer_name}},

Aap ki {{subscription_name}} subscription {{expiry_date}} ko khatam ho gayi hai aur rasai band ho chuki hai.

Dobara activate karwane ke liye is message ka jawab dein — aam tor par hum usi din wohi account bahal kar dete hain.

Support:
{{support_email}}$tpl$, true, true
where not exists (
  select 1 from public.message_templates where kind = 'expiry_notice' and language = 'ur'
);
