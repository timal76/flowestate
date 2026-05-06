alter table public.prospects
  add column if not exists temperature text default 'tiède'
  check (temperature in ('chaud', 'tiède', 'froid'));
