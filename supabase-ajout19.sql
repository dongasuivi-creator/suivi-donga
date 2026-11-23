-- Ajout 19 : un seul code pour un enseignant présent dans plusieurs collèges ou disciplines
-- À coller dans SQL Editor puis Run. Peut être relancé sans danger.

-- 1) Vérification du code. Accepte « numéro » ou « numéro#identifiant » (pour choisir la ligne).
--    Une ligne dont le code ne correspond pas n'est plus pénalisée tant que le code est bon pour une autre ligne.
create or replace function public._verifier_enseignant(p_whatsapp text, p_code text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare r record; v_brut text := coalesce(p_whatsapp,''); v_num text; v_cible uuid; v_ok uuid;
begin
  v_num := regexp_replace(split_part(v_brut,'#',1), '\D', '', 'g');
  if position('#' in v_brut) > 0 then
    begin v_cible := nullif(trim(split_part(v_brut,'#',2)),'')::uuid;
    exception when others then return null; end;
  end if;
  for r in select * from public.enseignants
           where whatsapp = v_num and actif and code_hash is not null and (v_cible is null or id = v_cible)
           order by id loop
    if r.bloque_jusqua is not null and r.bloque_jusqua > now() then continue; end if;
    if crypt(coalesce(p_code,''), r.code_hash) = r.code_hash then
      update public.enseignants set tentatives = 0 where id = r.id;
      v_ok := r.id;
    end if;
  end loop;
  if v_ok is null then
    update public.enseignants set
      tentatives = case when tentatives + 1 >= 5 then 0 else tentatives + 1 end,
      bloque_jusqua = case when tentatives + 1 >= 5 then now() + interval '15 minutes' else bloque_jusqua end
    where whatsapp = v_num and actif and code_hash is not null and (v_cible is null or id = v_cible)
      and (bloque_jusqua is null or bloque_jusqua <= now());
  end if;
  return v_ok;
end $$;

-- 2) Connexion : renvoie aussi la liste de toutes les inscriptions qui acceptent ce code
create or replace function public.connexion_enseignant(p_whatsapp text, p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; r jsonb; v_aff jsonb; v_autres int; v_num text := regexp_replace(split_part(coalesce(p_whatsapp,''),'#',1), '\D', '', 'g');
begin
  v_id := public._verifier_enseignant(p_whatsapp, p_code);
  if v_id is null then return jsonb_build_object('ok', false, 'message', 'Numéro ou code incorrect, ou compte bloqué quelques minutes'); end if;
  select jsonb_build_object('ok', true, 'id', e.id, 'nom', e.nom, 'matricule', e.matricule, 'matiere', e.matiere, 'etablissement', et.nom)
    into r from public.enseignants e join public.etablissements et on et.id = e.etablissement_id where e.id = v_id;
  select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'nom', e.nom, 'matricule', e.matricule, 'matiere', e.matiere, 'etablissement', et.nom) order by et.nom, e.matiere), '[]'::jsonb)
    into v_aff from public.enseignants e join public.etablissements et on et.id = e.etablissement_id
    where e.whatsapp = v_num and e.actif and e.code_hash is not null and crypt(coalesce(p_code,''), e.code_hash) = e.code_hash;
  select count(*) into v_autres from public.enseignants e
    where e.whatsapp = v_num and e.actif and e.code_hash is not null and crypt(coalesce(p_code,''), e.code_hash) <> e.code_hash;
  return r || jsonb_build_object('affectations', v_aff, 'autres', v_autres);
end $$;

-- 3) Relier les autres inscriptions (ancien code) au code actuel
create or replace function public.relier_affectations(p_whatsapp text, p_code text, p_ancien text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_num text := regexp_replace(split_part(coalesce(p_whatsapp,''),'#',1), '\D', '', 'g'); v_n int;
begin
  v_id := public._verifier_enseignant(v_num, p_code);
  if v_id is null then return jsonb_build_object('ok', false, 'message', 'Numéro ou code incorrect'); end if;
  if length(coalesce(p_ancien,'')) < 4 then return jsonb_build_object('ok', false, 'message', 'Saisissez l''ancien code'); end if;
  update public.enseignants set code_hash = crypt(p_code, gen_salt('bf')), tentatives = 0, bloque_jusqua = null
    where whatsapp = v_num and actif and code_hash is not null
      and crypt(p_ancien, code_hash) = code_hash and crypt(p_code, code_hash) <> code_hash;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    update public.enseignants set
      tentatives = case when tentatives + 1 >= 5 then 0 else tentatives + 1 end,
      bloque_jusqua = case when tentatives + 1 >= 5 then now() + interval '15 minutes' else bloque_jusqua end
    where whatsapp = v_num and actif and (bloque_jusqua is null or bloque_jusqua <= now());
    return jsonb_build_object('ok', false, 'message', 'Cet ancien code ne correspond à aucune autre inscription de ce numéro');
  end if;
  return jsonb_build_object('ok', true, 'n', v_n);
end $$;

-- 4) Quand un AE ajoute un enseignant dont le numéro existe déjà ailleurs : même code
create or replace function public.copier_code(p_ens uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_etab uuid; v_mat text; v_wa text; v_h text;
begin
  select etablissement_id, matiere, whatsapp into v_etab, v_mat, v_wa from public.enseignants where id = p_ens;
  if v_etab is null or not public.est_ae(v_etab, v_mat) then raise exception 'Accès refusé'; end if;
  select code_hash into v_h from public.enseignants
    where whatsapp = v_wa and id <> p_ens and actif and code_hash is not null order by id limit 1;
  if v_h is null then return jsonb_build_object('ok', true, 'copie', false); end if;
  update public.enseignants set code_hash = v_h, tentatives = 0, bloque_jusqua = null where id = p_ens;
  return jsonb_build_object('ok', true, 'copie', true);
end $$;

grant execute on function public.connexion_enseignant(text, text) to anon, authenticated;
grant execute on function public.relier_affectations(text, text, text) to anon, authenticated;
grant execute on function public.copier_code(uuid) to authenticated;
