\set ON_ERROR_STOP on

delete from public.panel_payment_requests where id = '00000000-0000-4000-8000-000000000030';
delete from public.panel_orders where user_id = '00000000-0000-4000-8000-000000000001';
delete from public.panel_wallet_transactions where user_id = '00000000-0000-4000-8000-000000000001';
delete from public.panel_services where id = '00000000-0000-4000-8000-000000000020';
delete from public.panel_service_categories where id = '00000000-0000-4000-8000-000000000010';
delete from public.panel_wallets where user_id = '00000000-0000-4000-8000-000000000001';
delete from public.panel_profiles where user_id = '00000000-0000-4000-8000-000000000001';
delete from public.users where id = '00000000-0000-4000-8000-000000000001';

insert into public.users(id, email, name)
values ('00000000-0000-4000-8000-000000000001', 'panel-finance-staging@example.invalid', 'Disposable finance test');
insert into public.panel_profiles(user_id) values ('00000000-0000-4000-8000-000000000001');
insert into public.panel_wallets(user_id, balance) values ('00000000-0000-4000-8000-000000000001', 0);
insert into public.panel_wallet_transactions(user_id, type, amount, note)
values ('00000000-0000-4000-8000-000000000001', 'credit', 100, 'Disposable staging seed');
insert into public.panel_service_categories(id, name, platform)
values ('00000000-0000-4000-8000-000000000010', 'Disposable test', 'other');
insert into public.panel_services(id, category_id, name, rate_per_1000, min_quantity, max_quantity, active)
values ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000010', 'Disposable 75 PKR order', 750, 100, 100, true);
