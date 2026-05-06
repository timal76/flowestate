create table if not exists public.relances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  titre text not null,
  message text,
  scheduled_at timestamp with time zone not null,
  sent_at timestamp with time zone,
  statut text not null default 'planifiée' check (statut in ('planifiée', 'envoyée', 'annulée')),
  type text not null default 'email' check (type in ('email', 'rappel', 'les deux')),
  prospect_email text,
  created_at timestamp with time zone default now()
);

alter table public.relances enable row level security;

drop policy if exists "Users can manage their own relances" on public.relances;
create policy "Users can manage their own relances"
  on public.relances
  for all
  using (true)
  with check (true);
