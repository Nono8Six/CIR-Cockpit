# Configurateurs — suivi d'exécution

Ce fichier est le point d'entrée unique pour savoir où en est la brique
Configurateurs. Il complète le plan directeur
`C:\GitHub\CIR_Moteur\plan-brique-configurateurs.md` sans remplacer les preuves
de chaque tranche.

## Situation au 27/07/2026

| Tranche | Statut | Décision | Preuve |
| --- | --- | --- | --- |
| C0 — Cadrage | ✅ terminée | GO C1 | `docs/CONFIGURATEURS/00-cadrage-c0.md` |
| C1 — Schéma PostgreSQL | ✅ terminée | GO C2 | `docs/CONFIGURATEURS/01-schema-c1.md` |
| C2 — Migration des données | ✅ terminée | **GO C3** | section C2 ci-dessous |
| C3 à C14 | ⬜ non commencées | non autorisées | plan directeur |

**Prochaine action :** ouvrir C3, services backend Deno/tRPC, sur autorisation
explicite. Le catalogue technique moteur est chargé et actif : snapshot
`2bb33c0b-8bf0-401c-8016-5e0fbd1bee54`, lot `8ae3946c…`, 2 355 points de
fonctionnement.

## Règle de suivi

- Une case n'est cochée qu'avec une preuve locale ou runtime nommée.
- Chaque changement de statut ajoute une ligne au changelog.
- Le document de tranche contient le détail; ce fichier ne conserve que l'état,
  les preuves et la prochaine action.
- Aucun travail d'une tranche suivante ne vaut autorisation implicite.
- Les changements Dashboard présents dans le worktree restent hors périmètre.

## C0 — Cadrage

- [x] Frontière technique/commerciale verrouillée.
- [x] État CIR Moteur, CIR Cockpit et Supabase inventorié.
- [x] Glossaire, modèle cible et matrice mécanique définis.
- [x] Contrats Zod Configurateurs créés et testés.
- [x] Matrice de permissions et exigences RLS définies.
- [x] Scénarios d'acceptation et décisions utilisateur consignés.
- [x] Gate C0 prononcée GO vers C1.

Preuve : `docs/CONFIGURATEURS/00-cadrage-c0.md`.

## C1 — Schéma PostgreSQL

- [x] Schéma `configurator` créé.
- [x] Noyau commun et module moteur créés : 20 tables.
- [x] Contraintes, index, déclencheurs, ACL et RLS appliqués.
- [x] RLS activée et forcée sur les 20 tables.
- [x] Cinq migrations appliquées via le MCP Supabase.
- [x] Les cinq SQL distants sont repris exactement dans `backend/migrations/`.
- [x] Historique spécial `remote-only` supprimé; `repo:check` reste le contrôle
  de parité unique.
- [x] Preuve transactionnelle versionnée dans
  `backend/tests/configurator_rls.sql`.
- [x] Les 20 scénarios RLS passent contre le projet lié avec rollback propre.
- [x] Le défaut d'identité de `activate_snapshot` est corrigé par
  `20260726173238_configurator_activate_snapshot_actor_fix`.
- [x] `repo:check`, `qa:docs`, `backend:lint` et `backend:typecheck` passent.
- [x] Gate C1 prononcée GO vers C2.
- [x] Contrôle visuel ponctuel effectué par le PO le 27/07/2026 :
  « Exposed schemas » vaut `public, graphql_public` ; `configurator` et
  `private` sont décochés.

Preuve : `docs/CONFIGURATEURS/01-schema-c1.md`.

Reporté explicitement en C3 : helper applicatif de claims, garde statique sur
`saved_configuration` et tests des services tRPC.

## C2 — Migration des données

Statut : **terminée le 27/07/2026**. Le catalogue technique moteur est chargé
dans Supabase et le snapshot est actif.

| Élément | Valeur |
| --- | --- |
| Empreinte du lot | `8ae3946c73295037f824984774177efa0e16aa9a5ddce6f0b82241fa83e1da97` |
| Snapshot actif | `2bb33c0b-8bf0-401c-8016-5e0fbd1bee54` |
| Lot d'import | `79f56be3-488f-4226-93cb-77731ebdc4b0`, statut `ready` |
| Empreinte du diff d'activation | `6521ce417718e06993db130c79bc3608a8ae4b67cefcb1e85084fae35326210a` |

