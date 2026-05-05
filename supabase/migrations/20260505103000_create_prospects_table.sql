create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  nom text not null,
  telephone text,
  email text,
  statut text not null default 'Nouveau' check (statut in ('Nouveau', 'Contacté', 'Visite planifiée', 'Offre faite', 'Signé', 'Perdu')),
  budget text,
  type_bien text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.prospects enable row level security;

drop policy if exists "Users can manage their own prospects" on public.prospects;
create policy "Users can manage their own prospects"
  on public.prospects
  for all
  using (true)
  with check (true);

alter table public.generations
  add column if not exists prospect_id uuid references public.prospects(id) on delete set null;
