-- Contact Messages
-- Run this in Supabase SQL Editor to store contact form submissions.

create table if not exists contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  message    text not null,
  status     text not null default 'unread'
             check (status in ('unread', 'read', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_messages_status_idx on contact_messages(status);
create index if not exists contact_messages_created_at_idx on contact_messages(created_at desc);
create index if not exists contact_messages_email_idx on contact_messages(email);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_contact_messages_updated_at on contact_messages;
create trigger trg_contact_messages_updated_at before update on contact_messages
  for each row execute function set_updated_at();

alter table contact_messages enable row level security;

drop policy if exists "contact messages admin read" on contact_messages;
drop policy if exists "contact messages admin write" on contact_messages;
create policy "contact messages admin read" on contact_messages for select using (is_admin());
create policy "contact messages admin write" on contact_messages for all
  using (is_admin()) with check (is_admin());