Outils, deux scripts et rien de plus :

- `scripts/configurator-c2-import.mjs` — pipeline déterministe, hors ligne.
- `scripts/configurator-c2-load.ts` — chargeur `DATABASE_URL`, transaction
  unique, idempotent par empreinte, rollback automatique, sans secret journalisé.

Preuves versionnées : `docs/CONFIGURATEURS/c2/lot-manifest.json`,
`controles.json`, `anomalies.json`, `diff-activation.json`.

Migrations correctives appliquées :
`backend/migrations/20260727053156_configurator_c2_operating_point_identity_and_provenance.sql`
et `backend/migrations/20260727063829_configurator_c2_import_file_multiple_per_role.sql`.

### Commandes exécutées

```
node scripts/configurator-c2-import.mjs --emit-payload=./.c2-payload
deno run --allow-env --allow-read --allow-net --allow-write --env-file=backend/.env \
  --config deno.json scripts/configurator-c2-load.ts --mode=load \
  --payload=./.c2-payload/candidate-payload.json --actor=<super_admin>
deno run ... --mode=activate --snapshot=2bb33c0b-... --actor=<super_admin> --note="..."
```

Le répertoire `.c2-payload/` est un artefact de travail de 43 Mo, régénérable et
non versionné ; il est supprimé après chargement.

### Entrée de tranche

- [x] Contrôle Data API effectué par le PO le 27/07/2026 : « Exposed schemas »
  vaut `public, graphql_public`, `configurator` et `private` décochés.
- [x] Migrations correctives C2 appliquées et parité prouvée : version, nom,
  longueur (6 733 car.) et md5 `7107640c…` identiques entre
  `supabase_migrations.schema_migrations` et `backend/migrations/`.
- [x] Lot source validé produit depuis `C:\GitHub\CIR_Moteur` : 17 fichiers,
  empreintes SHA-256 calculées, 6 PDF source vérifiés par empreinte.
- [x] Manifeste de provenance et empreintes du lot figés ; empreinte du lot
  reproduite à l'identique sur deux exécutions.
- [x] Mapping source → tables PostgreSQL relu : 0 violation de contrainte cible
  sur les 14 tables alimentées.
- [x] Plan de rollback et critères d'activation relus.

### Exécution

- [x] Empreinte du lot calculée et doublon idempotent refusé : le rejeu du même
  lot répond « Lot deja charge, aucune ecriture », code de sortie 0, et laisse
  1 snapshot, 1 lot, 2 355 points et 37 757 cotes inchangés.
- [x] Snapshot candidat créé, puis passé `ready` avec gate `passed`.
- [x] Données chargées sans activation, en une transaction unique.
- [x] Volumes, provenance, contraintes, doublons et anomalies contrôlés sur la
  base distante après chargement.
- [x] Diff d'activation produit et versionné : `c2/diff-activation.json`,
  empreinte `6521ce41…`, snapshot actif précédent `null`.
- [x] Décision d'activation explicitement autorisée par le PO le 27/07/2026.
- [x] Activation atomique exécutée par `configurator.activate_snapshot`, sous
  rôle `authenticated` et claims super_admin.
- [x] Aucun ancien snapshot à conserver : première activation du domaine.

### Preuve de rollback

Le premier essai de chargement a échoué sur
`import_batch_analysis_dates_check`, l'horloge cliente devançant `now()`. La
transaction a été annulée intégralement : relecture immédiate à 0 snapshot,
0 lot, 0 modèle, 0 point, 0 provenance, vocabulaire canonique intact à 13 codes.
Le chargeur horodate désormais côté serveur. Cet incident vaut preuve runtime du
rollback automatique.

### Volumes chargés, comptés sur la base distante

