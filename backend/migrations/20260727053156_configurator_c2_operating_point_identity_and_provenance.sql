-- Configurateurs C2 - correctif d'identite du point de fonctionnement,
-- de portage du couple maximal, de frequence des correlations et d'edition
-- documentaire.
--
-- Motif, etabli par le dry-run C2 (`docs/CONFIGURATEURS/c2/controles.json`) :
--
--   B1  `cir.motor.identity-discriminator/v1` ne repose que sur l'inertie et la
--       masse. 85 identites de point recevaient plusieurs lignes publiees, soit
--       93 points perdus. Le model_key reste independant des variantes : c'est
--       l'identite du point qui recoit les faits publies qui la distinguent,
--       `power_kw`, `efficiency_class` et `variant_key`. Le terme `variant_key`
--       est celui verrouille par C0 et deja expose par le contrat Zod partage
--       (`motorCandidateSchema.variant_key`) : il descend de `motor_model` vers
--       `motor_operating_point`, il n'est pas remplace par un nouveau nom.
--   B2  `motor_model.max_torque_nm` etait une colonne de modele alors que le
--       catalogue Dyneo publie un couple maximal par calibre : 13 modeles
--       `LSHRM`/`PLSHRM` portaient des valeurs contradictoires.
--   B3  `motor_vendor_correlation` n'avait pas de frequence alors que les 599
--       correlations sont publiees par paires 50 Hz / 60 Hz sur deux pages :
--       202 lignes s'ecrasaient sur la contrainte d'unicite.
--   B4  `source_document.edition_label` etait obligatoire alors que le
--       catalogue Bonfiglioli n'imprime aucune reference d'edition.
--
-- Migration additive et transactionnelle. Les 20 tables `configurator` sont
-- vides a l'exception des 13 codes de `motor_dimension_canonical`, qui n'est pas
-- touchee : aucune donnee n'est reecrite, aucune valeur n'est deduite.
--
-- Verifie avant redaction : aucune politique RLS, aucune fonction, aucun index
-- et aucune cle etrangere ne reference `motor_model.variant_key` ou
-- `motor_model.max_torque_nm`. Les privileges des tables catalogue sont accordes
-- au niveau table, donc les colonnes ajoutees en heritent sans nouveau `grant`.

-- ---------------------------------------------------------------------------
-- B1 + B2 - le calibre publie et le couple maximal deviennent des faits du
-- point de fonctionnement.
-- ---------------------------------------------------------------------------

alter table configurator.motor_operating_point
  add column variant_key text,
  add column max_torque_nm numeric;

comment on column configurator.motor_operating_point.variant_key is
  'Calibre ou variante publie du point, repris verbatim de la source (ex. "Base 430 kW @ 3000 rpm", "P50 5.5 kW"), sans normalisation. NULL quand le catalogue ne publie pas de calibre. Ce fait distingue deux points d un meme moteur physique ; il n entre jamais dans model_key, conformement a la decision C0 §15.15. Meme terme que motorCandidateSchema.variant_key du contrat Zod partage.';

comment on column configurator.motor_operating_point.max_torque_nm is
  'Couple maximal publie pour ce calibre. Deplace depuis motor_model : le catalogue Dyneo publie un couple maximal different par calibre d un meme moteur.';

alter table configurator.motor_operating_point
  add constraint motor_operating_point_variant_key_check
    check (
      variant_key is null
      or (
        variant_key = btrim(variant_key)
        and char_length(variant_key) between 1 and 120
      )
    ),
  add constraint motor_operating_point_max_torque_check
    check (max_torque_nm is null or max_torque_nm > 0);

-- L'identite conserve les cinq colonnes de C1, qui interdisaient deja le
-- doublon 50/60 Hz, et recoit trois faits publies supplementaires.
alter table configurator.motor_operating_point
  drop constraint motor_operating_point_identity_unique;

alter table configurator.motor_operating_point
  add constraint motor_operating_point_identity_unique
    unique nulls not distinct (
      snapshot_id,
      model_id,
      poles,
      supply_mode,
      frequency_hz,
      voltage_v,
      coupling,
      power_kw,
      efficiency_class,
      variant_key
    );

-- ---------------------------------------------------------------------------
-- B1 + B2 - retrait des faits qui ne sont pas des faits de modele.
-- `motor_model.variant_key` etait renseignee depuis la premiere ligne source
-- rencontree : 70 modeles portent plusieurs calibres publies, la colonne
-- arbitrait donc en silence. Le fait n'est pas supprime, il descend au point de
-- fonctionnement sous le meme nom. `max_torque_nm` suit le meme chemin.
-- ---------------------------------------------------------------------------

alter table configurator.motor_model
  drop constraint motor_model_max_torque_check;

alter table configurator.motor_model
  drop column max_torque_nm,
  drop column variant_key;

-- ---------------------------------------------------------------------------
-- B3 - la frequence publiee entre dans la correlation et dans son unicite.
-- ---------------------------------------------------------------------------

alter table configurator.motor_vendor_correlation
  add column frequency_hz integer not null;

comment on column configurator.motor_vendor_correlation.frequency_hz is
  'Frequence publiee de la table de correlation. Les catalogues publient les memes equivalences a 50 Hz et a 60 Hz sur deux pages distinctes.';

alter table configurator.motor_vendor_correlation
  add constraint motor_vendor_correlation_frequency_check
    check (frequency_hz in (50, 60));

alter table configurator.motor_vendor_correlation
  drop constraint motor_vendor_correlation_unique;

alter table configurator.motor_vendor_correlation
  add constraint motor_vendor_correlation_unique
    unique (
      snapshot_id,
      brand,
      power_kw,
      poles,
      frequency_hz,
      designation_from,
      efficiency_from,
      designation_to,
      efficiency_to
    );

-- ---------------------------------------------------------------------------
-- B4 - une edition non imprimee reste absente.
-- ---------------------------------------------------------------------------

alter table configurator.source_document
  alter column edition_label drop not null;

alter table configurator.source_document
  drop constraint source_document_edition_check;

alter table configurator.source_document
  add constraint source_document_edition_check
    check (
      edition_label is null
      or (
        edition_label = btrim(edition_label)
        and char_length(edition_label) between 1 and 255
      )
    );

comment on column configurator.source_document.edition_label is
  'Reference d edition telle qu imprimee ou publiee par l editeur. NULL quand le document n en imprime aucune : le nom de fichier editeur reste une metadonnee du manifeste d import et ne vaut pas edition.';
