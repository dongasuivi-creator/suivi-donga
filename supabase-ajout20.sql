-- Ajout 20 : « Groupe de ma discipline » (liens des groupes WhatsApp par discipline et par collège)
-- À coller dans SQL Editor puis Run. Peut être relancé sans danger.

create table if not exists public.groupes_discipline (
  id uuid primary key default gen_random_uuid(),
  matiere text not null,
  etablissement_id uuid references public.etablissements(id) on delete cascade,  -- vide = tout le département
  lien text not null check (char_length(lien) between 20 and 300),
  maj_le timestamptz not null default now(),
  maj_par text
);
create unique index if not exists groupes_discipline_uniq
  on public.groupes_discipline (matiere, coalesce(etablissement_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.groupes_discipline enable row level security;
grant select on public.groupes_discipline to authenticated;
drop policy if exists groupes_lecture on public.groupes_discipline;
create policy groupes_lecture on public.groupes_discipline for select to authenticated using (public.est_direction());

-- Enregistrer ou remplacer un lien (Direction, ou AE de ce collège et de cette discipline)
create or replace function public.definir_groupe(p_matiere text, p_etab uuid, p_lien text) returns void
language plpgsql security definer set search_path = public as $$
declare v_lien text := trim(coalesce(p_lien,''));
begin
  if not (public.est_direction() or (p_etab is not null and public.est_ae(p_etab, p_matiere))) then
    raise exception 'Action non autorisée';
  end if;
  if v_lien !~* '^https://(chat\.whatsapp\.com/|whatsapp\.com/channel/)[A-Za-z0-9_-]+' then
    raise exception 'Lien WhatsApp invalide : il doit commencer par https://chat.whatsapp.com/';
  end if;
  if coalesce(trim(p_matiere),'') = '' then raise exception 'Discipline manquante'; end if;
  update public.groupes_discipline set lien = v_lien, maj_le = now(), maj_par = public.email_courant()
   where matiere = p_matiere and etablissement_id is not distinct from p_etab;
  if not found then
    insert into public.groupes_discipline(matiere, etablissement_id, lien, maj_par)
    values (p_matiere, p_etab, v_lien, public.email_courant());
  end if;
end $$;

create or replace function public.supprimer_groupe(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g record;
begin
  select * into g from public.groupes_discipline where id = p_id;
  if not found then return; end if;
  if not (public.est_direction() or (g.etablissement_id is not null and public.est_ae(g.etablissement_id, g.matiere))) then
    raise exception 'Action non autorisée';
  end if;
  delete from public.groupes_discipline where id = p_id;
end $$;

-- Liens utiles pour un collège (et une discipline, ou toutes si p_matiere est vide). Le lien du collège l'emporte sur celui du département.
create or replace function public._groupes_pour(p_etab uuid, p_matiere text)
returns table(id uuid, matiere text, lien text, portee text, editable boolean)
language sql stable security definer set search_path = public as $$
  select distinct on (g.matiere) g.id, g.matiere, g.lien,
         case when g.etablissement_id is null then 'departement' else 'college' end,
         false
  from public.groupes_discipline g
  where (g.etablissement_id = p_etab or g.etablissement_id is null)
    and (p_matiere is null or g.matiere = p_matiere)
  order by g.matiere, (g.etablissement_id is null)
$$;
revoke execute on function public._groupes_pour(uuid, text) from public, anon, authenticated;

-- AE, censeur, directeur ou Direction (connectés par e-mail)
create or replace function public.groupes_ae(p_etab uuid, p_matiere text)
returns table(id uuid, matiere text, lien text, portee text, editable boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.est_direction() or (p_matiere is not null and public.est_ae(p_etab, p_matiere)) then
    return query select r.id, r.matiere, r.lien, r.portee, (r.portee='college' and public.est_ae(p_etab, r.matiere)) or public.est_direction()
                 from public._groupes_pour(p_etab, p_matiere) r;
  elsif public.est_censeur(p_etab) or public.est_directeur(p_etab) then
    return query select r.id, r.matiere, r.lien, r.portee, false from public._groupes_pour(p_etab, null) r;
  else
    raise exception 'Accès refusé';
  end if;
end $$;
grant execute on function public.groupes_ae(uuid, text) to authenticated;
grant execute on function public.definir_groupe(text, uuid, text) to authenticated;
grant execute on function public.supprimer_groupe(uuid) to authenticated;

-- Enseignant (numéro WhatsApp + code)
create or replace function public.groupes_enseignant(p_whatsapp text, p_code text)
returns table(id uuid, matiere text, lien text, portee text, editable boolean)
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; e record;
begin
  v_id := public._verifier_enseignant(p_whatsapp, p_code);
  if v_id is null then raise exception 'Identifiants invalides'; end if;
  select * into e from public.enseignants where enseignants.id = v_id;
  return query select r.id, r.matiere, r.lien, r.portee, false from public._groupes_pour(e.etablissement_id, e.matiere) r;
end $$;
revoke execute on function public.groupes_enseignant(text, text) from public;
grant execute on function public.groupes_enseignant(text, text) to anon, authenticated;