| Table | Chargé | Oracle SQLite |
| --- | ---: | ---: |
| `catalog_snapshot` / `import_batch` / `import_file` | 1 / 1 / 18 | — |
| `source_document` / `source_ref` | 6 / 169 | 4 / 123 |
| `motor_model` | 1 721 | 1 652 |
| `motor_operating_point` | 2 355 | 1 997 |
| `motor_efficiency_point` | 5 699 | 4 859 |
| `motor_torque_point` | 2 370 | 2 302 |
| `motor_dimension_definition` / `motor_dimension` | 59 / 37 757 | — / 37 917 |
| `motor_flange_option` / `motor_brake_option` | 7 926 / 256 | 8 196 / — |
| `motor_vendor_correlation` | 599 | 599 |
| `motor_iec_threshold` / `motor_iec_vsd_threshold` | 640 / 65 | 640 / 65 |
| `motor_validation_issue` | 62 | 38 |
| `import_issue` | 704, dont **0 bloquante** | — |

Non-régression historique recalculée sur la base : le sous-ensemble hors
Bonfiglioli legacy et hors CILS restitue exactement **1 997 points, 4 859
rendements et 2 302 couples**. Les ajouts contrôlés sont vérifiés au même
endroit : 324 points legacy, 34 points CILS, 68 couples CILS.

### Non-régression attendue

Les quinze critères passent. Détail par critère dans `controles.json` →
`non_regression`.

- [x] Les 2 355 points source sont tous représentés ; 0 point bloqué.
- [x] Aucun des 1 997 points de départ perdu : 1 997 retenus, et le sous-ensemble
  d'origine restitue exactement 4 859 rendements et 2 302 couples.
- [x] Aucune des 37 917 cotes perdue hors fusion tracée : les 30 582 cellules
  rattachables sont toutes représentées, 47 blocs orphelins contre 69 dans
  l'oracle SQLite, écart 37 917 → 37 757 expliqué ligne par ligne.
- [x] 324 points Bonfiglioli legacy et 34 points CILS ajoutés.
- [x] 68 couples CILS rattachés à leurs 17 points variateur.
- [x] 8 types dimensionnels CILS ajoutés.
- [x] 8 196 brides réconciliées : écart 8 196 → 7 926 expliqué ligne par ligne ;
  15 brides `V1` écartées par la décision C0 §7.
- [x] 599 corrélations conservées, frequency_hz publiée comprise.
- [x] 705 seuils chargés avec provenance (640 + 65, 0 sans provenance).
- [x] 38 anomalies de l'oracle retrouvées à l'identique, mêmes codes et mêmes
  cibles ; 24 anomalies supplémentaires, toutes issues du jeu Bonfiglioli legacy
  absent de l'oracle.
- [x] Aucun point ni seuil sans provenance.
- [x] `LSHRM 160MR1` conserve ses quatre points, sur chacune de ses trois
  variantes de masse (46, 54 et 72 kg).
- [x] Aucun IE5 sur réseau.
- [x] Aucune valeur PDF supprimée ou corrigée silencieusement : 0 conflit de
  cote, 0 conflit de bride, 0 violation de contrainte.

### Réconciliation ligne par ligne

190 lignes d'écart, toutes rattachées à une cause nommée
(`controles.json` → `reconciliation_par_modele`).

| Cause | Cotes | Brides |
| --- | ---: | ---: |
| Fusion de 2 à 7 modèles oracle en un `model_key` | −3 582 | −359 |
| Éclatement par montage et polarité (40 articles Innomotics publiés en 2 P et 4 P) | +990 | 0 |
| Modèles absents de l'oracle (Bonfiglioli legacy et CILS) | +2 432 | +89 |
| **Total** | **−160** | **−270** |

Les fusions ne suppriment que des copies : chaque cellule source rattachable
reste représentée au moins une fois, et 0 conflit de valeur a été relevé.

### Correctifs de schéma appliqués

Quatre écarts entre C1 et les données publiées, arbitrés par le PO le
27/07/2026 et regroupés dans une migration corrective unique appliquée via
`apply_migration` : version `20260727053156`,
`configurator_c2_operating_point_identity_and_provenance`.

| # | Constat | Arbitrage |
| --- | --- | --- |
| B1 | `identity-discriminator/v1` ne sépare pas 85 identités de point : 93 points publiés seraient perdus. | `model_key` reste indépendant des variantes ; l'identité du point reçoit `power_kw`, `efficiency_class` et `variant_key`. |
| B2 | `motor_model.max_torque_nm` contredisait 13 modèles Dyneo. | Le couple maximal devient un fait du point de fonctionnement. |
| B3 | `motor_vendor_correlation` sans fréquence écrasait 202 corrélations. | `frequency_hz` entre dans la table et dans sa contrainte d'unicité. |
| B4 | `edition_label` était obligatoire alors que Bonfiglioli n'imprime aucune édition. | La colonne devient nullable ; le nom de fichier éditeur reste une métadonnée du manifeste. |

