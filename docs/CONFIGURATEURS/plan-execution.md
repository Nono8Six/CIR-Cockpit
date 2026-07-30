# Configurateurs — suivi d'exécution

Ce fichier est le point d'entrée unique pour savoir où en est la brique
Configurateurs. Il complète le plan directeur
`C:\GitHub\CIR_Moteur\plan-brique-configurateurs.md` sans remplacer les preuves
de chaque tranche.

## Situation au 30/07/2026

| Tranche | Statut | Décision | Preuve |
| --- | --- | --- | --- |
| C0 — Cadrage | ✅ terminée | GO C1 | `docs/CONFIGURATEURS/00-cadrage-c0.md` |
| C1 — Schéma PostgreSQL | ✅ terminée | GO C2 | `docs/CONFIGURATEURS/01-schema-c1.md` |
| C2 — Migration des données | ✅ terminée | **GO C3** | section C2 ci-dessous |
| C3 — Compatibilité technique backend | 🟠 en cours | **GO C3-6** | checkpoints C3-1 à C3-5 ci-dessous |
| C4 à C14 | ⬜ non commencées | non autorisées | plan directeur |

**Verdict au 30/07/2026 :** C3-5 est terminé côté services backend. Les
lectures `catalog.list/get`, la normalisation sourcée et les moteurs mécanique,
électrique et applicatif déterministes sont prouvés. La fonctionnalité
Configurateurs n'est pas encore disponible dans l'application : C3-6, la
surface tRPC C3-7, le service frontend et les écrans restent absents.

**Prochaine action :** démarrer C3-6 seulement sur une nouvelle exécution
autorisée. Le présent checkpoint s'arrête après C3-5. Le catalogue technique
moteur utilisé reste le snapshot actif
`6fbf4046-be74-4422-9fe8-2d2d8a8d9157`, lot `cc5689ac…`, 1 665 modèles
physiques, 2 355 points de fonctionnement et 45 568 cotes.

Audit consolidé : `docs/CONFIGURATEURS/audit-etat-2026-07-30.md`.

## Règle de suivi

- Une case n'est cochée qu'avec une preuve locale ou runtime nommée.
- Chaque changement de statut ajoute une ligne au changelog.
- Le document de tranche contient le détail; ce fichier ne conserve que l'état,
  les preuves et la prochaine action.
- Aucun travail d'une tranche suivante ne vaut autorisation implicite.
- Les changements Dashboard présents dans le worktree restent hors périmètre.

## Checkpoint d'audit du 30/07/2026

- [x] État local relu : contrats Zod, migrations, scripts d'import,
  extracteurs, tests, routeur tRPC et frontend.
- [x] État Git relu sur `main` avant livraison.
- [x] Projet Supabase lié confirmé :
  `CIR_Cockpit` (`rbjtrcorlezvocayluok`), PostgreSQL 17.6, état
  `ACTIVE_HEALTHY`.
- [x] Historique distant confirmé : 128 migrations, dont 10 migrations
  `configurator` de C1 à C2d.
- [x] Parité C2d confirmée depuis le SQL distant : version, nom et SQL
  normalisé identiques au fichier local ; longueur 1 339, MD5
  `05eb28807759b04565d099047d89821c`.
- [x] Schéma distant confirmé : 20 tables, RLS activée et forcée sur les
  20 tables, 44 policies.
- [x] Snapshot actif confirmé : un seul actif, statut `active`, gate `passed`,
  empreinte de lot `5db53991…`, 0 issue d'import bloquante non résolue.
- [x] Qualifications confirmées : 59 moteurs VFD obligatoires, 109 moteurs
  intégrés non-IEC, 0 qualification nulle ou incohérente sur l'actif.
- [x] Advisors confirmés : aucun advisory sécurité `configurator` ; 15 index
  encore inutilisés au niveau information, à réévaluer uniquement sur plans
  réels C3.
- [x] Edge Function `api` active, version 198, `verify_jwt=false` conformément
  à l'authentification applicative.
- [x] Absence C3 initiale prouvée avant C3-1 : aucun symbole `configurator`
  dans `backend/functions/api` ou `frontend/src`, et
  `configurator.motor.catalog.list` répondait `404 NOT_FOUND`. Après C3-2,
  seule la fondation backend locale existe ; la route runtime reste absente.
- [x] Gate finale `pnpm run qa` entièrement verte sur le commit `9b97e8a` dans
  un worktree isolé : 160 fichiers / 742 tests frontend, seuils de couverture,
  build, 454 tests backend et 9 intégrations distantes réussis ; 0 échec et
  7 intégrations conditionnelles ignorées. La fixture dédiée
  `AUDIT_20260604_api_int_user@cir.invalid` a été recréée après autorisation
  explicite avec un profil humain actif `tcs` et un rattachement à l'agence de
  test CIR Bordeaux. La preuve MCP finale confirme une identité Auth validée,
  un profil, un rattachement, le changement de mot de passe enregistré et
  0 entité / interaction de test résiduelle.

