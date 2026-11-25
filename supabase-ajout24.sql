-- =====================================================================
-- AJOUT 24 : contacts des AE pour écrire directement (e-mail / WhatsApp)
-- Direction départementale : tous les AE. Encadreurs (IC, Inspecteur, CP) : AE de leur périmètre.
-- Censeur / Directeur : AE de leur collège.
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor > Run. Sans danger si exécuté deux fois.
-- =====================================================================
create or replace function public.contacts_ae() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e record; r jsonb;
begin
  select * into e from public.encadreurs where lower(email) = public.email_courant();
  select coalesce(jsonb_agg(to_jsonb(x) order by x.etablissement, x.matiere, x.nom), '[]'::jsonb) into r from (
    select et.nom as etablissement, a.matiere, a.nom, a.email, a.whatsapp
    from public.affectations a
    join public.etablissements et on et.id = a.etablissement_id
    where public.est_direction()
       or public.est_censeur(a.etablissement_id)
       or (e.email is not null and (e.role = 'IPD'
            or (a.matiere = e.matiere and (e.commune is null or et.commune = e.commune))))
  ) x;
  return r;
end $$;
revoke execute on function public.contacts_ae() from public, anon;
grant execute on function public.contacts_ae() to authenticated;
