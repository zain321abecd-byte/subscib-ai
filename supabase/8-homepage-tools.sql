-- Admin-controlled visibility for the secondary homepage tools section.
alter table products
  add column if not exists show_on_homepage boolean not null default false;

create index if not exists products_show_on_homepage_idx
  on products(show_on_homepage, sort_order);