Décision : **GO pour démarrer C3 ; NO-GO pour présenter Configurateurs comme
une fonctionnalité livrée ou utilisable.**

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
| Empreinte du lot | `5db53991095401581953e48fd9b4bbba68c8a8be5b4d5f8c227456fc14256bdb` |
| Snapshot actif | `6fbf4046-be74-4422-9fe8-2d2d8a8d9157` |
| Lot d'import | `cc5689ac-cbf1-45e8-a079-62df8f77dfd8`, statut `ready` |
| Empreinte du diff d'activation | `d7e44f390d5ea0736f48ae12fefebd6a5b44d28caf783fb7fc5e5abe19860bed` |

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
deno run ... --mode=activate --snapshot=6fbf4046-... --actor=<super_admin> --note="..."
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
- [x] Décision initiale **GO vers C3** consignée.
- [ ] Décision désormais suspendue jusqu’à l’activation du correctif C2b
  décrit ci-dessous.

### Gate corrective C2b avant C3

- [x] Lecture sémantique des cellules fusionnées Bonfiglioli corrigée.
- [x] Cinq fixtures B exactes vérifiées sur la page PDF 58.
- [x] Contrôle d’implausibilité bloquant ajouté au pipeline.
- [x] `K` ajouté au vocabulaire canonique et aux contrats moteur.
- [x] Migration distante `20260727145013_configurator_c2b_dimension_k`.
- [x] 540 valeurs K sourcées et mappées, 0 non mappée.
- [x] Dry-run `GO_TECHNIQUE`, 17 critères sur 17.
- [x] Snapshot candidat `bcb48c8f-44e6-486f-a8ad-0d1a837ebed3`
  chargé via MCP, `ready/passed`, 0 anomalie bloquante.
- [x] Snapshot `2bb33c0b-8bf0-401c-8016-5e0fbd1bee54` conservé comme
  unique actif.
- [x] **VALIDATION PO** pour activer le candidat C2b : accordée le 27/07/2026.
- [x] Activation exécutée via `configurator.activate_snapshot`, sous rôle
  `authenticated` et claims du profil super_admin, empreinte de diff recalculée
  et non recopiée (`3083b3b9…`). Candidat `bcb48c8f-…` actif,
  `2bb33c0b-…` `retired`, même horodatage donc même transaction.
- [x] Rejouer les preuves RLS après activation : `anon` refusé au niveau du
  schéma, `tcs` et `super_admin` lisent le catalogue, compteurs actifs conformes
  au manifeste (1 721 modèles, 37 545 cotes, 540 K).
- [ ] Sonde RLS `agency_admin` : aucun profil de ce rôle n’existe, non exécutée.

### Gate corrective C2c avant C3-4

Diagnostic du 27/07/2026, en lecture seule sur le candidat C2b.

Couverture réelle des cotes de fixation : K sur 515 modèles / 1721, H sur 1172.
Les 1 012 modèles « A sans K » et les 355 « A sans H » sont **tous** Innomotics.
Leroy-Somer et Bonfiglioli sont à 100 % de couverture.

Cause unique, prouvée sur le PDF Innomotics (Catalog D 81.1, édition 02/2026) :
les cotes de pattes sont lues par `FOOT_DIMENSION_PAGES` (296, 298, 320, 324,
…), or ces pages ne publient ni K ni K'. Ces deux cotes figurent sur les pages
arbre voisines (297, 299, 321, 325, 413, 421), que l'extracteur ne lit que pour
D/E/F. Les pages 320 et 324 ne publient pas non plus H, HA ni Y : ces trois
cotes sont sur 321 et 325. Un seul défaut de périmètre de lecture explique donc
les deux trous.

En-têtes relevés :

| Pages | Colonnes publiées |
| --- | --- |
| 296, 298 | `A AA AB AC AD AD' AF AF' AG AS B BA BB BC BE BE' C CA H HA Y` |
| 320, 324 | idem sans `H HA Y` |
| 297, 299 | `HH K K' L1 LC LL D DB E EB ED F GA …` |
| 321, 325 | `H HA Y HH K K' L LC LL D DB E …` |

- [x] Étendre la lecture aux pages arbre pour K, K', et pour H/HA/Y quand la
  page de pattes ne les publie pas.
- [x] `K'` reste une variante primée : `base_published_code = 'K'`,
  `variant_context` renseigné, `canonical_code` nul, comme `B'` et `AD'`
  aujourd'hui.
- [x] Ajouter un contrôle de couverture d'en-tête : toute colonne présente dans
  l'en-tête PDF et absente de la liste blanche lève une anomalie explicite.
- [x] Fixtures : frame 63 et 71 → K = 7 ; frame 80 → K = 9,5 ; frame 90 → K = 10 ; frame 180 → K = 15, H = 180 ; frame 315 → K = 28, H = 315.
- [x] Diff strictement additif sur `motor_dimension` (+4 214 cotes, 0 modifiée, 0 supprimée, 0 modèle ambigu).
- [x] Aucune migration requise : `K` est au vocabulaire canonique depuis
  `20260727145013`.
