-- ===========================================================================
-- 26-email-logs.sql
-- Email delivery log.
--
-- The backend has always written to email_logs (EmailService.sendEmail stamps
-- a `pending` row, then flips it to `sent` or `failed`), but no migration ever
-- created the table — and the insert is wrapped in try/catch as "non-fatal",
-- so on a database without it every send logged nothing, silently. That is why
-- there was no trail to look at when mail stopped arriving.
--
-- Safe to run whether or not the table already exists.
-- ===========================================================================

create extension if not exists pgcrypto;

create table if not exists public.email_logs (
  id                  uuid primary key default gen_random_uuid(),
  -- transactional | promotion | verification | welcome | order_confirmation |
  -- admin_order_alert | request_ack | admin_request_alert | …
  email_type          text not null default 'transactional',
  recipient_email     text not null,
  subject             text,
  status              text not null default 'pending',
  provider            text default 'smtp',
  provider_message_id text,
  error_message       text,
  related_order_id    uuid,
  sent_at             timestamptz,
  created_at          timestamptz not null default now(),

  constraint email_logs_status_chk check (status in ('pending', 'sent', 'failed'))
);

-- Columns added defensively, for a table created by an older hand-run script.
alter table public.email_logs
  add column if not exists email_type          text not null default 'transactional',
  add column if not exists recipient_email     text,
  add column if not exists subject             text,
  add column if not exists status              text not null default 'pending',
  add column if not exists provider            text default 'smtp',
  add column if not exists provider_message_id text,
  add column if not exists error_message       text,
  add column if not exists related_order_id    uuid,
  add column if not exists sent_at             timestamptz,
  add column if not exists created_at          timestamptz not null default now();

create index if not exists email_logs_created_idx   on public.email_logs (created_at desc);
create index if not exists email_logs_status_idx    on public.email_logs (status, created_at desc);
create index if not exists email_logs_recipient_idx on public.email_logs (recipient_email);
create index if not exists email_logs_type_idx      on public.email_logs (email_type);

-- ── RLS ───────────────────────────────────────────────────────────────────
-- Admin-only: these rows carry customer addresses and subject lines. The
-- backend writes with the service role, which bypasses RLS.
alter table public.email_logs enable row level security;

drop policy if exists "email_logs admin read"  on public.email_logs;
drop policy if exists "email_logs admin write" on public.email_logs;
create policy "email_logs admin read"  on public.email_logs for select using (is_admin());
create policy "email_logs admin write" on public.email_logs for all
  using (is_admin()) with check (is_admin());

comment on table public.email_logs is
  'Every email the system attempted: pending on queue, then sent or failed with the reason. Powers /admin/email/logs.';
