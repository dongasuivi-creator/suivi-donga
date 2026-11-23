-- Ajout 18 : historique personnel d'un enseignant (courbe de progression)
create or replace function public.mon_historique(p_whatsapp text, p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_res jsonb;
begin
  v_id := public._verifier_enseignant(p_whatsapp, p_code);
  if v_id is null then return jsonb_build_object('ok', false, 'message', 'Identifiants invalides'); end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'classe_code', classe_code, 'classe_formulaire', classe_formulaire, 'division', division,
      'semaine', semaine, 'taux_prevu', taux_prevu, 'taux_realise', taux_realise,
      'ecart', ecart, 'etat', etat, 'statut', statut) order by classe_formulaire, division, semaine), '[]'::jsonb)
    into v_res
    from public.soumissions where enseignant_id = v_id and statut <> 'rejete';
  return jsonb_build_object('ok', true, 'lignes', v_res);
end $$;
revoke execute on function public.mon_historique(text,text) from public;
grant execute on function public.mon_historique(text,text) to anon, authenticated;

-- Délai de validation : ajoute la date d'envoi à la vue des points validés (colonne ajoutée à la fin)
create or replace view public.points_valides with (security_invoker = true) as
  select s.id, et.nom as etablissement, s.matiere, ens.matricule, ens.nom as enseignant,
         s.classe_formulaire, s.division, s.semaine, s.date_situation,
         s.taux_prevu, s.taux_realise, s.ecart, s.etat, s.motif, s.valide_le, s.valide_par, s.cree_le
  from public.soumissions s
  join public.etablissements et on et.id = s.etablissement_id
  join public.enseignants ens on ens.id = s.enseignant_id
  where s.statut = 'valide';
grant select on public.points_valides to authenticated;