- [x] `HH` est ingérée comme code publié distinct (1 041 lignes), `unmapped` et
  sans `canonical_code`. Elle n'est **pas** la hauteur d'axe : sur la carcasse 80
  elle vaut 73, sur la 315 elle vaut 238. Ne jamais la confondre avec `H`.
- [x] Les 169 `source_ref` partagés ont retrouvé leur `extracted_at` d'origine,
  `2026-07-27 06:43:33.83623+00`. La migration distante
  `20260728045157_configurator_c2c_provenance_and_jsonb_invariants` a aussi
  converti les compteurs des trois snapshots, des trois lots et les 2 112
  contextes d'anomalie en vrais objets JSONB, puis validé trois contraintes
  empêchant leur réencodage comme chaînes.

Les ~194 modèles sans A ni K restants sont des moteurs à bride seule
(Bonfiglioli M, ME, MX et une partie des BN/BE). Pour eux `indeterminate` sur la
règle pattes est le verdict correct.

#### Checkpoint pré-activation C2c — 28/07/2026

- [x] Candidat `4ee230e7-47b0-4637-90b2-3c76b1607a73` contrôlé
  `ready/passed`, avec zéro anomalie bloquante avant activation.
- [x] Migration corrective appliquée via MCP, historique distant restitué dans
  `backend/migrations/`.
- [x] `repo:check`, `deno check`, 6 tests d'extraction, `qa:back` et `qa:fast`
  verts.
- [ ] `pnpm run qa` : arrêt sur un seuil de couverture frontend préexistant et
  hors diff C2c (`useDashboardStatusHelpers.ts`, branches 13,33 % pour 30 %).
  Les 155 fichiers / 706 tests frontend ont néanmoins réussi.
- [x] Autorisation PO reçue le 28/07/2026 pour réparer puis activer C2c.
- [x] Commit `743e29b` poussé sur `main` avant activation.
- [x] Activation distante via `configurator.activate_snapshot` ; empreinte du
  diff `6c05338ff50e6acc223aeb83f9bb6baefea89b867cb33fe23ae38e7d29f65876`.
- [x] Probes post-activation : un seul actif, 41 759 dimensions, 0 anomalie
  bloquante, A sans K = 0, A sans H = 0, cinq fixtures Bonfiglioli exactes.
- [x] Preuve RLS transactionnelle avec rollback : `anon` refusé ; `tcs`,
  `agency_admin` et `super_admin` lisent l'actif et ses 41 759 dimensions ;
  aucune fixture persistée.

### Gate corrective C2d — qualifications factuelles moteur

Checkpoint du 28/07/2026 : **terminé et activé**. La preuve détaillée est dans
`docs/CONFIGURATEURS/c2d/README.md`.

- [x] Migration distante
  `20260728120556_configurator_c2d_motor_qualifications` appliquée via MCP et
  reproduite localement avec le même SQL normalisé (1 433 caractères,
  MD5 `8654758944d3ec323172d9c3c1653d92`).
- [x] `requires_vfd`, `is_iec_standard` et `article_no_status` sont structurés
  et protégés par des contraintes de cohérence ; `shaft_spec` qualifie les
  109 Bonfiglioli M/ME/MX intégrés comme `integrated_gearmotor_non_iec`.
- [x] Les 59 PMaSynRM Leroy-Somer sont marqués variateur obligatoire. Aucun
  asynchrone n'est classé ainsi.
- [x] Les références article absentes des catalogues ne sont pas inventées :
  1 017 `published`, 648 `not_published_in_source`, aucun statut incohérent.
- [x] 56 doublons logiques Leroy-Somer VFD ont été rattachés à leur modèle
  physique uniquement quand désignation normalisée + pôles + puissance
  désignent une masse, une inertie et un montage uniques. Le catalogue passe
  de 1 721 à 1 665 modèles sans perdre de point de fonctionnement : 2 355 avant
  et après.
- [x] Protection et matériau qualifiés depuis les gammes constructeur :
  Innomotics IP55 ; Leroy-Somer IP55 sauf PLSES/PLSHRM IP23 ; Bonfiglioli IP55
  sauf les 6 BY dont la source autorise IP55/IP56 sans lever la variante.
- [x] La cote composite B `368/419` du PLSES 280 MGU est conservée comme texte
  publié, sans conversion arbitraire en millimètres.
- [x] 79 incertitudes résiduelles sont explicites dans
  `motor_validation_issue` : 65 attributs physiques Leroy-Somer non
  rapprochables sans ambiguïté, 6 indices IP BY, 1 conflit d'inertie Innomotics
  et 7 jeux de cotes IEC incomplets (6 Bonfiglioli, 1 Innomotics). Avec les
  62 contrôles antérieurs, le snapshot actif porte 141 issues et zéro anomalie
  bloquante.
- [x] Couverture active des cotes IEC principales A/B/C/H/K/D/E/F :
  Leroy-Somer 384/384 ; Innomotics 1 016/1 017 pour les cotes de pieds et
  1 017/1 017 pour D/E/F ; Bonfiglioli IEC 149/155 pour les cotes de pieds,
  155/155 pour D/F et 153/155 pour E. Les 109 intégrés non-IEC ne reçoivent
  aucune fausse cote IEC.
