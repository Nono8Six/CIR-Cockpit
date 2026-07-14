-- P5B - Contexte universel pour le fallback SQL de l'assistant.

create or replace function private.ai_to_numeric(value text)
returns numeric
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select nullif(replace(btrim(value), ',', '.'), '')::numeric
$$;

revoke all on function private.ai_to_numeric(text) from public, anon;
grant execute on function private.ai_to_numeric(text) to authenticated, service_role;

comment on function private.ai_to_numeric(text) is
  'Convertit un nombre stocke en texte, avec point ou virgule decimal, en numeric. Une chaine vide devient NULL.';

create or replace view public.ai_v_segments
with (security_invoker = true) as
select
  s.id as segment_id,
  s.snapshot_id,
  s.segment,
  s.idnumerique,
  s.marque,
  s.cat_fab,
  s.cat_fab_l,
  s.strategiq,
  s.codif_fair,
  s.tarif_fab,
  s.segment_key
from public.pricing_supplier_segments s;

create or replace view public.ai_v_segments_active
with (security_invoker = true) as
select
  s.id as segment_id,
  s.segment,
  s.idnumerique,
  s.marque,
  s.cat_fab,
  s.cat_fab_l,
  s.strategiq,
  s.codif_fair,
  s.tarif_fab,
  s.segment_key
from public.pricing_supplier_segments s
join public.pricing_reference_snapshots snap
  on snap.id = s.snapshot_id
 and snap.is_active;

create or replace view public.ai_v_purchase_terms
with (security_invoker = true) as
select
  s.snapshot_id,
  s.id as segment_id,
  s.marque,
  s.cat_fab,
  s.cat_fab_l,
  s.segment,
  s.segment_key,
  g.id as purchase_grid_id,
  g.num_four,
  g.type_grill,
  g.priorite,
  private.ai_to_numeric(g.remise_ha) as remise_ha_pct,
  private.ai_to_numeric(g.borne_acha) as borne_achat_num,
  private.ai_to_numeric(g.coef_retro) as coef_retro_num,
  private.ai_to_numeric(g.coef_ha) as coef_ha_num,
  private.ai_to_numeric(g.coef_majvte) as coef_majvte_num,
  g.date_debut_normalized,
  g.date_fin_normalized
from public.pricing_supplier_segments s
join public.pricing_segment_purchase_grids g
  on g.segment_id = s.id
 and g.snapshot_id = s.snapshot_id;

create or replace view public.ai_v_purchase_terms_active
with (security_invoker = true) as
select
  s.id as segment_id,
  s.marque,
  s.cat_fab,
  s.cat_fab_l,
  s.segment,
  s.segment_key,
  g.id as purchase_grid_id,
  g.num_four,
  g.type_grill,
  g.priorite,
  private.ai_to_numeric(g.remise_ha) as remise_ha_pct,
  private.ai_to_numeric(g.borne_acha) as borne_achat_num,
  private.ai_to_numeric(g.coef_retro) as coef_retro_num,
  private.ai_to_numeric(g.coef_ha) as coef_ha_num,
  private.ai_to_numeric(g.coef_majvte) as coef_majvte_num,
  g.date_debut_normalized,
  g.date_fin_normalized
from public.pricing_supplier_segments s
join public.pricing_segment_purchase_grids g
  on g.segment_id = s.id
 and g.snapshot_id = s.snapshot_id
join public.pricing_reference_snapshots snap
  on snap.id = s.snapshot_id
 and snap.is_active;

revoke all on public.ai_v_segments, public.ai_v_segments_active,
  public.ai_v_purchase_terms, public.ai_v_purchase_terms_active from public, anon;
grant select on public.ai_v_segments, public.ai_v_segments_active,
  public.ai_v_purchase_terms, public.ai_v_purchase_terms_active to authenticated, service_role;

comment on view public.ai_v_segments is
  'Projection lisible des segments fournisseurs de tous les snapshots. Filtrer obligatoirement par snapshot_id pour l historique.';
comment on view public.ai_v_segments_active is
  'Projection des segments fournisseurs du snapshot actif. Aucun filtre snapshot_id supplementaire n est requis.';
comment on view public.ai_v_purchase_terms is
  'Projection historique pre-jointe des segments et conditions d achat, avec valeurs financieres numeric. Filtrer obligatoirement par snapshot_id.';
comment on view public.ai_v_purchase_terms_active is
  'Projection du snapshot actif pre-jointe des segments et conditions d achat. Preferer cette vue aux tables brutes pour trier ou agreger les remises et coefficients.';