`variant_key` ne disparaît pas : le fait descend de `motor_model` vers
`motor_operating_point` sous le même nom. C'est le terme verrouillé par C0 §15.15
et déjà exposé par `motorCandidateSchema.variant_key` dans
`shared/schemas/configurator/motor.schema.ts`, au même niveau que
`operating_point_id`, `power_kw` et `efficiency_class`. Sur `motor_model` la
colonne était renseignée depuis la première ligne source rencontrée alors que
70 modèles portent plusieurs calibres publiés : elle arbitrait en silence.

### Observations non bloquantes

- 121 modèles sur 1 721 portent le discriminant `standard` : les tables
  variateur LSES/FLSES/CILS ne publient ni inertie ni masse, ces modèles sont
  donc distincts de leurs homologues réseau. Comportement identique à l'oracle
  SQLite ; à traiter en C4 si un rapprochement devient utile.
- Les 40 articles Innomotics publiés en 2 P et 4 P portent des blocs de cotes
  strictement identiques : l'éclatement par polarité ajoute 990 lignes sans
  différence de valeur.
- Les 640 seuils IEC 60034-30-1 n'ont pas de `catalogSha256` en source ; le
  document est résolu par nom puis l'empreinte est recalculée sur le PDF réel.
- `source_ref.extraction_method` n'accepte que cinq valeurs ; les 23 méthodes
  verbatim des extracteurs sont normalisées selon la règle du chargeur SQLite.
  La table de correspondance figure dans le manifeste.
- Aucun doublon d'extraction strict n'a été trouvé : les 239 lignes de modèles
  soupçonnées en C0 §3.1 sont en réalité des points de fonctionnement distincts.

### Contrôles après activation

- [x] Un seul snapshot actif : `status = active`, `is_active = true`,
  `activated_by` renseigné, `deactivated_at` nul, note et empreinte de diff
  présentes. Aucun snapshot `retired`.
- [x] Données consultables sous RLS : un utilisateur CIR authentifié lit
  2 355 points et 37 757 cotes du snapshot actif.
- [x] Aucun accès `anon` : lecture refusée, 0 privilège de table et 0 `usage`
  de schéma pour `anon` comme pour `service_role`. RLS activée **et forcée** sur
  les 20 tables.
- [x] Aucun résidu d'essai : 0 configuration sauvegardée, 0 agence de test, la
  preuve RLS s'exécute en transaction annulée.
- [x] Advisors sans nouvelle alerte critique : sécurité identique à la baseline
  C1, aucune alerte sur `configurator` ; performance, 31 `unused_index` INFO
  contre 51 avant chargement, **0 WARN ou ERROR**, 0 clé étrangère non indexée,
  0 index dupliqué.

### Gate de sortie C2

- [x] Preuve d'import et de non-régression versionnée dans
  `docs/CONFIGURATEURS/c2/`.
- [x] Parité de la migration locale/distante vérifiée par empreinte.
- [x] Advisors et contrôles runtime relus.
- [x] Rollback démontré en conditions réelles, voir « Preuve de rollback ».
- [x] Décision **GO vers C3** consignée.

### Rollback disponible

| Portée | Procédure |
| --- | --- |
| Retirer le catalogue actif | `configurator.activate_snapshot` sur un autre snapshot du domaine. Aucun autre n'existe aujourd'hui : le retrait passerait par un nouveau lot activé, jamais par une suppression. |
| Supprimer le snapshot et ses données | `delete from configurator.catalog_snapshot where id = '2bb33c0b-…'`. Les clés étrangères composites vident les 12 tables techniques en cascade ; `motor_dimension_canonical` n'est pas touchée. Le lot d'import et ses 704 anomalies partent avec lui. |
| Rejouer le lot | Le pipeline est déterministe : la même empreinte `8ae3946c…` est reproductible depuis les sources CIR Moteur. |
| Annuler les migrations correctives | Nouvelle migration additive inverse. Une migration appliquée n'est jamais modifiée. |