- [x] Snapshot `6fbf4046-be74-4422-9fe8-2d2d8a8d9157` activé atomiquement :
  un seul actif, gate `passed`, 1 665 modèles, 2 355 points, 45 568 cotes et
  7 940 options de bride.
- [x] RLS rejouée avec rollback : `anon` ne lit pas le catalogue ; un profil
  `tcs` humain lit les 1 665 modèles et 45 568 cotes. Le premier profil TCS
  inspecté était un compte système, volontairement refusé par la politique.
- [x] `node --check`, `deno check`, 13 tests d'extraction, `qa:docs` et
  `qa:back` verts ; 449 tests backend réussis, 14 intégrations conditionnelles
  ignorées, zéro échec. Aucun advisor sécurité spécifique à `configurator`.

## C3 — Compatibilité technique backend

Statut : **en cours depuis le 30/07/2026**. C4 reste absorbée par C3. C3-5 est
terminé ; C3-6, le frontend et toute IA Configurateurs restent non commencés.

### Checkpoint C3-1 — contrats et règles versionnées

- [x] Contrats externes construits avec `z.strictObject` et frontières
  `safeParse`.
- [x] A/B/C/H/K, D/E/F, M/N/P/S ou `S_thread`/T/Z, alimentation et exigences
  applicatives facultatives couverts.
- [x] K, diamètre réel du boulon, courses transversale et longitudinale sont
  quatre faits distincts.
- [x] D et sa tolérance d'ajustement sont deux faits distincts.
- [x] Plage axiale de l'accouplement bornée par deux faits sourcés.
- [x] Toute valeur renseignée exige au moins une preuve ; une inconnue reste
  `null`.
- [x] Une surcharge terrain n'est applicable que si elle est explicite,
  confirmée et prouvée.
- [x] Quatre statuts, adaptations, contrôles, valeurs attendues/observées,
  delta, jeu calculé, faits, preuves et règles exposés.
- [x] Ruleset immuable `motor.compatibility.cir`, version `1`.
- [x] Champs externes `price`, `discount`, `stock` et `availability` refusés.
- [x] Tests ciblés : 3 fichiers, **24 tests réussis**, typecheck et lint ciblé
  verts.

Fichiers :
`shared/schemas/configurator/common.schema.ts`,
`shared/schemas/configurator/motor.schema.ts`,
`shared/schemas/__tests__/configurator-c3-contracts.test.ts` et tests
Configurateurs existants adaptés.

Décision de sortie : **GO C3-2**.

### Checkpoint C3-2 — exécuteur PostgreSQL read-only et erreurs CIR

- [x] Transaction `SET TRANSACTION READ ONLY` avant toute autre instruction.
- [x] Rôle local `authenticated` et claims dérivés de l'`AuthContext`.
- [x] `statement_timeout=5s`, `lock_timeout=1s` et `search_path` explicite.
- [x] Seule la transaction typée est transmise à l'opération Configurateurs.
- [x] Client racine confiné à l'exécuteur ; zéro accès client racine dans les
  services C3.
- [x] Garde `repo:check` : zéro accès C3 à `saved_configuration`.
- [x] Zéro mutation métier C3.
- [x] Sept erreurs C3 ajoutées au catalogue CIR avec messages publics français.
- [x] SQL, stacks, claims, diagnostics et valeurs brutes absents des réponses
  publiques ; `request_id` conservé.
- [x] Tests unitaires : **5 réussis**, 0 échec.
- [x] Test d'intégration PostgreSQL distant : **1 réussi**, rôle, claims,
  timeouts, RLS positive/négative, écriture refusée SQLSTATE `25006` et zéro
  persistance.
- [x] Preuves MCP Supabase sous transactions rollbackées : lecture recevable,
  lecture sans droit à 0 ligne, écriture refusée, 0 ligne après rollback.
- [x] Aucun changement distant persistant, aucune identité Auth, migration ou
  Edge Function créée ou modifiée.
- [x] `qa:back` et `qa:fast` verts : 160 fichiers / 746 tests frontend et
  454 tests backend réussis.
- [x] `pnpm run qa` entièrement vert sur le commit `9b97e8a` dans un worktree
  isolé : 160 fichiers / 742 tests frontend, 454 tests backend et
  9 intégrations distantes réussis ; 0 échec, 7 ignorées. Le test PostgreSQL
  C3-2 ciblé reste vert.

Fichiers :
`backend/functions/api/services/configurator/configuratorReadExecutor.ts`,
`configuratorErrors.ts`, leurs tests, l'intégration
`backend/functions/api/integration/configuratorReadExecutor_integration_test.ts`,
`shared/errors/types.ts`, `shared/errors/catalog.ts` et la garde centrale
`scripts/check-repo-state.mjs`.

Décision de sortie : **GO C3-3**.

### Checkpoint C3-3 — catalogue et normalisation

- [x] Services `catalog.list/get` bornés, paginés et validés en entrée/sortie.
- [x] Snapshot actif résolu explicitement sur toutes les lectures ; un point
  retiré est traité comme introuvable.
