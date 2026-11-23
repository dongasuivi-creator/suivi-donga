-- ajout17 : bande d'annonces défilante (visible par tous, modifiable par la Direction)
create table if not exists public.bandeau (
  id uuid primary key default gen_random_uuid(),
  texte text not null check (char_length(texte) between 3 and 200),
  actif boolean not null default true,
  ordre int not null default 0,
  maj_le timestamptz not null default now()
);
alter table public.bandeau enable row level security;
grant select on public.bandeau to anon, authenticated;
grant insert, update, delete on public.bandeau to authenticated;
drop policy if exists bandeau_lecture on public.bandeau;
create policy bandeau_lecture on public.bandeau for select to anon, authenticated using (actif);
drop policy if exists bandeau_dir on public.bandeau;
create policy bandeau_dir on public.bandeau for all to authenticated
  using (public.est_direction()) with check (public.est_direction());