## Tranches suivantes

- [ ] C3 — Services backend Deno/tRPC.
- [ ] C4 — Noyau `spec vs candidat`.
- [ ] C5 — Socle frontend.
- [ ] C6 — Première tranche verticale.
- [ ] C7 — Parcours Remplacement complet.
- [ ] C8 — Configurations sauvegardées.
- [ ] C9 — Fiche technique PDF.
- [ ] C10 — Consultation.
- [ ] C11 — Application.
- [ ] C12 — Pas à pas.
- [ ] C13 — Comparateur et simulateur énergétique.
- [ ] C14 — Recette transverse et portail QA.

## Changelog

| Date | Tranche | Changement | Preuve / décision |
| --- | --- | --- | --- |
| 26/07/2026 | C0 | Cadrage clos : frontière métier, contrats, permissions et scénarios validés. | `00-cadrage-c0.md` — GO C1 |
| 26/07/2026 | C1 | Quatre migrations initiales appliquées : fondation, catalogue moteur, RLS/ACL et helper acteur. | historique Supabase + `backend/migrations/` |
| 26/07/2026 | Transverse | Convention MCP-first généralisée; suppression du miroir et des exceptions `remote-only`. | `AGENTS.md`, `backend/migrations/README.md`, `repo:check` |
| 26/07/2026 | C1 | Preuve RLS versionnée; défaut réel détecté dans `activate_snapshot`. | `backend/tests/configurator_rls.sql` |
| 26/07/2026 | C1 | Correctif minimal appliqué par la cinquième migration; 20 scénarios passent, rollback propre. | `01-schema-c1.md` — GO C2 |
| 26/07/2026 | Suivi | Création du présent suivi; C2 reste explicitement non commencée. | `docs/CONFIGURATEURS/plan-execution.md` |
| 26/07/2026 | C2 | Pipeline d'import unique et dry-run déterministe; lot tracé, 0 violation de contrainte, mais 3 écarts de modèle bloquent le chargement. | `scripts/configurator-c2-import.mjs`, `docs/CONFIGURATEURS/c2/` — NO-GO au chargement |
| 27/07/2026 | C2 | Arbitrages PO sur B1 à B4; migration corrective unique préparée sans être appliquée, pipeline adapté, dry-run vert : 0 anomalie bloquante, 15 critères de non-régression OK, écarts cotes et brides expliqués ligne par ligne. | `docs/CONFIGURATEURS/c2/migration-corrective.sql`, `controles.json` — NO-GO au chargement maintenu |
| 27/07/2026 | C2 | Correction de vocabulaire PO : le calibre porté par le point s'appelle `variant_key`, terme C0 et contrat Zod, pas un nouveau nom. Dry-run rejoué, volumes et empreinte inchangés. | empreinte `8ae3946c…` — GO technique |
| 27/07/2026 | C2 | Migration corrective appliquée via le MCP Supabase; parité version/nom/md5 vérifiée, 20 tables et 44 politiques inchangées, aucun nouvel advisor. Données métier toujours non importées. | `20260727053156_configurator_c2_operating_point_identity_and_provenance` |
| 27/07/2026 | C2 | Contrôle Data API validé par le PO : `public, graphql_public` seuls exposés. | réglages API du projet |
| 27/07/2026 | C2 | Seconde migration corrective : plusieurs fichiers par rôle dans un lot d'import, pour garder l'empreinte des 17 fichiers source. | `20260727063829_configurator_c2_import_file_multiple_per_role` |
| 27/07/2026 | C2 | Chargeur `DATABASE_URL` livré et exécuté; premier essai annulé par contrainte d'horodatage, rollback intégral vérifié, puis chargement réussi en une transaction. | `scripts/configurator-c2-load.ts`, snapshot `2bb33c0b-…` |
| 27/07/2026 | C2 | Idempotence prouvée : le rejeu du même lot est reconnu sans écriture ni doublon. | code de sortie 0, volumes inchangés |
| 27/07/2026 | C2 | Snapshot activé via `configurator.activate_snapshot`; un seul actif, lecture RLS conforme, `anon` refusé, advisors sans alerte critique. | `c2/diff-activation.json` — **GO C3** |
