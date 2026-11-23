-- Ajout 21 : nombre de groupes pédagogiques (classes) par niveau et par collège
-- À coller dans SQL Editor puis Run. Peut être relancé sans danger.

create table if not exists public.groupes_pedagogiques (
  etablissement_id uuid not null references public.etablissements(id) on delete cascade,
  classe_code text not null,
  nb int not null check (nb between 1 and 30),
  maj_le timestamptz not null default now(),
  maj_par text,
  primary key (etablissement_id, classe_code)
);
alter table public.groupes_pedagogiques enable row level security;
revoke all on public.groupes_pedagogiques from anon;

-- Membre de l'équipe du collège : Direction, censeur, directeur ou AE (toute discipline)
create or replace function public._est_equipe(p_etab uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.est_direction() or public.est_censeur(p_etab) or public.est_directeur(p_etab)
      or exists (select 1 from public.affectations a
                 where lower(a.email) = public.email_courant() and a.etablissement_id = p_etab)
$$;
revoke execute on function public._est_equipe(uuid) from public, anon, authenticated;

-- Enregistrer le nombre de groupes d'un niveau (p_nb vide = retour au réglage par défaut)
create or replace function public.definir_nb_groupes(p_etab uuid, p_classe text, p_nb int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public._est_equipe(p_etab) then raise exception 'Action non autorisée'; end if;
  if coalesce(trim(p_classe),'') = '' then raise exception 'Niveau manquant'; end if;
  if p_nb is null then
    delete from public.groupes_pedagogiques where etablissement_id = p_etab and classe_code = p_classe;
    return;
  end if;
  if p_nb < 1 or p_nb > 30 then raise exception 'Le nombre de groupes doit être entre 1 et 30'; end if;
  insert into public.groupes_pedagogiques(etablissement_id, classe_code, nb, maj_par)
  values (p_etab, p_classe, p_nb, public.email_courant())
  on conflict (etablissement_id, classe_code)
  do update set nb = excluded.nb, maj_le = now(), maj_par = excluded.maj_par;
end $$;
grant execute on function public.definir_nb_groupes(uuid, text, int) to authenticated;

-- Lecture pour l'équipe du collège
create or replace function public.nb_groupes_ae(p_etab uuid) returns table(classe_code text, nb int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public._est_equipe(p_etab) then raise exception 'Accès refusé'; end if;
  return query select g.classe_code, g.nb from public.groupes_pedagogiques g where g.etablissement_id = p_etab;
end $$;
grant execute on function public.nb_groupes_ae(uuid) to authenticated;

-- Lecture pour un enseignant (numéro WhatsApp + code)
create or replace function public.nb_groupes_enseignant(p_whatsapp text, p_code text)
returns table(classe_code text, nb int)
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_etab uuid;
begin
  v_id := public._verifier_enseignant(p_whatsapp, p_code);
  if v_id is null then raise exception 'Identifiants invalides'; end if;
  select e.etablissement_id into v_etab from public.enseignants e where e.id = v_id;
  return query select g.classe_code, g.nb from public.groupes_pedagogiques g where g.etablissement_id = v_etab;
end $$;
revoke execute on function public.nb_groupes_enseignant(text, text) from public;
grant execute on function public.nb_groupes_enseignant(text, text) to anon, authenticated;
