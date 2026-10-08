\set ON_ERROR_STOP on
delete from public.panel_payment_requests where id = '00000000-0000-4000-8000-000000000030';
delete from public.panel_orders where user_id = '00000000-0000-4000-8000-000000000001';
delete from public.panel_wallet_transactions where user_id = '00000000-0000-4000-8000-000000000001';
delete from public.panel_services where id = '00000000-0000-4000-8000-000000000020';
delete from public.panel_service_categories where id = '00000000-0000-4000-8000-000000000010';
delete from public.panel_wallets where user_id = '00000000-0000-4000-8000-000000000001';
delete from public.panel_profiles where user_id = '00000000-0000-4000-8000-000000000001';
delete from public.users where id = '00000000-0000-4000-8000-000000000001';
