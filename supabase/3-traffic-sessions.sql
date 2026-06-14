-- Live first-party traffic analytics for /admin/traffic.
-- Idempotent: safe to run multiple times in the Supabase SQL editor.

create table if not exists traffic_sessions (
  session_id   text primary key,
  first_seen   timestamptz not null default now(),
  last_seen    timestamptz not null default now(),
  pageviews    int not null default 0,
  source       text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  referrer     text,
  landing_page text,
  last_page    text,
  user_id      uuid references auth.users(id) on delete set null,
  user_email   text,
  browser      text,
  os           text,
  device_type  text,
  platform     text,
  user_agent   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists traffic_sessions_last_seen_idx on traffic_sessions(last_seen desc);
create index if not exists traffic_sessions_first_seen_idx on traffic_sessions(first_seen desc);
create index if not exists traffic_sessions_source_idx on traffic_sessions(source);
create index if not exists traffic_sessions_user_email_idx on traffic_sessions(user_email);

alter table traffic_sessions enable row level security;

drop policy if exists "traffic sessions admin read" on traffic_sessions;
create policy "traffic sessions admin read" on traffic_sessions
  for select using (is_admin());
