-- Ajout 23 : l'AE peut corriger les statistiques d'évaluations ; la correction est tracée et visible par la Direction
-- À coller dans SQL Editor puis Run. Peut être relancé sans danger.

alter table public.stats_evaluations add column if not exists modifie_par text;
alter table public.stats_evaluations add column if not exists modifie_le timestamptz;

-- Quand l'AE change la classe ou un chiffre, la ligne est marquée « modifiée par l'AE ».
-- Quand l'enseignant renvoie lui-même ses chiffres, la marque disparaît.
create or replace function public.stats_marquer_modif() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.classe_code is distinct from old.classe_code or new.division is distinct from old.division
     or new.classe_formulaire is distinct from old.classe_formulaire
     or new.g_sup is distinct from old.g_sup or new.f_sup is distinct from old.f_sup
     or new.g_inf is distinct from old.g_inf or new.f_inf is distinct from old.f_inf
     or new.g_max is distinct from old.g_max or new.f_max is distinct from old.f_max
     or new.g_min is distinct from old.g_min or new.f_min is distinct from old.f_min then
    if coalesce(public.email_courant(),'') <> '' then
      new.modifie_par := public.email_courant(); new.modifie_le := now(); new.maj_le := now();
    else
      new.modifie_par := null; new.modifie_le := null;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists stats_modif on public.stats_evaluations;
create trigger stats_modif before update on public.stats_evaluations
  for each row execute function public.stats_marquer_modif();

-- La vue lue par l'AE, le censeur et la Direction expose la marque (colonnes ajoutées à la fin)
create or replace view public.stats_vue as
  select s.id, s.etablissement_id, et.nom as etablissement, et.commune, s.matiere,
         ens.matricule, ens.nom as enseignant, s.classe_code, s.classe_formulaire, s.division,
         s.semestre, s.type_eval, s.g_sup, s.f_sup, s.g_inf, s.f_inf, s.g_max, s.f_max, s.g_min, s.f_min,
         s.statut, s.saisi_par, s.maj_le, s.valide_le, s.valide_par, s.modifie_par, s.modifie_le
  from public.stats_evaluations s
  join public.etablissements et on et.id = s.etablissement_id
  join public.enseignants ens on ens.id = s.enseignant_id
  where public.est_ae(s.etablissement_id, s.matiere)
     or (s.statut = 'valide' and (public.est_direction() or public.est_censeur(s.etablissement_id)));
revoke all on public.stats_vue from anon;
grant select on public.stats_vue to authenticated;
-- Les droits de modification et de suppression de l'AE existent déjà (ajout13) : rien d'autre à ouvrir.
