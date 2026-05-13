alter table public.prospects
  add column if not exists categorie text default 'acheteur'
  check (categorie in ('acheteur', 'vendeur'));

alter table public.generations
  add column if not exists content text;