comment on column public.ai_v_segments.marque is 'Code marque canonique en majuscules. Resoudre les alias commerciaux avant de filtrer.';
comment on column public.ai_v_segments.cat_fab is 'Code de categorie fabricant, distinct de la famille CIR.';
comment on column public.ai_v_segments.cat_fab_l is 'Libelle de categorie fabricant, a rechercher avec ILIKE pour ignorer la casse.';
comment on column public.ai_v_purchase_terms.remise_ha_pct is 'Remise d achat en pourcentage, deja convertie en numeric et sure pour ORDER BY et les agregats.';
comment on column public.ai_v_purchase_terms.borne_achat_num is 'Borne d achat deja convertie en numeric.';
comment on column public.ai_v_purchase_terms.coef_retro_num is 'Coefficient retro deja converti en numeric.';
comment on column public.ai_v_purchase_terms.coef_ha_num is 'Coefficient d achat deja converti en numeric.';
comment on column public.ai_v_purchase_terms.coef_majvte_num is 'Coefficient de majoration de vente deja converti en numeric.';
comment on column public.ai_v_purchase_terms_active.remise_ha_pct is 'Remise d achat en pourcentage du snapshot actif, de type numeric.';

comment on table public.pricing_reference_imports is 'Imports de referentiels tarifaires. Une ligne suit le cycle d analyse d un lot de fichiers.';
comment on column public.pricing_reference_imports.status is 'Etat technique de l import, de brouillon a archive. Ne pas le confondre avec le statut d un snapshot.';
comment on column public.pricing_reference_imports.health_report is 'Rapport de sante structure de l import au format jsonb.';
comment on column public.pricing_reference_imports.counters is 'Compteurs techniques calcules pendant l analyse, au format jsonb.';

comment on table public.pricing_reference_import_files is 'Fichiers sources rattaches a un import de referentiel. Les chemins de stockage sont techniques et ne sont pas des donnees metier.';
comment on column public.pricing_reference_import_files.import_id is 'Cle etrangere vers pricing_reference_imports.id.';
comment on column public.pricing_reference_import_files.file_kind is 'Type fonctionnel du fichier source dans le lot importe.';
comment on column public.pricing_reference_import_files.original_filename is 'Nom du fichier fourni lors de l import.';
comment on column public.pricing_reference_import_files.row_count is 'Nombre de lignes detectees dans le fichier.';
comment on column public.pricing_reference_import_files.mapping_status is 'Etat de resolution du mapping de colonnes.';

comment on table public.pricing_reference_snapshots is 'Versions immuables du referentiel tarifaire. Une seule version est active ; joindre les tables versionnees par snapshot_id.';
comment on column public.pricing_reference_snapshots.id is 'Identifiant du snapshot, utilise par toutes les tables tarifaires versionnees.';
comment on column public.pricing_reference_snapshots.import_id is 'Import ayant produit ce snapshot.';
comment on column public.pricing_reference_snapshots.status is 'Etat du snapshot : cree, pret_activation, actif ou archive.';
comment on column public.pricing_reference_snapshots.is_active is 'Vrai uniquement pour le snapshot courant a utiliser par defaut.';
comment on column public.pricing_reference_snapshots.activated_at is 'Date et heure d activation du snapshot.';

comment on table public.pricing_classification_cir is 'Hierarchie de classification CIR versionnee : mega, famille et sous-famille. Toujours filtrer par snapshot_id.';
comment on column public.pricing_classification_cir.snapshot_id is 'Version du referentiel ; filtre obligatoire pour une requete historique.';
comment on column public.pricing_classification_cir.mega is 'Code du niveau MEGA de la classification CIR.';
comment on column public.pricing_classification_cir.fam is 'Code famille CIR, distinct de CAT_FAB.';
comment on column public.pricing_classification_cir.sfa is 'Code sous-famille CIR.';
comment on column public.pricing_classification_cir.mega_lib is 'Libelle du niveau MEGA.';
comment on column public.pricing_classification_cir.fam_lib is 'Libelle de la famille CIR.';
comment on column public.pricing_classification_cir.sfa_lib is 'Libelle de la sous-famille CIR.';
comment on column public.pricing_classification_cir.cir_key is 'Cle normalisee de jointure de la classification CIR.';

