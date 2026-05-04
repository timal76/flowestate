create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('annonce', 'email', 'compte-rendu')),
  name text not null,
  content text not null,
  created_at timestamp with time zone default now()
);

alter table public.templates enable row level security;

drop policy if exists "Users can manage their own templates" on public.templates;
create policy "Users can manage their own templates"
  on public.templates
  for all
  using (auth.uid()::text = user_id::text)
  with check (auth.uid()::text = user_id::text);
