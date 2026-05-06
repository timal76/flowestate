alter table public.users add column if not exists smtp_host text;
alter table public.users add column if not exists smtp_port integer default 587;
alter table public.users add column if not exists smtp_email text;
alter table public.users add column if not exists smtp_password text;
alter table public.users add column if not exists smtp_configured boolean default false;