- [x] Modèle, point, rendement, couple, dimensions, brides, freins et anomalies
  chargés sans fusion silencieuse.
- [x] `fromMotor` construit avec provenance catalogue ; seules les mesures
  terrain confirmées et prouvées peuvent le surcharger après normalisation.
- [x] Ambiguïté ou fait mécanique décisif absent renvoyé `indeterminate`.
- [x] Six tests de normalisation, deux tests d'erreurs, `qa:back`, `qa:fast`
  et `pnpm run qa` verts : 160 fichiers / 763 tests frontend, couverture,
  build, 460 tests backend et 9 intégrations standards, 0 échec.
- [x] Suite distante ciblée avec la fixture `tcs` : 11 intégrations réussies,
  dont C3-2 et C3-3, 0 échec et 6 ignorées.

Fichiers :
`shared/schemas/configurator/common.schema.ts`,
`shared/schemas/configurator/motor.schema.ts`,
`backend/functions/api/services/configurator/motorCatalog.ts`,
`motorCatalogNormalization.ts`, leurs tests et
`backend/functions/api/integration/motorCatalog_integration_test.ts`.

La surface tRPC et le déploiement restent réservés à C3-7/C3-8. Aucun
changement distant persistant n'a été réalisé.

Décision de sortie : **GO C3-4**. C3-4 reste non commencé.

### Checkpoint C3-4 — compatibilité mécanique

- [x] Frontière métier pure
  `evaluateMotorMechanicalCompatibility`, sans SQL, tRPC, état global, score
  ni donnée commerciale.
- [x] Contrat Zod strict de sortie mécanique et faits complémentaires
  `bore_type`, `P_clearance` et `T_clearance`, tous sourcés et facultatifs.
- [x] Pattes B3/B34/B35 : H strict avec adaptation, écarts A/B divisés par
  deux, jeu K/boulon calculé, courses de bâti utilisées uniquement si mesurées
  et confirmées, C conservé sous réserve avec contrôle ou adaptation explicite.
- [x] Arbre : D et F stricts ; E sous réserve hors plage axiale prouvée ;
  tolérance D différente informative seulement quand les deux valeurs existent,
  sans alerte si elle manque.
- [x] Brides B5/B14/B34/B35 : nature d'alésage, M/N/Z et S ou `S_thread`
  stricts ; P radial et T axial acceptés uniquement dans un dégagement mesuré ;
  option `larger`/`smaller` appariée seulement sur interface exacte avec
  `requires_option=true`.
- [x] Agrégation conforme à C0 :
  `not_satisfied` > `indeterminate` > `under_reservation` > `satisfied`.
  Entrées identiques et ordre des preuves produisent le même résultat.
- [x] Toute inconnue décisive reste dans `missing_facts` et ne devient jamais
  zéro ni compatibilité.
- [x] **41 tests unitaires C3-4** et 6 tests de normalisation réussis ; **19
  tests Vitest shared** réussis ; lint et typecheck ciblés verts.
- [x] Preuve distante ciblée : point B5 choisi dynamiquement dans l'unique
  snapshot actif, lecture via `motorCatalogService` et le vrai
  `configuratorReadExecutor` sous la fixture humaine `tcs`, provenance
  conservée et verdict identique `satisfied`. Runner complet avec
  `RUN_CONFIGURATOR_DB_PROOFS=1` : **11 intégrations réussies, 0 échec,
  6 ignorées**.
- [x] Baseline MCP relue : projet `rbjtrcorlezvocayluok`
  `ACTIVE_HEALTHY`, snapshot actif `6fbf4046-…` `active/passed`, 1 665 modèles,
  2 355 points, 45 568 cotes, 7 940 brides et 141 alertes.
- [x] `qa:back` et `qa:fast` verts ; gate final rejoué sur l'index C3-4 isolé :
  160 fichiers / 743 tests frontend,
  501 tests backend, parité migrations, lint, typecheck et conformité erreurs.
- [x] `pnpm run qa` entièrement vert sur l'index C3-4 isolé : 160 fichiers /
  743 tests frontend avec
  couverture, build, 501 tests backend et 9 intégrations standards réussies ;
  0 échec et 8 intégrations conditionnelles ignorées.
- [x] Aucune migration, mutation Supabase, fixture, route tRPC, Edge Function,
  configuration Auth ou donnée distante créée ou modifiée.

Fichiers :
`shared/schemas/configurator/motor.schema.ts`,
`shared/schemas/__tests__/configurator-c3-contracts.test.ts`,
`backend/functions/api/services/configurator/motorMechanicalCompatibility.ts`,
`motorMechanicalCompatibility_test.ts`, `motorCatalogNormalization.ts` et
`backend/functions/api/integration/motorCatalog_integration_test.ts`.

Limitations explicites : les dégagements de bâti et de bride ainsi que la plage
axiale restent indéterminés ou sous réserve tant qu'ils ne sont pas mesurés et
prouvés. C3-4 ne fournit ni recherche d'équivalents, ni synthèse électrique ou
applicative, ni exposition tRPC.