comment on table public.pricing_supplier_segments is 'Segments fournisseurs versionnes. Pour les conditions d achat, preferer ai_v_purchase_terms_active ou joindre pricing_segment_purchase_grids par (segment_id, snapshot_id).';
comment on column public.pricing_supplier_segments.id is 'Identifiant du segment, a joindre a pricing_segment_purchase_grids.segment_id dans le meme snapshot.';
comment on column public.pricing_supplier_segments.snapshot_id is 'Version du referentiel ; filtre obligatoire sur la table brute.';
comment on column public.pricing_supplier_segments.segment is 'Code ou libelle court du segment fournisseur.';
comment on column public.pricing_supplier_segments.idnumerique is 'Identifiant numerique source conserve en text.';
comment on column public.pricing_supplier_segments.marque is 'Code marque canonique en majuscules. Les noms commerciaux doivent etre resolus en alias avant filtrage.';
comment on column public.pricing_supplier_segments.cat_fab is 'Code CAT_FAB de categorie fabricant, distinct de la famille CIR.';
comment on column public.pricing_supplier_segments.cat_fab_l is 'Libelle CAT_FAB a casse et accents libres ; utiliser ILIKE pour une recherche textuelle.';
comment on column public.pricing_supplier_segments.segment_key is 'Cle normalisee stable du segment dans un snapshot.';

comment on table public.pricing_segment_classification_links is 'Liens versionnes entre segments fournisseurs et classification CIR. Toujours joindre segment_id et respecter snapshot_id.';
comment on column public.pricing_segment_classification_links.snapshot_id is 'Version du referentiel ; filtre obligatoire.';
comment on column public.pricing_segment_classification_links.segment_id is 'Segment fournisseur lie.';
comment on column public.pricing_segment_classification_links.classification_id is 'Classification CIR liee ; NULL si la resolution a echoue.';
comment on column public.pricing_segment_classification_links.mega_famille is 'Valeur source du niveau MEGA.';
comment on column public.pricing_segment_classification_links.famille is 'Valeur source de famille CIR, distincte de CAT_FAB.';
comment on column public.pricing_segment_classification_links.sous_famille is 'Valeur source de sous-famille CIR.';
comment on column public.pricing_segment_classification_links.link_status is 'Qualite de la resolution du lien vers la classification CIR.';

comment on table public.pricing_segment_purchase_grids is 'Conditions d achat versionnees par segment fournisseur. Preferer ai_v_purchase_terms_active ; sinon joindre pricing_supplier_segments par (segment_id, snapshot_id).';
comment on column public.pricing_segment_purchase_grids.snapshot_id is 'Version du referentiel ; filtre obligatoire sur la table brute.';
comment on column public.pricing_segment_purchase_grids.segment_id is 'Segment fournisseur ; la jointure doit aussi egaler snapshot_id.';
comment on column public.pricing_segment_purchase_grids.num_four is 'Numero fournisseur source conserve en text.';
comment on column public.pricing_segment_purchase_grids.remise_ha is 'Remise d achat en pourcentage stockee en text a point decimal, avec possibles artefacts de flottant. Ne jamais trier cette colonne brute ; utiliser ai_v_purchase_terms*.remise_ha_pct.';
comment on column public.pricing_segment_purchase_grids.borne_acha is 'Borne d achat stockee en text. Utiliser borne_achat_num dans une vue ai_v_purchase_terms*.';
comment on column public.pricing_segment_purchase_grids.coef_retro is 'Coefficient retro stocke en text. Utiliser coef_retro_num dans une vue ai_v_purchase_terms*.';
comment on column public.pricing_segment_purchase_grids.coef_ha is 'Coefficient d achat stocke en text. Utiliser coef_ha_num dans une vue ai_v_purchase_terms*.';
comment on column public.pricing_segment_purchase_grids.coef_majvte is 'Coefficient de majoration de vente stocke en text. Utiliser coef_majvte_num dans une vue ai_v_purchase_terms*.';
comment on column public.pricing_segment_purchase_grids.date_debut_normalized is 'Date de debut normalisee mais conservee en text.';
comment on column public.pricing_segment_purchase_grids.date_fin_normalized is 'Date de fin normalisee mais conservee en text.';

comment on table public.pricing_reference_anomalies is 'Anomalies detectees pendant l analyse d un referentiel. Les lignes sont rattachees a un import et eventuellement a un snapshot.';
comment on column public.pricing_reference_anomalies.import_id is 'Import pendant lequel l anomalie a ete detectee.';
comment on column public.pricing_reference_anomalies.snapshot_id is 'Snapshot concerne, nullable avant sa creation.';
comment on column public.pricing_reference_anomalies.type is 'Categorie technique de l anomalie.';
comment on column public.pricing_reference_anomalies.severity is 'Niveau de severite normalise.';
comment on column public.pricing_reference_anomalies.message is 'Explication factuelle de l anomalie.';

comment on table public.pricing_reference_diffs is 'Ecarts calcules entre un snapshot cible et un snapshot de base. Les valeurs detaillees sont dans payload jsonb.';
comment on column public.pricing_reference_diffs.base_snapshot_id is 'Snapshot de comparaison ; NULL pour un import initial.';
comment on column public.pricing_reference_diffs.target_snapshot_id is 'Snapshot cible de la comparaison.';
comment on column public.pricing_reference_diffs.diff_type is 'Nature de l ecart : ajout, modification ou suppression selon le contrat applicatif.';
comment on column public.pricing_reference_diffs.object_type is 'Type d objet tarifaire compare.';
comment on column public.pricing_reference_diffs.changed_columns is 'Liste des colonnes modifiees.';
comment on column public.pricing_reference_diffs.payload is 'Avant, apres et deltas structures au format jsonb.';

