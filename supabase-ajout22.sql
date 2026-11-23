-- Ajout 22 : la sauvegarde et la restauration prennent en compte les groupes WhatsApp et les groupes pédagogiques
-- (corrige l'erreur « Table non autorisée » dans l'onglet Sauvegarde). À coller dans SQL Editor puis Run.

create or replace function public.sauvegarde_table(
  p_table text, p_depuis date default null, p_jusqua date default null,
  p_decalage int default 0, p_taille int default 500, p_secret boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ord text; v_where text := ''; v_res jsonb;
begin
  if not public.est_direction() then raise exception 'Accès refusé'; end if;
  if p_table not in ('etablissements','direction_users','affectations','enseignants','soumissions','stats_evaluations','notations_enseignants',
     'demandes_ae','censeurs','communiques','communique_pdf','parametres','encadreurs',
     'groupes_discipline','groupes_pedagogiques') then
    raise exception 'Table non autorisée'; end if;
  if p_table = 'communique_pdf' and not p_secret then
    return '[]'::jsonb; end if;                       -- les PDF ne sont que dans la sauvegarde complète
  select string_agg(quote_ident(a.attname), ',' order by a.attnum) into v_ord
    from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
   where i.indrelid = ('public.' || quote_ident(p_table))::regclass and i.indisprimary;
  if v_ord is null then v_ord := '1'; end if;
  if p_table = 'soumissions' then
    v_where := format('where date_situation between %L and %L',
      coalesce(p_depuis, date '1900-01-01'), coalesce(p_jusqua, date '2999-12-31'));
  end if;
  execute format('select coalesce(jsonb_agg(j), ''[]''::jsonb) from (select to_jsonb(t) as j from public.%I t %s order by %s offset %s limit %s) s',
    p_table, v_where, v_ord, greatest(p_decalage,0), least(greatest(p_taille,1),1000)) into v_res;
  if p_table = 'enseignants' and not p_secret then
    select coalesce(jsonb_agg(e - 'code_hash' - 'tentatives' - 'bloque_jusqua'), '[]'::jsonb)
      into v_res from jsonb_array_elements(v_res) e;
  end if;
  return v_res;
end $$;
revoke execute on function public.sauvegarde_table(text,date,date,int,int,boolean) from public, anon;
grant execute on function public.sauvegarde_table(text,date,date,int,int,boolean) to authenticated;

-- Restauration d'un paquet de lignes dans une table (ajoute ou met à jour, n'efface jamais rien).
create or replace function public.restaurer_table(p_table text, p_lignes jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_pk text; v_set text; v_cols text; v_n int;
begin
  if not public.est_direction() then raise exception 'Accès refusé'; end if;
  if p_table not in ('etablissements','direction_users','affectations','enseignants','soumissions','stats_evaluations','notations_enseignants',
     'demandes_ae','censeurs','communiques','communique_pdf','parametres','encadreurs',
     'groupes_discipline','groupes_pedagogiques') then
    raise exception 'Table non autorisée'; end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' then raise exception 'Données invalides'; end if;
  if jsonb_array_length(p_lignes) = 0 then return jsonb_build_object('ok', true, 'n', 0); end if;
  select string_agg(quote_ident(a.attname), ',' order by a.attnum) into v_pk
    from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
   where i.indrelid = ('public.' || quote_ident(p_table))::regclass and i.indisprimary;
  select string_agg(quote_ident(a.attname) || ' = excluded.' || quote_ident(a.attname), ', ' order by a.attnum)
    into v_set
    from pg_attribute a
   where a.attrelid = ('public.' || quote_ident(p_table))::regclass and a.attnum > 0 and not a.attisdropped
     and a.attgenerated = ''
     and a.attname not in (select a2.attname from pg_index i2 join pg_attribute a2
          on a2.attrelid = i2.indrelid and a2.attnum = any(i2.indkey)
          where i2.indrelid = ('public.' || quote_ident(p_table))::regclass and i2.indisprimary);
  execute format('insert into public.%I select * from jsonb_populate_recordset(null::public.%I, $1) on conflict (%s) %s',
    p_table, p_table, v_pk, case when v_set is null then 'do nothing' else 'do update set ' || v_set end)
    using p_lignes;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'n', v_n);
end $$;
revoke execute on function public.restaurer_table(text,jsonb) from public, anon;
grant execute on function public.restaurer_table(text,jsonb) to authenticated;
