-- ===========================================================================
-- 22-whatsapp-cloud-templates.sql
-- Map our message templates onto Meta-approved WhatsApp templates.
--
-- WHY THIS EXISTS
-- The WhatsApp Cloud API only lets you send free-form text to a customer
-- inside a 24-hour "customer service window" that opens when THEY message
-- YOU. A delivery message goes out right after a purchase, so that window is
-- usually closed and Meta rejects the send (error 131047, "re-engagement
-- message"). Business-initiated messages must use a template that Meta has
-- reviewed and approved.
--
-- So each row can now carry the name of its approved Meta template plus the
-- ordered list of variables that fill {{1}}, {{2}}, … in that template's body.
-- When those are set, delivery sends as a template; when they aren't, it falls
-- back to plain text (which still works inside the 24-hour window, and for
-- third-party gateways that don't have this restriction).
-- ===========================================================================

alter table public.message_templates
  add column if not exists wa_template_name     text,
  add column if not exists wa_template_language text not null default 'en_US',
  -- Ordered variable keys, e.g. ["customer_name","subscription_name","email"]
  -- → {{1}} = customer_name, {{2}} = subscription_name, {{3}} = email.
  add column if not exists wa_body_params       jsonb not null default '[]'::jsonb;

comment on column public.message_templates.wa_template_name is
  'Name of the approved template in Meta''s WhatsApp Manager. NULL → send as free-form text (only reaches the customer inside the 24-hour service window).';
comment on column public.message_templates.wa_template_language is
  'Language/locale code of the approved Meta template, e.g. en_US, en, ur.';
comment on column public.message_templates.wa_body_params is
  'JSON array of variable keys, in the order Meta''s template body expects them ({{1}}, {{2}}, …).';

-- Sanity: params must be a JSON array (not an object or scalar).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'message_templates_wa_body_params_chk'
  ) then
    alter table public.message_templates
      add constraint message_templates_wa_body_params_chk
      check (jsonb_typeof(wa_body_params) = 'array');
  end if;
end $$;