comment on table public.interactions is 'Interactions CRM isolees par agence via RLS. Toute requete utilisateur herite de cette isolation ; ne pas inventer de filtre agency_id.';
comment on column public.interactions.agency_id is 'Agence proprietaire, protegee par RLS.';
comment on column public.interactions.entity_id is 'Entite CRM concernee par l interaction.';
comment on column public.interactions.contact_id is 'Contact concerne, nullable.';
comment on column public.interactions.channel is 'Canal de l interaction.';
comment on column public.interactions.subject is 'Objet factuel de l interaction.';
comment on column public.interactions.status is 'Libelle de statut historise avec status_id.';
comment on column public.interactions.amount is 'Montant d opportunite de type numeric, nullable.';
comment on column public.interactions.stage is 'Etape commerciale de l opportunite, nullable.';
comment on column public.interactions.created_at is 'Date et heure de creation.';

comment on table public.entities is 'Entites CRM clientes ou fournisseurs, isolees par agence via RLS. Les entites globales peuvent avoir agency_id NULL selon les regles metier.';
comment on column public.entities.entity_type is 'Type fonctionnel de l entite.';
comment on column public.entities.client_kind is 'Nature personne morale ou physique pour une entite cliente.';
comment on column public.entities.name is 'Nom d affichage de l entite.';
comment on column public.entities.agency_id is 'Agence proprietaire, protegee par RLS ; peut etre NULL pour une entite globale autorisee.';
comment on column public.entities.siret is 'Identifiant SIRET conserve en text pour preserver les zeros initiaux.';
comment on column public.entities.siren is 'Identifiant SIREN conserve en text pour preserver les zeros initiaux.';
comment on column public.entities.archived_at is 'NULL pour une entite active, date renseignee pour une entite archivee.';

comment on table public.entity_contacts is 'Contacts rattaches aux entites CRM. La visibilite est protegee par les RLS de la relation metier.';
comment on column public.entity_contacts.entity_id is 'Entite CRM proprietaire du contact.';
comment on column public.entity_contacts.first_name is 'Prenom du contact, nullable.';
comment on column public.entity_contacts.last_name is 'Nom du contact.';
comment on column public.entity_contacts.email is 'Adresse de courrier electronique, nullable.';
comment on column public.entity_contacts.phone is 'Numero de telephone conserve en text.';
comment on column public.entity_contacts.is_primary is 'Indique le contact principal de l entite.';
comment on column public.entity_contacts.archived_at is 'NULL pour un contact actif, date renseignee pour un contact archive.';

-- Le prompt publie conserve le catalogue complet en secours mais privilegie la recherche ciblee.
do $$
declare
  assistant_template_id uuid;
  published_body text;
  next_version integer;
begin
  select t.id, v.body
  into assistant_template_id, published_body
  from public.ai_prompt_templates t
  join public.ai_prompt_versions v on v.template_id = t.id
  where t.feature = 'assistant.referentiels'
    and t.archived_at is null
    and v.status = 'published'
  limit 1;

  if assistant_template_id is null or published_body is null then
    raise exception 'Prompt publie assistant.referentiels introuvable.';
  end if;

  if not exists (
    select 1 from public.ai_prompt_versions
    where template_id = assistant_template_id
      and change_note = 'P5B : search_schema avant le catalogue complet'
  ) then
    select coalesce(max(version), 0) + 1
    into next_version
    from public.ai_prompt_versions
    where template_id = assistant_template_id;

    update public.ai_prompt_versions
    set status = 'archived'
    where template_id = assistant_template_id
      and status = 'published';

    insert into public.ai_prompt_versions(
      template_id, version, status, body, change_note, published_at
    ) values (
      assistant_template_id,
      next_version,
      'published',
      replace(
        published_body,
        'Commence par get_database_catalog si les tables utiles sont inconnues, puis appelle describe_database_tables sur les tables candidates avant d ecrire le SQL.',
        'Commence par search_schema avec 1 a 5 termes metier si les tables utiles sont inconnues. Appelle ensuite describe_database_tables sur les tables candidates avant d ecrire le SQL. Utilise get_database_catalog uniquement si la recherche ciblee ne retourne aucune piste exploitable.'
      ),
      'P5B : search_schema avant le catalogue complet',
      now()
    );
  end if;
end;
$$;