Décision de sortie : **GO C3-5**. C3-5 reste non commencé.

### Checkpoint C3-5 — compatibilité électrique et applicative

- [x] Frontière métier pure
  `evaluateMotorElectricalApplicationCompatibility`, sans SQL, tRPC, état
  global, score, donnée commerciale ou IA.
- [x] Puissance, pôles, fréquence, mode réseau/variateur et couple
  tension/couplage évalués comme critères électriques décisifs.
- [x] Toute donnée décisive absente ou non publiée devient `indeterminate`,
  avec propagation canonique dans `missing_facts`.
- [x] Courant supérieur, couple sans exigence, classe IE différente et
  vitesse/glissement restent informatifs et ne masquent ni ne créent un
  blocage.
- [x] Une exigence explicite de couple est contrôlée séparément et devient
  décisive uniquement lorsqu'elle est réellement fournie.
- [x] IP, frein, VFD, refroidissement, service, température ambiante et
  démarrages/heure sont évalués uniquement lorsqu'une exigence explicite existe.
- [x] Capacité candidate absente/non publiée : `indeterminate`; capacité
  publiée insuffisante : `not_satisfied`; aucune exigence : aucune pénalité.
- [x] Ruleset immuable `motor.compatibility.cir` version `1`, quatre statuts et
  priorité `not_satisfied > indeterminate > under_reservation > satisfied`.
- [x] Sortie Zod stricte, preuves obligatoires pour tout fait utilisé, listes
  dédupliquées et canoniques, ordre d'entrée sans effet.
- [x] **60 tests Deno C3-5**, **41 tests C3-4**, **6 tests de normalisation** et
  **9 tests Vitest shared** réussis ; lint et typecheck ciblés verts.
- [x] `qa:back` vert : 150 fichiers, **561 tests backend**, 0 échec et
  16 intégrations conditionnelles ignorées.
- [x] `qa:fast` vert dans un worktree isolé : parité migrations, 160 fichiers /
  **744 tests frontend**, conformité erreurs, lint/typecheck et 561 tests
  backend.
- [x] `pnpm run qa` vert dans le même worktree isolé : 744 tests frontend avec
  couverture, build, 561 tests backend et **9 intégrations distantes réussies**,
  0 échec, 8 ignorées.
- [x] Baseline MCP relue sans écriture : `rbjtrcorlezvocayluok`
  `ACTIVE_HEALTHY`, unique actif `6fbf4046-…` `active/passed`, 1 665 modèles,
  2 355 points, 45 568 cotes, 7 940 brides, 141 issues, API v198.
- [x] Aucune migration, mutation Supabase, fixture persistante, modification
  Auth/RLS, route tRPC, Edge Function, déploiement ou intégration frontend.

Fichiers :
`shared/schemas/configurator/motor.schema.ts`,
`shared/schemas/__tests__/configurator-c3-contracts.test.ts`,
`backend/functions/api/services/configurator/motorCatalogNormalization.ts`,
`motorCatalogNormalization_test.ts`,
`motorElectricalApplicationCompatibility.ts` et
`motorElectricalApplicationCompatibility_test.ts`.

Limitations explicites : notation IP non comparable, capacité applicative
absente et couple exigé non publié restent `indeterminate`. Démarrage, masse,
inertie et bruit ne participent à aucun verdict décisif. C3-5 ne fournit ni
recherche d'équivalents, ni énergie/classement, ni conseils consolidés, ni
surface tRPC.

Décision de sortie : **GO C3-6**. C3-6 reste non commencé.

### Rapatriement de `tools/extract`

Depuis le 27/07/2026, les extracteurs et leurs sorties sont versionnés dans ce
dépôt sous `tools/extract/`, à côté de `scripts/configurator-c2-import.mjs` qui
les consomme. Reproduction vérifiée : `dimensions-innomotics.json` régénéré
depuis le nouvel emplacement est identique au bit près à l'original
(`397bc0b6…`), et les deux tests C2b passent.

Restent hors dépôt, sous `CIR_MOTEUR_ROOT` ou `--source-root` : les PDF
fabricant (168 Mo, propriété des constructeurs) et l'oracle SQLite (28 Mo).
`tools/extract/raw/` est un intermédiaire régénérable et reste ignoré. Le chemin
n'a plus de valeur par défaut codée en dur : son absence est une erreur
explicite.

`iec-30-1-thresholds.json` reste lu depuis `CIR_MOTEUR_ROOT/backend/data` et
n'a pas été rapatrié : son déplacement n'était pas demandé.

Le plan de reprise détaillé, découpé par checkpoints, est
`docs/CONFIGURATEURS/plan-c3-compatibilite-technique.md`.

### Rollback disponible

| Portée | Procédure |
| --- | --- |
| Retirer le catalogue actif | Réactiver le snapshot précédent `900dfe00-d0e1-4f9d-8281-25c5f1beab50` avec `configurator.activate_snapshot`, après recalcul et validation du diff. |
| Supprimer un snapshot et ses données | Seulement après retrait : suppression ciblée de son `catalog_snapshot`. Les clés étrangères composites vident les tables techniques en cascade ; `motor_dimension_canonical` n'est pas touchée. |
| Rejouer le lot | Le pipeline est déterministe : la même empreinte `5db53991…` est reproductible depuis les sources CIR Moteur. |
| Annuler les migrations correctives | Nouvelle migration additive inverse. Une migration appliquée n'est jamais modifiée. |

## Tranches suivantes

- [x] C2c — Correctif d’extraction K/K' et H/HA/Y Innomotics activé et prouvé
  le 28/07/2026. C3-4 peut désormais démarrer sur le snapshot corrigé.
- [x] C2d — Qualifications moteur, rapprochements physiques sûrs et
  incertitudes résiduelles structurées activés et prouvés le 28/07/2026.
- [ ] C3 — Compatibilité technique backend Deno/tRPC, incluant l’ancien C4.
- [ ] C4 — Absorbée par C3, aucune tranche indépendante.
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
| 27/07/2026 | C2b | Défaut de cellules fusionnées Bonfiglioli corrigé; cinq cotes B exactes, gate d’implausibilité et K canonique ajoutés. | empreinte `0a295854…`, 17/17 contrôles OK |
| 27/07/2026 | C2b | Migration K appliquée via MCP; 540/540 valeurs reprises sans invention. | `20260727145013_configurator_c2b_dimension_k` |
| 27/07/2026 | C2b | Nouveau snapshot candidat chargé via MCP et validé, sans activation implicite. | candidat `bcb48c8f-…` `ready/passed`, actif précédent inchangé |
| 27/07/2026 | Suivi | C3 absorbe C4 et reçoit un plan autonome par phases et checkpoints. | `plan-c3-compatibilite-technique.md` |
| 27/07/2026 | C2b | Pré-activation revérifiée en lecture seule sur le distant : 5 fixtures B exactes, 540 K mappées 6–35 mm, 12 compteurs conformes, diff réconcilié 37 449 / 67 / 241 / 29. Snapshot actif porte bien des B faux (1968, 5706). | requêtes MCP du 27/07/2026 |
| 27/07/2026 | C3-4 | **Décision PO** : diamètre D identique et ajustement différent restent `satisfied`, avec alerte informative dans `checks_required`. | `plan-c3-compatibilite-technique.md` §8 |
| 27/07/2026 | C2c | Cause unique identifiée pour les trous K (1 012 modèles) et H (355), tous Innomotics : les pages de pattes lues ne publient pas ces cotes, qui sont sur les pages arbre voisines. Correctif non appliqué. | En-têtes PDF pages 296/298/320/324 contre 297/299/321/325 |
| 27/07/2026 | Outillage | `tools/extract` rapatrié dans le dépôt; sortie régénérée identique au bit près, tests C2b verts. PDF et oracle hors dépôt via `CIR_MOTEUR_ROOT`. | `397bc0b6…`, 2/2 tests |
| 27/07/2026 | C2b | **Candidat activé.** Un seul actif, ancien `retired`, cotes B exactes sur l'actif (BY 315MBK = 457 mm). Rollback disponible par la même fonction. | `activation_diff_sha256 = 3083b3b9…` |
| 27/07/2026 | C3 | Snapshot retiré lisible par tout authentifié : `tcs` voit les deux snapshots cumulés. La résolution de l'actif devient une obligation de service testée en C3-3, pas une garantie RLS. | Sonde `tcs` : 3 442 modèles, 75 302 cotes |
| 27/07/2026 | C2c | Correctif d'extraction K/K' et H/HA/Y Innomotics appliqué et validé sur le snapshot candidat `4ee230e7-47b0-4637-90b2-3c76b1607a73`; diff strictement additif (+4 214 cotes, 0 modifiée, 0 supprimée, 0 modèle ambigu). Garde de couverture d'en-tête ajoutée. Non activé. | `docs/CONFIGURATEURS/c2/diff-c2c.json` — Candidat ready/passed |
| 27/07/2026 | C2c | Couverture réelle après correctif : K passe de **0 à 1 012 modèles** Innomotics (1 052 lignes), H de 657 à 1 012. Tous domaines : `A sans K` = 0, `A sans H` = 0, 1 527 / 1 527. | SQL sur le candidat |
| 27/07/2026 | C2c | Contre-vérification indépendante : K Innomotics aligné carcasse par carcasse avec Leroy-Somer et Bonfiglioli, extraits par des pipelines distincts (63→7, 90→10, 132→12, 250→24, 315→28). Valeurs page 297 recoupées à la main. Extracteur déterministe, 17 sorties sur 18 identiques au bit près. | Croisement 3 marques + relevé PDF |
| 27/07/2026 | C2c | Tests convertis en `unittest.TestCase` : ils n'étaient découverts par aucun runner installé (`pytest` absent, fonctions de module). 6 tests verts. Chemin `CIR_MOTEUR_ROOT` codé en dur retiré du fichier de test. | `python -m unittest`, 6/6 |
| 27/07/2026 | Chargeur | `source_document` et `source_ref` sont partagés et dédupliqués par contenu. L'upsert introduit pour C2c réécrivait leurs métadonnées et `extracted_at` ; les 169 provenances sont citées par le snapshot **actif**. Remplacé par une réutilisation sans écriture, avec remontée d'erreur si le lot contredit un document déjà enregistré. | `scripts/configurator-c2-load.ts`, `deno check` vert |
| 28/07/2026 | Chargeur | Cause transverse JSONB corrigée : Postgres.js reçoit désormais `sql.json(...)` pour les compteurs et les contextes, au lieu d'une chaîne issue de `JSON.stringify`. | `scripts/configurator-c2-load.ts` |
| 28/07/2026 | C2c | Réparation distante appliquée via MCP : 169 dates de provenance restaurées, 6 compteurs et 2 112 contextes convertis en objets JSONB ; trois contraintes validées empêchent la récidive. | `20260728045157_configurator_c2c_provenance_and_jsonb_invariants` |
| 28/07/2026 | QA | `qa:back` et `qa:fast` verts ; `pnpm run qa` atteint 155/155 fichiers et 706/706 tests frontend puis échoue sur la couverture d'un fichier frontend absent du diff C2c. | `useDashboardStatusHelpers.ts` : branches 13,33 % / seuil 30 % |
| 28/07/2026 | C2c | Checkpoint pré-activation poussé sur `main`, puis candidat activé via MCP. Un seul actif, 41 759 dimensions, 1 012 modèles Innomotics avec K et H, 169 provenances intactes, RLS prouvée sous quatre rôles avec rollback. | commit `743e29b`, diff `6c05338f…`, snapshot `4ee230e7-…` — **GO C3-4 données** |
| 28/07/2026 | C2d | Qualifications factuelles activées : VFD obligatoire, IEC/non-IEC, statut de référence article, IP/matériau, rapprochement sûr de 56 doublons VFD et conservation de la cote composite PLSES. Les 79 inconnues restantes sont explicites, jamais inventées. | migration `20260728120556`, snapshot `6fbf4046-…`, `docs/CONFIGURATEURS/c2d/README.md` |
| 30/07/2026 | Audit | État local et distant réconcilié : C0–C2d terminés, C3 non commencé, snapshot C2d actif et sécurisé, route catalogue absente au runtime. Gate finale verte jusqu'à l'étape 8/9 ; intégrations bloquées par la suppression du compte fixture distant. | `audit-etat-2026-07-30.md`, MCP Supabase, `404 NOT_FOUND`, Auth `invalid_credentials` |
| 30/07/2026 | C3-1 | Contrats stricts C3, provenance obligatoire des valeurs, faits mécaniques distincts, sorties explicables et ruleset immuable version 1. | 3 fichiers / 24 tests ciblés, typecheck et lint ciblé verts — **GO C3-2** |
| 30/07/2026 | C3-2 | Exécuteur PostgreSQL read-only sous rôle/claims réels, timeouts, RLS, catalogue d'erreurs CIR et gardes de frontière. | 5 tests unitaires + 1 intégration distante, preuves MCP rollbackées, 0 persistance — **GO C3-3** |
| 30/07/2026 | QA C3-1/C3-2 | `qa:back` et `qa:fast` verts. `pnpm run qa` valide les étapes 0 à 8 puis retrouve les 6 échecs d'intégration historiques dus à la fixture Auth absente (`auth.users` = 0). | C3-1/C3-2 verts ; gate globale finale incomplète, donc commit local sans push |
| 30/07/2026 | Déblocage QA / livraison | Fixture Auth d'intégration recréée après autorisation, profil humain actif `tcs` rattaché à CIR Bordeaux. `pnpm run qa` vert sur `9b97e8a` : 160/160 fichiers et 742/742 tests frontend, 454 tests backend, 9 intégrations distantes réussies, 0 échec, 7 ignorées. | Preuve MCP : 1 Auth confirmée, 1 profil, 1 rattachement, 0 entité / interaction résiduelle ; push de `main` autorisé |
| 30/07/2026 | C3-3 | Services catalogue actifs uniquement, détail technique complet, normalisation `fromMotor` sourcée, surcharges terrain strictes et absence décisive indéterminée. | `qa` vert : 763 frontend, 460 backend, 9 intégrations standards ; suite ciblée 11 intégrations dont fixture `tcs`, 0 échec — **GO C3-4** |
| 30/07/2026 | C3-4 | Moteur mécanique pur et déterministe pour pattes, arbre et brides ; faits absents préservés, preuves propagées, aucune donnée commerciale ni exposition tRPC. | Index C3-4 isolé : `qa` vert, 743 frontend, 501 backend, 9 intégrations standards ; suite ciblée 11 intégrations dont preuve B5 `tcs`, 0 échec — **GO C3-5** |
| 30/07/2026 | C3-5 | Moteur électrique/applicatif pur : cinq blocages électriques, informations non bloquantes, sept exigences explicites, inconnues préservées et preuves canoniques. | Worktree isolé : 60 tests C3-5, 41 C3-4, 6 normalisation, 9 shared ; `qa` vert avec 744 frontend, 561 backend et 9 intégrations, 0 échec — **GO C3-6** |
