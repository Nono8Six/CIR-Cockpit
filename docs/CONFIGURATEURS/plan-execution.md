# Configurateurs — suivi d'exécution

Ce fichier est le point d'entrée unique pour savoir où en est la brique
Configurateurs. Il complète le plan directeur
`C:\GitHub\CIR_Moteur\plan-brique-configurateurs.md` sans remplacer les preuves
de chaque tranche.

## Situation au 06/08/2026

| Tranche | Statut | Décision | Preuve |
| --- | --- | --- | --- |
| C0 — Cadrage | ✅ terminée | GO C1 | `docs/CONFIGURATEURS/00-cadrage-c0.md` |
| C1 — Schéma PostgreSQL | ✅ terminée | GO C2 | `docs/CONFIGURATEURS/01-schema-c1.md` |
| C2 — Migration des données | ✅ terminée | **GO C3** | section C2 ci-dessous |
| C3 — Compatibilité technique backend | ✅ terminée | **GO C5** | checkpoint C3-8 ci-dessous |
| C5 — Socle frontend | ✅ terminée | **GO C6** | checkpoint C5 ci-dessous |
| C6 — Première tranche verticale | ✅ technique / ❌ UX rejetée | ancien GO C7 retiré | checkpoint C6 ci-dessous |
| C7 — Reprise du parcours Remplacement | ✅ C7-4 livrée sur GO PO du 06/08/2026, reprise visuelle et UX comprise, trois écrans repris à la revue PO n°8 du 07/08/2026 ; recette PO C7-5 à faire | **NO-GO C7-5 sans décision PO distincte** | `refonte-ux-remplacement/prototype-c7-4-remplacement-moteur.html` |
| C8 à C14 | ⬜ non commencées | non autorisées | plan directeur |

**Verdict au 06/08/2026 :** C3/C4 et les fondations techniques C5/C6 sont
livrées. L'interface C6 a toutefois été rejetée par le PO : elle ne constitue
pas un parcours téléphonique compréhensible et son ancien `GO C7` est retiré.
Aucun développement C7 n'est autorisé sans validation progressive de la
reprise UX. C7-3 est validée avec un ordre déterministe et une autonomie guidée
du TCS ; C7-4 a produit, sur GO PO du 06/08/2026, un prototype testable autonome
hors du frontend applicatif.

**Prochaine décision possible :** prononcer ou non le GO C7-5, c'est-à-dire la
recette PO du parcours testable. Cette décision n'est pas présumée. Aucun code
produit, contrat API, stockage, migration, téléversement de photos, PDF, calcul
process C11 ou référence énergétique C13 n'est autorisé à ce stade.

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

Statut : **terminé le 31/07/2026 avec GO C5**. C4 est absorbée et close avec
C3. Le frontend et toute IA Configurateurs restent non commencés.

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

### Checkpoint C3-6 — équivalences, conseils, énergie et comparaison

- [x] Frontières métier read-only `fromSpec` et `fromMotor`, snapshot actif
  résolu par le catalogue existant, référence `legacy` admise et candidats
  `legacy` exclus par défaut.
- [x] Candidats évalués exclusivement par les moteurs C3-4/C3-5 ; statut
  agrégé `not_satisfied > indeterminate > under_reservation > satisfied`.
- [x] Classement sans score pondéré : verdict global, mécanique, réserves,
  faits manquants, tri demandé puis clé technique stable ; pagination
  canonique indépendante de l'ordre DB.
- [x] Conseils structurés et sourcés depuis critères, adaptations, contrôles,
  faits manquants, issues et énergie calculable ; aucune exigence ou seuil
  générique inventé.
- [x] Énergie en kWh/an seulement depuis un profil explicite et les rendements
  publiés : exact catalogue ou interpolation strictement encadrée, jamais
  d'extrapolation ni de zéro de remplacement.
- [x] Bornes pairwise dans le sens référence/candidat :
  `upper | lower | exact | indeterminate`, avec faits, seuils, formule et
  preuves.
- [x] Comparateur read-only 2 à 4 points uniques : ordre demandé et identités
  exactes préservés, `not_published` non pénalisé, dimensions en identité,
  optimum uniquement publié, optimisable et unique.
- [x] Contrats Zod stricts et bornés, `safeParse` aux frontières, règles
  immuables `motor.compatibility.cir` version `1`, champs commerciaux refusés.
- [x] **33 nouveaux tests Deno C3-6** ; passe ciblée C3-3 à C3-6 de
  **145 tests**, **24 tests Vitest shared**, lint/typecheck ciblés : 0 échec.
- [x] `qa:back` vert dans un worktree isolé : **594 tests backend**, 0 échec,
  16 intégrations conditionnelles ignorées.
- [x] `qa:fast` vert : **748 tests frontend** et **594 tests backend**, 0
  échec.
- [x] `pnpm run qa` vert dans le même worktree isolé : 748 tests frontend,
  couverture 60,34 % statements, build et 593 tests backend locaux, 0 échec.
  Les 17 scénarios distants ont été ignorés afin de respecter l'interdiction
  d'écriture/fixture distante et la vérification Supabase exclusivement MCP.
- [x] MCP Supabase en lecture seule : projet `rbjtrcorlezvocayluok`
  `ACTIVE_HEALTHY`, snapshot `6fbf4046-…` unique `active/passed`, 1 665
  modèles, 2 355 points, 5 699 rendements, 2 370 couples, 45 568 cotes,
  7 940 brides, 141 issues, 59 VFD obligatoires, 109 non-IEC, API v198 et
  inventaire moderne de migrations relu.
- [x] Aucune migration, mutation Supabase, fixture persistante, Auth/RLS,
  route tRPC, Edge Function, déploiement, frontend ou IA Configurateurs.

Fichiers :
`shared/schemas/configurator/motor.schema.ts`,
`shared/schemas/__tests__/configurator-c3-contracts.test.ts`,
`backend/functions/api/services/configurator/motorCatalog.ts`,
`motorC3Determinism.ts`, `motorEquivalence.ts`, `motorAdvice.ts`,
`motorEnergy.ts`, `motorCompare.ts` et leurs tests.

Limitations explicites : une charge non encadrée, une qualification normative
absente ou une donnée décisive non publiée reste `indeterminate`. Les 141
issues catalogue restent visibles et contraignent les conclusions. Aucun coût
annuel ni temps de retour n'est contractualisé. Les opérations C3-6 n'ont
aucune surface tRPC ou preuve runtime avant C3-7.

Décision de sortie : **GO C3-7**. C3 reste globalement en cours ; C3-7 et C3-8
ne sont pas commencés.

### Checkpoint C3-7 — surface tRPC authentifiée

- [x] Sept procédures exposées aux chemins exacts
  `configurator.motor.catalog.list/get`,
  `configurator.motor.equivalents.fromMotor/fromSpec`,
  `configurator.motor.advice.build`, `configurator.motor.energy.compute` et
  `configurator.motor.compare`.
- [x] Sept queries `authedProcedure`, zéro procédure publique et zéro mutation
  métier.
- [x] Contrats `.input()` et `.output()` réutilisés depuis
  `shared/schemas/configurator/motor.schema.ts`, avec surface typée partagée et
  routeur backend alignés.
- [x] Adaptation minimale vers les services C3 existants ; `db`,
  `authContext` et `requestId` restent transmis par l'abstraction CIR.
- [x] Seul `Authorization: Bearer ...` est accepté ;
  `x-client-authorization` reste ignoré.
- [x] Entrée invalide convertie en `INVALID_PAYLOAD` avec détails français ;
  sortie Configurateurs invalide convertie en
  `CONFIGURATOR_OUTPUT_INVALID`, sans erreur tRPC brute ni diagnostic interne.
- [x] Tests ciblés : **11 tests Deno tRPC** et **1 test Vitest shared portant
  14 assertions de type**, 0 échec ; check Deno et typecheck frontend verts.
- [x] `qa:back` vert : parité dépôt, 162 fichiers backend lintés, typecheck
  Deno et **600 tests backend réussis**, 16 intégrations conditionnelles
  ignorées.
- [x] `qa:fast` vert : parité dépôt, typecheck/lint frontend,
  **162 fichiers / 784 tests frontend**, conformité erreurs, lint/typecheck
  backend et **600 tests backend réussis**, 16 intégrations conditionnelles
  ignorées.
- [x] Aucune migration, mutation Supabase, fixture Auth, intégration distante,
  modification frontend visible, Edge Function ou déploiement.

Fichiers :
`shared/api/trpc.ts`,
`shared/api/__tests__/configurator-trpc-contracts.test.ts`,
`backend/functions/api/trpc/configuratorMotor.ts`,
`backend/functions/api/trpc/configuratorMotor_test.ts`,
`backend/functions/api/trpc/router.ts`,
`backend/functions/api/trpc/procedures.ts` et
`backend/functions/api/trpc/appRoutes_test.ts`.

Limites explicites : C3-7 est prouvé localement uniquement. Les probes
authentifiées sur l'Edge Function distante, les preuves RLS par rôle,
`EXPLAIN ANALYZE`, la performance et le déploiement restent réservés à C3-8.

Décision de sortie : **GO C3-8**. C3 reste globalement en cours ; C3-8 n'est
pas commencé.

### Checkpoint C3-8 — QA, performance et livraison distante

- [x] Préflight MCP : projet `rbjtrcorlezvocayluok` `ACTIVE_HEALTHY`,
  migrations C0-C2d présentes, `api` v198 active, `verify_jwt=false` conservé
  car l'authentification reste gérée par le backend.
- [x] Tests ciblés : 11 Deno tRPC et 1 Vitest shared portant 14 assertions de
  type, 0 échec ; lint/check Deno, ESLint shared et typecheck frontend verts.
- [x] `qa:back` : parité dépôt/distant, 162 fichiers lintés, 600 tests backend
  réussis, 16 intégrations conditionnelles ignorées, 0 échec.
- [x] `qa:fast` : 162 fichiers / 785 tests frontend et 600 tests backend,
  0 échec.
- [x] `qa` : 785 frontend, build et couverture verts, 600 backend, 9
  intégrations distantes réussies, 8 ignorées, 0 échec.
- [x] Matrice RLS complète : `anon` refusé en `42501`, `tcs` et
  `super_admin` actifs autorisés, écriture refusée par la transaction read-only
  en `25006`. Pour `agency_admin`, le profil `super_admin` rattaché a été
  requalifié uniquement dans une transaction de preuve, puis l'exception
  contrôlée `P0001` a forcé le rollback : 1 snapshot et 2 355 points visibles,
  0 `agency_admin` persistant après relecture.
- [x] Plans réels mesurés : snapshot 0,140 ms ; liste 20,477 ms ; détail
  2,945 ms ; équivalents 20,820 ms ; rendements 5,938 ms ; seuil énergie
  3,148 ms ; comparaison de quatre points 6,982 ms. Aucun `Seq Scan`, bloc
  disque ou spill temporaire ; aucun index manquant démontré.
- [x] Déploiement MCP de la seule Edge Function `api` : v198 -> v199,
  `ACTIVE`, wrapper et import map conformes, `verify_jwt=false`, empreinte
  `c22e3ac01f81880ec27a00807c6a796f73f9c1bb01e4ff95fa7926d60db6b07e`.
- [x] Sept probes authentifiées répétées deux fois, sorties validées par les
  schémas partagés et snapshot actif résolu dynamiquement. Latences : liste
  1,213-1,412 s ; détail 1,426-1,498 s ; équivalences depuis moteur
  6,772-7,067 s ; depuis spécification 5,721-6,723 s ; conseil 0,991-1,015 s ;
  énergie 1,488-1,721 s ; comparaison quatre moteurs 1,901-2,643 s.
- [x] `request_id` du dernier passage : liste `612e6d48…`, détail
  `8c2560b9…`, équivalents moteur `090d00c7…`, équivalents spécification
  `3f93794b…`, conseil `c5b2e329…`, énergie `054f214f…`, comparaison
  `adb90b4d…`.
- [x] Négatifs : sans Authorization et header historique seul -> 401
  `AUTH_REQUIRED`; invalide -> 400 `INVALID_PAYLOAD`; absent -> 404
  `CONFIGURATOR_OPERATING_POINT_NOT_FOUND`; CORS autorisé -> 200, refusé ->
  403. Tous portent un `x-request-id`, sans token, secret, SQL, stack ou
  diagnostic interne.
- [x] Timeouts conservés à 5 s/1 s et aucun timeout DB. Le flux MCP des logs
  Edge est retardé mais les premières entrées v199 corrèlent le probe
  diagnostique (`catalog.list` 200 puis `catalog.get` 400 avant correction du
  script). Les lignes ne contiennent que méthode, statut, URL, durée et
  version, sans payload, token, SQL, stack ou secret. Ce retard et les
  5,7-7,1 s des équivalences sont des risques C5 non bloquants ; aucun index
  ne les corrige.

Décision de sortie : **GO C5**. C3/C4 est terminé ; `api` v199 est active.
Aucune migration, donnée, RLS/ACL/index, autre Edge Function, frontend,
commit, push ou C5 n'a été modifié/démarré.

## C5 — Socle frontend

Statut : **terminé le 31/07/2026 avec GO C6**. Décision PO du 31/07/2026 : C5 et
C6 sont livrés ensemble, un socle sans écran métier ne pouvant pas être jugé.

- [x] Entrée `Configurateurs` dans la navigation, section dédiée, raccourci `F6`,
  reprise automatique dans la palette `Ctrl+K`.
- [x] Routes TanStack `/configurateurs`, `/configurateurs/moteurs`,
  `/configurateurs/moteurs/$journeyId` et `/configurateurs/mes-configurations`,
  chargées en `lazy` hors bundle principal. `/configurateurs` redirige vers le
  configurateur moteur tant qu'un seul domaine existe ; un segment de parcours
  inconnu renvoie à l'accueil moteurs sans page d'erreur.
- [x] Couche tRPC frontend des **sept** routes, chaque réponse revalidée par le
  schéma partagé ; une sortie hors contrat devient `CONFIGURATOR_OUTPUT_INVALID`
  et jamais un rendu partiel.
- [x] Hooks et clés de cache sous une racine unique `configurator-motor`,
  invalidable en une fois à l'activation d'un snapshot. Le snapshot n'entre pas
  dans la clé : il est résolu par le backend.
- [x] Composants transverses : verdict (quatre états), mosaïque critère par
  critère, jauge de couverture `n/N`, provenance, grade documentaire, preuves en
  dialog et en citation inline, faits manquants, adaptations, contrôles,
  anomalies, identité et conflit de catalogue.
- [x] États livrés : chargement, attente longue avec temps réellement écoulé,
  vide, partiel, erreur avec reprise, conflit de snapshot.
- [x] Support `prefers-reduced-motion` ajouté au dépôt, qui n'en avait aucun.
- [x] Quatre états métier couverts exactement par le contrat partagé ; test
  garantissant qu'aucune formulation n'emploie le mot « garantie ».

## C6 — Première tranche verticale

Statut technique : **livré le 31/07/2026**. Décision PO du 04/08/2026 :
**UX rejetée, ancien GO C7 d'implémentation retiré**. Les fondations techniques
restent réutilisables ; seule la découverte C7-1 est autorisée.

- [x] Parcours Remplacement ouvert sur `/configurateurs/moteurs/remplacement`.
- [x] **Entrée par défaut : saisie libre de plaque signalétique**, conformément
  au plan directeur §4.4 — le moteur en place du client est le plus souvent hors
  catalogue CIR. Trois champs contractuels seulement ; tout le reste facultatif.
- [x] Entrée secondaire conservée : référence déjà présente au catalogue
  technique, via `equivalents.fromMotor`.
- [x] Aucune valeur fabriquée : un champ vide reste vide et devient un fait
  manquant. Une valeur dictée est `origin=nameplate`,
  `confirmation=unconfirmed`, avec sa preuve de relevé.
- [x] Panneau « À demander au client » : les faits manquants renvoyés par le
  backend, classés par le nombre de candidats qu'ils permettraient de trancher.
  Aucun recalcul de règle, seulement un décompte d'affichage.
- [x] Verdict explicable en dialog centré : phrase du backend, adaptations,
  contrôles, faits manquants, détail critère par critère, anomalies.
- [x] Attente réelle de 5,7 à 7,1 s rendue par un compteur du temps écoulé, sans
  progression fictive.
- [x] Reprise UI/UX du 31/07/2026 : relevé et résultats séparés, lancement de la
  recherche explicitement déclenché (jamais à chaque frappe), questions
  restantes actionnables, résultats en cartes sur mobile et panneau de questions
  prioritaire sur petit écran.
- [x] Fréquence préremplie à 50 Hz et alimentation préremplie à `vfd` sur décision
  PO. Les valeurs restent visibles et modifiables avant la recherche.
- [x] Provenance corrigée : une cote saisie est une `user_measurement` confirmée
  avec preuve de mesure client, jamais une valeur `nameplate`. En B14/B34, `S`
  est saisi comme filetage (`S_thread`, par exemple M8), sans diamètre inventé.
- [x] Aide visuelle à deux niveaux : moteur générique photoréaliste consultable
  sous quatre angles pour orienter le client, et schéma déterministe surligné
  pour indiquer où poser le mètre. La vue réaliste est explicitement non
  contractuelle et n'est jamais utilisée comme preuve catalogue.

### Preuves

- `pnpm run qa:front` vert : parité dépôt locale, typecheck, lint,
  **169 fichiers / 887 tests frontend**, conformité erreurs.
- Accessibilité : `vitest-axe` sur l'accueil moteurs et sur l'écran de résultats,
  **0 violation**. Deux violations `definition-list`/`dlitem` détectées puis
  corrigées.
- Parcours Playwright réel rejoué après la reprise UI/UX : recherche explicite,
  vue réaliste côté bride, résultats desktop et mobile, dialog candidat — 1/1
  scénario vert. Captures actualisées dans `frontend/e2e-proof-configurator-c5/`.
- Validation navigateur réelle sous Playwright, fixture `tcs`, Edge Function
  `api` v199 : `frontend/e2e/configurator-c5-visual.spec.ts`, captures dans
  `frontend/e2e-proof-configurator-c5/`. Parcours complet joué de bout en bout —
  25 candidats retournés pour 11 kW / 4 pôles / 50 Hz / réseau / B35, tous
  `indéterminé` faute de cotes, ce qui est le verdict correct.
- Un bug runtime réel a été trouvé par cette validation et corrigé : les tooltips
  du domaine n'avaient pas de `TooltipProvider`, l'écran de résultats plantait.
  Les assertions E2E ont été durcies pour qu'une page en erreur ne puisse plus
  faire passer le test.

### Limites explicites

- Les trois autres parcours (Consultation C10, Application C11, Pas à pas C12)
  et les configurations sauvegardées (C8) déclarent leur tranche d'ouverture et
  restent non commencés.
- Aucune migration, mutation Supabase, Edge Function, déploiement ni IA.

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

## C7 — Reprise du parcours Remplacement

Statut : **C7-0 à C7-4 terminés — C7-4 livrée le 06/08/2026 sur GO PO distinct,
trois écrans repris le 07/08/2026 à la revue PO n°8 / NO-GO C7-5, contrats, code
produit, stockage et migration sans décision distincte**.

- [x] **C7-0 — Recadrage.** Le rejet de l'UX C6 est acté ; le dossier v6 est
  reclassé comme hypothèse de travail ; les frontières C7/C8/C9/C11/C13 sont
  explicites.
- [x] **C7-1 — Découverte et validation PO du parcours.** Cinq simulations de co-conception ont
  produit le breadboard v2 : application obligatoire avant solution techniquement
  validée, photo conditionnelle, brides entièrement guidées, candidat technique et
  solution techniquement validée distincts. Le cas courroies ajoute la cause de panne, l'ancienneté et
  le contrôle radial ; le cas vertical sépare moteur, ventilation forcée et auxiliaires ;
  le cas ATEX ouvre une qualification spécialisée et bloque toute validation standard.
  Le PO, seul porteur du projet et connaissant le travail du TCS, accepte ces cinq rejeux
  comme preuve de sortie C7-1. L'échantillon à participant unique reste documenté sans
  constituer un blocage artificiel.
- [x] **C7-2 — Modèle conceptuel.** Moteur installé, installation, montage,
  application et fonction, faits/source/preuve, contrôles, références évaluées,
  réserves et quatre états définis. Les relations et cycles de vie sont nommés ;
  S1 à S5 passent sans invention ni donnée commerciale.
- [x] **C7-3 — Structure du parcours.** Cinq lieux logiques, flux nominal sans photo,
  arbre déterministe question après question, conservation des faits spontanés, aide pour
  trouver chaque information, demande photo ciblée, attente et reprise exactes, corrections
  avec réouverture des dépendances, branches conditionnelles, énergie sans démarrer C11/C13
  et qualification spécialisée en dernier recours sont documentés. Le PO a validé le
  livrable après ces deux corrections ; cette validation n'autorise pas C7-4.
- [x] **C7-4 — Prototype testable.** Prototype HTML autonome
  `refonte-ux-remplacement/prototype-c7-4-remplacement-moteur.html` : une seule
  étape active à la fois, ordre imposé par l'arbre déterministe, contrôles ouverts
  uniquement par les réponses, recherche déclenchée explicitement, quatre états
  exacts et scénarios S1 à S5 rejouables. Aucun code produit, aucun contrat, aucun
  stockage et aucun faux calcul métier.
- [ ] **C7-5 — Recette PO du parcours.** Rejouer les scénarios sur le parcours testable et
  mesurer la compréhension, les retours arrière et les blocages.
- [ ] **C7-6 — Validation métier.** Faire valider séparément alertes, règles de
  déduction, seuils et limites d'expertise.
- [ ] **C7-7 — Décisions de contrats.** N'ouvrir les changements de schémas/API
  qu'après validation du besoin et de la provenance attendue.
- [ ] **C7-8 — Implémentation.** Construire uniquement le parcours validé sur les
  fondations réutilisables de C6.
- [ ] **C7-9 — QA et recette.** Vérifier les scénarios, l'accessibilité, les
  contrats et le rendu réel avant décision de sortie.

**Décision de sortie C7-0 :** GO C7-1 découverte uniquement. Aucun composant de
production, contrat partagé, règle métier, stockage, PDF ou calcul énergétique
n'est autorisé par cette décision.

**Décision de sortie C7-2 :** GO C7-3 structure du parcours uniquement. Le modèle
conceptuel, ses quatre états, ses relations, le cycle du fait et les cinq rejeux sont
documentés dans `refonte-ux-remplacement/05-modele-conceptuel.md`. Cette décision
n'autorise toujours ni design, prototype, contrat, code, stockage ou migration.

**Checkpoint C7-3 :** le livrable `refonte-ux-remplacement/06-structure-parcours.md`
est validé par le PO depuis le 06/08/2026 après intégration des deux corrections sur
l'ordre déterministe et l'autonomie guidée du TCS. Cette validation ne prononce aucun
GO C7-4 : design, prototype, contrat, code, stockage et migration restent interdits
jusqu'à une décision de sortie distincte. Le support autonome
`refonte-ux-remplacement/validation-c7-3.html` a servi à cette revue en 5 décisions ;
il ne constitue pas le prototype produit C7-4.

**Checkpoint C7-4 :** le prototype testable est
`refonte-ux-remplacement/prototype-c7-4-remplacement-moteur.html`, fichier autonome
sans réseau, sans dépendance et sans stockage. Correction PO appliquée au préalable
dans `02-specification-parcours-cible.md` et `06-structure-parcours.md` : le
configurateur présente des questions et des choix courts, il n'impose aucune
formulation à réciter, et l'aide contextuelle facultative sert à comprendre,
reconnaître, localiser ou mesurer une information.

Ce que le prototype rend testable :

- [x] Démarrage d'un nouveau remplacement et reprise d'un parcours interrompu au
  point exact de l'interruption, pas au début ni au premier fait manquant.
- [x] Arbre déterministe en six groupes, une seule question active, raison de
  l'étape affichée, aucune question déjà satisfaite reposée.
- [x] Enregistrement de faits donnés spontanément et saut automatique des étapes
  correspondantes, sans rendre l'ordre libre.
- [x] Contrôles conditionnels ouverts par les seules réponses : bride, charge
  radiale, charge axiale, variateur, auxiliaire, environnement, ATEX, cause.
- [x] Mesures guidées avec repère visuel et procédure : diamètre extérieur de
  bride et diamètre de la poulie moteur.
- [x] Demande de photo ciblée nommant objet, cadrage et but, attente non
  bloquante, poursuite sur un nœud indépendant, reprise exacte, photo inutilisable
  et abandon conservant l'inconnue.
- [x] Correction d'un fait avec liste préalable des dépendances rouvertes, retrait
  des conclusions et recul d'état.
- [x] Recherche déclenchée explicitement, périmètre interrogé affiché, résultat
  vide expliqué sans affirmer d'impossibilité universelle.
- [x] Candidat technique avec réserves nommées, solution techniquement validée
  bornée au périmètre, qualification spécialisée justifiée et dossier de transfert.
- [x] Invitation énergétique séparée de l'état technique, sans montant ni promesse.
- [x] Aucune référence catalogue, cote, limite constructeur ou économie fabriquée :
  un bandeau permanent indique que les verdicts proviennent du relevé saisi.

Corrections PO du 06/08/2026 intégrées après première revue du prototype :

- [x] **Détail des options.** Frein, codeur ou sondes, deuxième bout d'arbre, deux
  vitesses et capot pare-pluie ouvrent chacun leurs propres questions au lieu de
  rester une simple case cochée. Rien n'est hérité du moteur principal.
- [x] **Phases avant tension.** Le nombre de phases est demandé avant la tension ;
  les tensions proposées suivent ensuite monophasé ou triphasé, et corriger les
  phases invalide la tension lue.
- [x] **Fréquence sans semer le doute.** L'étape devient une confirmation adressée
  au TCS, avec la mention explicite de n'interroger le client que hors réseau
  standard. Le fait reste consigné, jamais présupposé.
- [x] **Motoréducteur à montage intégré.** La transmission distingue le réducteur
  accouplé, qui reste IEC, du moteur monté directement sur un réducteur, qui sort
  du périmètre standard et ouvre une qualification spécialisée.
- [x] **Carcasses restreintes par la puissance.** Trois hauteurs d'axe fréquentes
  sont proposées d'abord, toute la liste reste à un clic, et la note rappelle qu'un
  ancien IE1 peut porter une carcasse plus petite qu'un IE3 de même puissance.
  Cette restriction est un affichage, jamais une déduction : elle reste à valider
  en C7-6.
- [x] **Positions de montage complétées.** Horizontal au sol, horizontal fixé au mur
  ou au plafond, vertical arbre vers le bas, vertical arbre vers le haut, incliné et
  orientation non identifiée. Un nouveau contrôle « support et exposition » s'ouvre
  sur mur, plafond, incliné ou vertical.
- [x] **Causes de remplacement élargies.** Quinze causes déclarables au lieu de
  quatre, dont onze ouvrent l'hypothèse de cause sans jamais devenir un diagnostic.

Revue PO n°2 du 06/08/2026 — trois corrections de fond :

- [x] **Chaque étape annonce son effet.** « Pourquoi maintenant » devient « Ce que
  votre réponse ouvre ou ferme », renseigné sur les 37 nœuds. L'aveu est explicite
  quand l'effet est faible : la tension de plaque n'ouvre aucun contrôle, la
  carcasse non plus, et la fonction process ne fait pour l'instant que débloquer le
  niveau candidat.
- [x] **Contrôle radial refondu et honnête.** Le nombre de courroies est supprimé :
  seul, il ne détermine aucun effort. Restent les deux entrées décisives — diamètre
  de la poulie moteur et **porte-à-faux**, nouveau et mesuré depuis l'épaulement —
  plus un fait explicite sur la disponibilité de la **charge radiale admissible
  publiée**. Sans cette limite, le contrôle ne peut plus se clore : il reste une
  réserve nommée. La retension récente est déplacée vers l'hypothèse de cause, où
  elle n'affecte pas la compatibilité. C7 ne calcule aucun effort ; la comparaison
  effort/limite appartient au dimensionnement process.
- [x] **Options refondues en écrans de détail.** Frein, accessoire arrière, deuxième
  bout d'arbre, capot et deux vitesses ouvrent chacun un écran de champs courts,
  avec « non lisible » champ par champ. Le frein demande type à manque ou à appel de
  courant, couple, tension, alimentation réelle et déblocage manuel ; l'accessoire
  arrière demande sa nature, son marquage, son raccordement et son nombre de fils ;
  les deux vitesses relèvent les deux vitesses et les deux puissances. Chaque champ
  est un fait distinct avec sa propre source, corrigible séparément.
- [x] **Schémas cotés ajoutés** au vocabulaire réel du catalogue : bride vue de face
  cotée P/M/N/S, bride en coupe cotée T, pattes cotées H/A/K, bout d'arbre coté
  D/E/F, porte-à-faux de poulie et planche des positions de montage IM B3, B5, B14,
  B35, V1, V3, mur/plafond et incliné.

Revue PO n°3 du 06/08/2026 — **règle du tout factuel**. Décision : une question
n'existe que si sa réponse alimente un fait réellement comparé par le contrat de
compatibilité. Collecter un fait sans calcul derrière ne sert à rien.

**Revue PO n°4, même jour — correction de trajectoire.** La lecture stricte du
contrat avait conduit à demander au client le couplage, le courant, le couple, la
classe IE et l'ensemble des cotes A/B/C/K, M/N/P/S/T/Z et D/E/F. Le PO a rejeté
cette version : au téléphone, personne ne fait mesurer six cotes à un client, et
ces cotes sont normalisées et publiées au catalogue. L'erreur était de confondre
« le contrat compare ce champ » avec « il faut le demander au client » : dans le
contrat, `field_overrides` est optionnel et exige des mesures confirmées et
prouvées — ce sont des exceptions, pas des saisies de parcours. Le chemin normal
reste `fromMotor`, où les cotes arrivent du catalogue avec leur provenance.

Arbre rétabli dans son état antérieur, avec deux différences seulement :

- le détail du contrôle radial reste supprimé, conformément à la revue n°3 :
  nombre de courroies, diamètre de poulie, porte-à-faux et charge radiale
  admissible ne produisaient aucun calcul dans C7 ;
- la bride conserve sa **confirmation** : nature des trous puis diamètre extérieur,
  seule cote que le TCS fait confirmer parce qu'elle départage réellement.

Écartés définitivement : couplage, courant nominal, couple nominal, classe IE,
cotes de pattes A/B/C/K, cotes de bride M/N/P/S/T/Z et cotes d'arbre D/E/F.

Périmètre du contrat, conservé pour mémoire :

Faits réellement comparés, et eux seuls :

| Bloc du contrat | Champs |
| --- | --- |
| `motorElectricalSpecSchema` | `power_kw`, `speed_rpm`, `poles`, `network`, `frequency_hz`, `supply_mode`, `voltage_v`, `coupling`, `rated_current_a`, `rated_torque_nm`, `efficiency_class` |
| `motorMechanicalSpecSchema` | pattes `A B C H K`, arbre `D D_fit_tolerance E F`, bride `bore_type` + `M N P S/S_thread T Z` |
| `motorApplicationRequirementsSchema` | `ip_rating`, `brake_required`, `vfd_required`, `cooling_method`, `duty_service`, `ambient_temperature`, `starts_per_hour` |

- [x] **Supprimé faute de calcul derrière** : nombre de courroies, diamètre de
  poulie, porte-à-faux et charge radiale admissible. Aucun de ces faits ne produit
  de calcul dans C7 ; la comparaison effort/limite appartient au dimensionnement
  process.
- [x] **Rétabli après la revue n°4** : position de montage et reprise d'effort
  axial, exposition, transmission avec détection du motoréducteur intégré, cause de
  remplacement et ancienneté, grille des particularités et écrans de détail des
  options, ventilation forcée, variateur, environnement et ATEX.
- [x] **Confirmation de bride conservée** : nature des trous puis diamètre
  extérieur, avec sa procédure de mesure et son schéma coté. *Révisé le
  06/08/2026 : la nature des trous n'est plus une question, elle se déduit de la
  construction reconnue ; seul le diamètre reste confirmé. Voir « Clôture des
  écarts » plus bas.*
- [x] **Chaque étape annonce son effet** : « Ce que votre réponse ouvre ou ferme »,
  y compris quand l'effet est faible ou nul.

Écart connu et assumé : l'application et la fonction process n'ouvrent pas encore
les questions contextuelles prévues par `02-specification-parcours-cible.md`
§« L'application choisit la question suivante ». La ligne d'effet de l'étape le dit
explicitement au TCS. À traiter avant la recette C7-5.

Exigence PO enregistrée pour l'implémentation : sur le produit réel, les visuels
doivent être des plans cotés d'une fidélité redoutable — brides dans toutes les
constructions, positions de montage, cotes à mesurer surlignées — générés depuis
les cotes réelles du catalogue plutôt que dessinés à la main.

### Reprise visuelle et UX du 06/08/2026

Demande PO : approfondir l'UI/UX, améliorer les questions des écrans d'options et
surtout les visuels — 2D détaillés, plaque signalétique reproduite fidèlement, et
à chaque fois l'information demandée entourée en rouge.

- [x] **Bibliothèque de dessin technique** intégrée au prototype : primitives de
  texte et de forme, lignes de cote avec traits d'attache et flèches pleines,
  hachures de coupe, axes en trait mixte, familles de nervures, et un anneau
  d'annotation rouge animé. Aucun fichier externe, aucune image bitmap, aucun appel
  réseau : tout est du SVG construit à l'exécution.
- [x] **Règle de couleur unique** : le rouge n'entoure que l'information exactement
  demandée par l'étape en cours. Aucun autre usage décoratif du rouge dans les
  figures.
- [x] **Plaque signalétique fidèle et paramétrable** : plaque rivetée au format
  IEC 60034-1 avec bandeau constructeur et marquage CE, ligne Type / N° de série /
  IP, tableau des deux couplages en V, Hz, kW, tr/min, A et cos φ, pictogramme de
  couplage triangle-étoile, bande de service Cl./S1/IE/Ta/masse/année et
  code-barres. Onze zones surlignables : `ph`, `type`, `ip`, `v`, `hz`, `kw`,
  `rpm`, `courant`, `couplage`, `annee` et la variante deux vitesses. Trois plaques
  rapportées dérivées : auxiliaire de ventilation forcée, frein, marquage Ex.
- [x] **Vingt et un schémas 2D** : élévation complète du moteur — capot et grille,
  ailettes, flasques et boulonnerie, boîte à bornes et presse-étoupe, anneau de
  levage, pattes fendues, bout d'arbre clavetté, plaque sur le flanc ; bride vue de
  face cotée P/M/N/S ; **coupe comparée trou traversant / trou taraudé**, qui rend
  visible la seule différence que le TCS fait constater ; cotes de pattes H/A/B/K ;
  cotes de bout d'arbre D/E/F ; planche des huit positions de montage ; chaîne
  moteur → liaison → machine → process ; armoire et variateur avec fréquence
  affichée ; montage vertical et chemin de la poussée axiale ; frein, ventilation
  forcée, codeur, deuxième bout d'arbre, capot pare-pluie, motoréducteur intégré,
  boîte à bornes ouverte ; vignettes de galerie des six constructions et des trois
  liaisons.
- [x] **Repère visuel de premier plan** : la figure n'est plus enfouie dans l'aide
  repliée. Elle occupe une surface dédiée sous la question, avec une légende qui
  nomme en toutes lettres ce qui est entouré en rouge. Repliable au clavier par
  `V`, agrandissable en dialog centré — le clic sur la figure suffit, ce qui rend
  la lecture possible sur mobile.
- [x] **Écrans d'options repris** : la grille des particularités et celle des
  conditions d'environnement deviennent des grilles à pictogrammes ; chaque champ
  des écrans de détail — frein, ventilation forcée, capteur, ATEX — reçoit un
  repère de terrain qui dit où regarder et comment reconnaître, sans ajouter aucun
  fait au relevé. Les vignettes de construction distinguent désormais à l'œil les
  trous traversants, dessinés ouverts, des trous taraudés, dessinés filetés.
- [x] **Aucun fait ajouté au relevé.** La revue n°4 avait corrigé la confusion
  entre « le contrat compare ce champ » et « il faut le demander au client » : la
  reprise visuelle ne rouvre pas cette porte. Elle n'améliore que la formulation,
  les repères de lecture et les figures.

Preuves de validation, rejouées dans le navigateur in-app le 06/08/2026 sur
`http://localhost:8777` (serveur statique temporaire, arrêté depuis) :

- Parcours nominal sans photo joué depuis le démarrage : puissance, vitesse,
  tension, fréquence, alimentation, machine, fonction, carcasse, galerie des
  constructions, puis contrôle de bride.
- Faits spontanés consignés et étapes sautées sur les cinq scénarios : 4 (S1),
  12 (S3), 9 (S4) et 11 (S5) faits d'entrée.
- Correction de la transmission après une solution validée : contrôle « Charge
  radiale » rouvert, résultat retiré, retour en recherche préliminaire.
- Attente de photo sur la mesure de poulie, poursuite sur l'étape indépendante,
  puis reprise exacte du parcours interrompu sur l'alimentation de l'auxiliaire.
- Candidat technique sous réserve radiale (S3), puis solution techniquement
  validée après clôture du contrôle.
- ATEX (S5) : état qualification dès le signal, dossier de transfert complet avec
  motif, question experte, documents attendus et point de reprise.
- Résultat vide expliqué sur moteur intégré ou non-IEC.
- Rendu desktop 1440x900, mobile 375x812 et 320x720 : aucun débordement
  horizontal (`scrollWidth` = `clientWidth`), aucune erreur console.
- Clavier : chiffres pour choisir, Entrée pour valider une saisie ou une grille,
  `A` pour l'aide, `V` pour replier le repère visuel, Échap pour fermer un dialog,
  tabulation complète avec anneau de focus visible.
- `pnpm run qa:docs` vert.

Preuves de la reprise visuelle, rejouées le 06/08/2026 sur un serveur statique
temporaire `http://localhost:8777`, arrêté depuis :

- **Les figures ont cette fois été revues à l'œil**, une par une, dans une planche
  de contrôle affichant les vingt-six couples figure/surlignage. Six défauts de
  composition ont été corrigés à cette occasion : mention « Made in EU » sous un
  rivet, libellé de boîte à bornes mordu par son anneau, texte du bornier recouvert
  par l'annotation, texte ATEX recouvert par l'annotation, libellé de plaque de
  frein pris dans l'anneau, et surface au sol dessinée sous le montage plafond
  au lieu d'un plafond.
- Position de montage V1 arbre vers le bas et V3 arbre vers le haut vérifiées
  distinctes ; l'anneau des positions couvre bien les verticales **et** l'incliné,
  conformément à la légende.
- Parcours complet rejoué en 320 × 720 avec relevé de `scrollWidth` contre
  `clientWidth` à chaque étape : aucun débordement horizontal, y compris sur les
  grilles à pictogrammes et les écrans de détail d'options.
- Agrandissement de la figure en dialog centré vérifié en 375 × 812 : la plaque
  redevient lisible là où la vignette en ligne ne suffit pas.
- Rendu 1440 × 900 avec le relevé latéral : question, repère visuel, saisie et
  actions tiennent au-dessus de la ligne de flottaison.
- Recherche lancée depuis ce parcours : périmètre correct, état technique correct,
  aucun débordement.
- Aucune erreur console sur l'ensemble du parcours.

### Vérification profonde du 06/08/2026 — écarts relevés

Contrôle du prototype contre le backend réel (Supabase MCP, lecture seule, projet
`CIR_Cockpit`, Edge Function `api` v199) et contre les documents C7-1 à C7-3.
Les sept routes tRPC du configurateur sont bien en place et le catalogue est
peuplé : 10 158 modèles, 14 130 points de fonctionnement, 47 598 options de bride
et 253 764 cotes sur le snapshot actif.

Corrigé dans le prototype, parce que le catalogue prouve l'erreur :

- [x] **Liste des carcasses incomplète.** Les hauteurs d'axe 56, 400 et 450
  existent au catalogue et manquaient à la liste fermée : un moteur de carcasse
  400 ne pouvait pas être consigné autrement qu'en « ligne illisible », ce qui est
  une fausse déclaration. Liste complétée.
- [x] **Raccourci des carcasses par puissance infirmé.** L'hypothèse d'affichage
  se trompait sur dix des douze tranches testées : elle proposait des carcasses
  inexistantes à cette puissance — 100 à 5,5 kW, 112 à 7,5 kW — et en omettait
  systématiquement d'autres qui existent. Les ensembles sont désormais relevés sur
  le catalogue. Réserve ouverte : au-delà de 30 kW la tranche compte sept à neuf
  carcasses réelles, donc le raccourci n'en est plus un ; le garder ou le retirer
  est une décision PO de C7-6.
- [x] **Bornes de diamètre de bride fausses.** Le prototype rejetait toute valeur
  au-dessus de 800 mm alors que les brides B5/B35 vont jusqu'à 1 150 mm, et
  acceptait des valeurs sous 80 mm qui n'existent nulle part. Bornes reprises sur
  la plage réelle du catalogue, avec marge de mesure dictée.

Traité le 06/08/2026 après arbitrage PO :

- [x] **La nature des trous n'est plus une question, c'est une déduction.** Le PO a
  corrigé la prémisse : B14 est taraudé et B5 est lisse, c'est factuel. Il n'y
  avait donc pas une contradiction à policer mais **un fait demandé deux fois**,
  contre la règle posée à la revue n°6. L'étape « trous traversants ou taraudés »
  est supprimée ; la nature des trous est consignée comme déduction sourcée
  « Règle technique · Déduction depuis la construction reconnue », exactement comme
  la polarité déduite d'une vitesse lue. L'observation des trous devient ce qu'elle
  est vraiment : le moyen de départager grande et petite bride **dans** l'étape de
  fixation, portée par sa note, son aide et sa figure en coupe. L'arbre passe de 29
  à 28 nœuds et le contrôle de bride ne porte plus que la confirmation du diamètre.
- [x] **Cotes A et B : libellés corrigés au catalogue.** Migration additive
  `20260807094550_configurator_c7_fix_canonical_ab_labels` appliquée par
  `apply_migration` sur autorisation PO explicite, avec bloc de vérification qui
  échoue bruyamment si l'état final n'est pas celui attendu. A redevient « entraxe
  transversal des pieds », B « entraxe longitudinal ». Les valeurs mesurées n'ont
  pas été touchées : elles suivaient déjà la convention IEC, A valant 140, 216, 279
  et 406 mm pour les carcasses 90, 132, 180 et 250.
- [x] **Documents remis en cohérence.** `02` §« Tronc commun » porte les six
  groupes réels — Plaque, Usage, Construction, Installation, Équipements,
  Environnement — avec la mention de la revue n°6 qui les a décidés ; `02`
  §« Branches » et `06` §7 marquent la branche de charge radiale comme supprimée à
  la revue n°3, motif inclus, plutôt que de la décrire comme active ; `04` §2.2
  remplace le type d'accouplement à huit valeurs par la liaison à trois valeurs.
- [x] **Vocabulaire de verdict aligné.** Le prototype écrit désormais
  `under_reservation` comme `overall_status` du contrat tRPC, jetons et sélecteur
  CSS compris, pour qu'aucune traduction implicite ne s'installe.
- [x] **Raccourci des carcasses conservé.** Décision PO : le mécanisme reste actif
  partout, y compris dans le haut de gamme où la tranche compte sept à neuf
  carcasses réelles. Les ensembles sont ceux du catalogue.
- [x] **Deux vitesses : sortie et motif inchangés.** Décision PO : le parcours
  continue d'envoyer les moteurs à deux vitesses en qualification spécialisée avec
  le motif actuel. Les 240 modèles Dahlander du catalogue restent consignés ici
  comme donnée connue, sans effet sur le parcours.

### Revue PO n°7 du 06/08/2026 — cinq écrans repris sur captures

Le PO a relu le parcours écran par écran et relevé cinq défauts. Un d'entre eux
était un **défaut fonctionnel**, pas seulement visuel.

- [x] **Un moteur à bride IEC sur réducteur partait à tort en qualification.**
  « Monté sur le réducteur » confondait deux cas que rien ne rapprochait : un
  moteur boulonné sur une lanterne IEC, qui se démonte seul et se remplace
  normalement, et un moteur intégré dont l'arbre est le pignon d'entrée. La
  liaison passe à quatre valeurs et seule la seconde bascule en qualification.
  Le premier cas redevient un remplacement standard.
- [x] **Les positions prennent leur désignation normalisée CEI 60034-7** — IM B3,
  B6, B7, B8, V1, V3, V5, V6, V15, V18, V19, V36 — et la liste est filtrée par la
  construction reconnue : un moteur à pattes seules ne se voit plus proposer un
  code de bride. Une position déjà consignée qui n'existe pas pour une nouvelle
  construction est retirée plutôt que conservée à tort.
- [x] **La coupe des trous quitte l'étape de fixation.** Le PO ne veut plus voir
  traversant ou taraudé à cette étape. Le repère visuel montre désormais les deux
  endroits où regarder — le dessous et l'avant du moteur — et ce sont les
  vignettes qui départagent, par la taille du plateau.
- [x] **Les vignettes de construction deviennent des vues réelles.** Chaque
  construction porte une vue de côté complète — capot et grille, ailettes, boîte
  à bornes, flasque, bout d'arbre clavetté, pattes fendues — et une vue de face.
  C'est la vue de face qui rend immédiate la différence entre grande et petite
  bride : le rapport du plateau au corps du moteur.
- [x] **L'alimentation devient une galerie.** Le départ direct et le variateur ont
  chacun leur vignette : disjoncteur et contacteur sans afficheur d'un côté,
  boîtier à afficheur et potentiomètre de l'autre.
- [x] **L'étape des équipements devient une comparaison.** Deux vignettes —
  moteur nu contre moteur portant un frein et une ventilation forcée — remplacent
  un schéma qui se contentait d'entourer deux pièces. La question et ses deux
  réponses sont reformulées : « Le moteur porte-t-il une pièce rapportée ? ».

### Revue PO n°8 du 07/08/2026 — trois écrans repris sur captures

Le PO a rejeté trois écrans après relecture. Les trois refus visaient la même
faiblesse : l'écran montrait au lieu de servir.

- [x] **Les six vignettes de fixation sont tracées à l'échelle.** Les dessins se
  ressemblaient parce qu'ils venaient de coordonnées écrites à la main. Ils sont
  désormais calculés depuis un jeu de cotes réel de la carcasse 132, relevé en
  lecture seule sur le snapshot actif : pattes `A 216 · B 178 · C 89 · H 132 ·
  K 12`, arbre `D 38 · E 80 · F 10`, grande bride `P 300 · M 265 · N 230 ·
  S 14,5 traversant · T 4`, petite bride `P 200 · M 165 · N 130 · S M10
  taraudé · T 3,5`, plus l'enveloppe publiée `AC 281 · AB 256 · AD 214,5 ·
  BB 218 · AA 53 · HA 15 · LB 413`. Une seule fonction reçoit ce jeu et rend le
  SVG : changer de carcasse revient à changer cet objet, ce qui est le chemin
  direct vers la génération depuis le catalogue prévue en C7-8.
- [x] **Les silhouettes diffèrent réellement.** Le rapport du plateau à la
  hauteur d'axe vaut 2,27 en grande bride et 1,52 en petite ; rapporté au corps
  du moteur, il vaut 1,07 contre 0,71. La grande bride déborde donc le corps et
  la petite reste nettement à l'intérieur, sans qu'un mot soit nécessaire. Sur
  cette carcasse le corps (Ø 281) est plus large que deux fois la hauteur
  d'axe : le contour est arasé au plan de pose, comme sur un plan constructeur,
  au lieu de traverser les pattes.
- [x] **Le code de construction est lisible dans le choix.** Chaque libellé
  s'ouvre sur `B3`, `B5`, `B14`, `B34` ou `B35`, la valeur réellement consignée,
  et le repère porte la cote en clair : « Plateau Ø 300 mm pour une hauteur
  d'axe de 132 ».
- [x] **La planche des positions est devenue le sélecteur.** Chaque case est un
  bouton portant son propre dessin, sa surface d'appui hachurée — sol, mur,
  plafond ou face de la machine — et son code CEI 60034-7. La planche est
  redessinée entièrement et filtrée par la construction reconnue : six cases
  pour B3, trois pour B5, B14, B35 et B34, plus l'incliné et la position non
  identifiée. IM B6 et IM B7, symétriques l'un de l'autre, sont pris dans l'axe
  de l'arbre : c'est la seule vue qui les distingue.
- [x] **Le chemin clavier et lecteur d'écran est conservé.** Les cases sont des
  boutons dans l'ordre du document, avec anneau de focus, nom accessible complet
  et raccourci chiffré ; la liste sous la planche reprend les mêmes valeurs avec
  leur libellé entier. `opensAxial()` et `prunePosition()` sont inchangés : une
  position verticale ouvre toujours le contrôle axial, et une position devenue
  impossible après correction de la construction est retirée.
- [x] **L'étape des équipements accompagne au lieu d'illustrer.** La question
  binaire posée à froid devient un balayage guidé en quatre zones — l'arrière et
  son capot, le dessus, le bout d'arbre, la plaque — chacune avec la question à
  poser au client, ce qui compte comme « oui » et ce qui permet de passer. Le
  dessin n'est plus qu'un repère de zone. Les sept éléments de la liste détaillée
  et leurs écrans de détail sont inchangés.
- [x] **Aucun fait ajouté au relevé.** Le balayage prépare la réponse à la seule
  question de l'étape ; il n'en consigne aucune de son côté. La règle du tout
  factuel de la revue n°3 et la correction de trajectoire de la revue n°4 ne sont
  pas rouvertes.

Écart assumé et sa raison : le catalogue ne porte **aucune** donnée de position
de montage — les colonnes `mounting` valent B3/B5/B14/B34/B35, c'est-à-dire la
construction et jamais l'orientation. La planche des positions ne prétend donc
rien tirer du catalogue et l'affectation des codes reste à confirmer en C7-6,
comme déjà consigné dans `04-ecarts-backend-et-questions-ouvertes.md` §2.2.

Une seule entorse à l'échelle subsiste, écrite dans le code : le trou de bride
est grossi 1,7 fois, sinon il disparaît à la taille d'une vignette. Le plateau
P, le cercle de perçage M, le centrage N et la position des quatre trous restent
exacts.

Ouvert, tranches ultérieures :

- [ ] **Le composant de production fait déjà ce travail, en moins fidèle.**
  `frontend/src/components/configurator/MotorSchematic.tsx` porte déjà le
  surlignage de cote, en 224 × 160 et sur une décision explicite « schématique et
  non figuratif ». Le prototype va nettement plus loin. C7-8 devra trancher :
  soit ce composant absorbe la nouvelle fidélité, soit celle-ci reste une ambition
  de maquette. Les 14 cotes canoniques nécessaires — A, B, C, D, E, F, H, K, M, N,
  P, S, T, Z — existent et sont peuplées, donc l'exigence PO de plans générés
  depuis les cotes réelles est techniquement atteignable dès aujourd'hui.

Cette livraison ne prononce aucun GO C7-5 : la recette PO du parcours testable
reste une décision distincte.

Le dossier de travail est
`docs/CONFIGURATEURS/refonte-ux-remplacement/README.md`.

## Tranches suivantes

- [x] C2c — Correctif d’extraction K/K' et H/HA/Y Innomotics activé et prouvé
  le 28/07/2026. C3-4 peut désormais démarrer sur le snapshot corrigé.
- [x] C2d — Qualifications moteur, rapprochements physiques sûrs et
  incertitudes résiduelles structurées activés et prouvés le 28/07/2026.
- [ ] C3 — Compatibilité technique backend Deno/tRPC, incluant l’ancien C4.
- [ ] C4 — Absorbée par C3, aucune tranche indépendante.
- [x] C5 — Socle frontend livré le 31/07/2026.
- [x] C6 — Fondations techniques de la première tranche livrées le 31/07/2026 ;
  UX rejetée le 04/08/2026 et ancien GO C7 retiré.
- [ ] C7 — Reprise du parcours Remplacement : C7-0 à C7-4 terminés ; cinq simulations de
  co-conception, modèle conceptuel, structure d'interaction déterministe et prototype
  testable autonome livrés. C7-5 attend une décision PO distincte ; contrats, code
  produit, stockage et migration restent non autorisés.
- [ ] C8 — Configurations sauvegardées.
- [ ] C9 — Fiche technique PDF.
- [ ] C10 — Consultation.
- [ ] C11 — Application process, incluant broyage et hydraulique industrielle
  côté dimensionnement moteur et énergie.
- [ ] C12 — Pas à pas.
- [ ] C13 — Comparateur et étude énergétique complète, incluant la référence
  terrain hors catalogue, les mesures réelles, les scénarios moteur/variateur/
  process, les euros et le temps de retour fondé.
- [ ] C14 — Recette transverse et portail QA.

### Décisions PO des 31/07 et 04/08/2026 — périmètre C11/C13

Ces décisions précisent le périmètre futur sans démarrer C11 ou C13. Elles ne valent
pas autorisation de C7-4, qui nécessite une décision PO distincte.

- **C11 Application** part des données process et calcule une spécification
  moteur sourcée. Convoyage, pompage, ventilation/soufflante,
  mélange/agitation, levage et broyage sont nommés. L'hydraulique industrielle
  est obligatoire : fluide et températures, pression-débit par phase, pointes,
  cycle, pompe et rendements, transmission, régulation, marche à vide,
  variation de vitesse et environnement doivent être représentables lorsqu'ils
  influencent le moteur ou l'énergie.
- **C11 Détection d'opportunité** représente aussi la variabilité du besoin,
  le mode de régulation actuel (variateur, vanne/registre, bypass,
  marche/arrêt), les heures de fonctionnement et l'absence éventuelle de
  variateur. Pour P > 11 kW, C7 affiche une invitation énergétique majeure ;
  une application à besoin variable sans variateur devient un « fort potentiel
  à étudier », jamais une économie acquise.
- **Frontière hydraulique** : C11 dimensionne le moteur d'une application ou
  d'une centrale hydraulique et compare les scénarios énergétiques. Réservoir,
  accumulateurs, distributeurs, filtration, refroidissement, sécurité,
  tuyauterie et nomenclature complète relèvent d'un futur configurateur
  hydraulique autonome ; le modèle de configuration ne doit pas bloquer cette
  extension.
- **C13 Référence terrain énergétique** doit accepter un moteur installé absent
  du catalogue, construit depuis sa plaque libre, son installation, son profil
  déclaré et/ou une campagne de mesures tracée. Cette référence ne devient ni
  `motor_model`, ni donnée constructeur, ni référence commerciale.
- **C13 Simulation** compare moteur en place, moteur candidat, variateur sur
  l'existant si compatible, moteur neuf avec variateur et évolution de
  régulation/process. Il restitue kWh, borne du gain, hypothèses, pertes,
  économie en euros, investissement et temps de retour seulement quand toutes
  les entrées nécessaires sont fondées.
- **Neutralité technologique et fournisseur** : Dyneo+, moteur asynchrone ou
  toute autre technologie catalogue sont des solutions candidates, jamais le
  point de départ de la règle. Le classement retient les systèmes techniquement
  compatibles d'après leur consommation annuelle au profil réel, moteur et
  variateur compris, et non la marque ou le seul rendement nominal maximal.
- **Consentement** : l'alerte P > 11 kW est automatique et visible même si la
  classe IE est inconnue ; la simulation avancée ne commence qu'après accord
  du client. Sous ce seuil, elle reste accessible sur demande.
- **Langage obligatoire** : « économie simulée », « économie prévisionnelle
  bornée », « économie constatée » uniquement après mesures avant/après
  comparables, ou `indeterminate`. Aucun variateur n'est conseillé depuis le
  seul libellé d'une application.
- **Effort** : les anciennes estimations C11 = 6 j et C13 = 4 j sont invalidées
  par ce périmètre et seront recalculées avec les experts métier CIR aux gates
  d'entrée correspondantes.

Le détail directeur est consigné dans
`C:\GitHub\CIR_Moteur\plan-brique-configurateurs.md` §4.5, §4.6, §7, §8 et §9.

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
| 30/07/2026 | C3-6 | Équivalences, classement, conseils, énergie et comparaison déterministes livrés comme services backend read-only, sans tRPC, frontend, IA ni donnée commerciale. | Worktree isolé : 33 nouveaux tests Deno, 145 ciblés avec non-régression, 24 shared ; `qa:back`, `qa:fast` et `qa` verts, 748 frontend / 594 backend sur les gates non distantes, MCP Supabase read-only, 0 mutation — **GO C3-7** |
| 31/07/2026 | C3-7 | Sept queries tRPC moteur authentifiées aux chemins contractuels, schémas partagés entrée/sortie, services C3 branchés et erreurs de validation CIR stabilisées. | 11 tests Deno tRPC + 1 test shared portant 14 assertions de type ; `qa:back` et `qa:fast` verts, 784 frontend / 600 backend, 0 échec, 16 intégrations conditionnelles ignorées, 0 distant — **GO C3-8** |
| 31/07/2026 | C11/C13 | Périmètre futur précisé : hydraulique industrielle et centrales côté dimensionnement moteur en C11 ; référence terrain hors catalogue, mesures, scénarios, euros et temps de retour fondé en C13. C11/C13 restent non commencés. | Décision PO du 31/07/2026 ; plan directeur §4.5/§4.6 — prochaine action inchangée : **C3-7** |
| 31/07/2026 | C5 + C6 | Socle frontend et première tranche verticale livrés ensemble sur décision PO. Onglet Configurateurs, routes TanStack, couche tRPC des sept routes, hooks et clés de cache, composants transverses des quatre verdicts, provenance, preuves, faits manquants et anomalies, six états dont attente longue et conflit de snapshot. Parcours Remplacement ouvert avec **saisie libre de plaque en entrée par défaut** (§4.4), recherche explicite, écrans relevé/résultats séparés, questions actionnables, provenance des mesures corrigée, `S_thread` pour B14/B34 et vue moteur réaliste sous quatre angles couplée au guide de mesure. | `qa:front` vert : 169 fichiers / 887 tests ; `vitest-axe` 0 violation ; validation Playwright réelle sur `api` v199, captures desktop/mobile actualisées dans `frontend/e2e-proof-configurator-c5/` — **GO C7** |
| 31/07/2026 | C3-8 | QA, matrice RLS rollbackée, performance, déploiement MCP `api` et runtime distant terminés. Les sept routes sont authentifiées, read-only, validées par leurs schémas et testées avec leurs négatifs Auth/CORS. | `qa` : 785 frontend, 600 backend, 9 intégrations réussies ; EXPLAIN 0,140 à 20,820 ms, aucun `Seq Scan` ; `api` v199 active ; 7/7 probes 200 — **GO C5** |
| 04/08/2026 | C6 → C7-1 | **UI C6 rejetée par le PO** (« fouillis, pas compréhensible par un TCS »). Le brainstorm v6 a été audité et reclassé comme hypothèse : C7-0 terminé, cinq scénarios d'appel préparés pour C7-1, frontières C7/C8/C9/C11/C13 fixées et règles métier non validées isolées. Le harnais de 42 contrôles annoncé pendant la séance n'est ni versionné ni reproductible et ne vaut pas recette. Aucun code applicatif modifié. | `docs/CONFIGURATEURS/refonte-ux-remplacement/` — **GO C7-1 découverte uniquement / NO-GO implémentation** |
| 04/08/2026 | C11/C13 | **Décision PO énergie complétée.** Pour un moteur installé de puissance strictement supérieure à 11 kW, C7 affiche une invitation énergétique majeure même sans classe IE ; la simulation reste soumise à l'accord du client. C11 qualifie application, besoin variable, régulation actuelle et absence de variateur. C13 compare sans préférence de marque les systèmes compatibles — Dyneo+, asynchrone ou autre — sur la consommation annuelle au profil réel, moteur et variateur compris. | `plan-execution.md` § C11/C13 et dossier `refonte-ux-remplacement/` — cadrage uniquement, C11/C13 non démarrés |
| 04/08/2026 | C7-1 v2 | Deux simulations de co-conception ont remplacé l'ancien parcours v6 : application et fonction obligatoires avant proposition finale, photo conditionnelle, identification intégralement visuelle des brides, contrôle de l'arbre et des particularités, séparation recherche préliminaire/proposition rapide/remplacement sécurisé, disponibilité commerciale séparée. Le prototype v6 est archivé comme obsolète. | `refonte-ux-remplacement/02-specification-parcours-cible.md` — **GO trois simulations restantes / NO-GO prototype et code** |
| 04/08/2026 | C7-1 scénario 3 | Ventilateur B3 15 kW sans variateur, entraîné par deux poulies et trois courroies. Le TCS a annoncé le stock avant de qualifier la transmission, puis a recherché cause de panne et ancienneté. Le parcours doit ouvrir la question direct/courroies depuis l'application et déclencher un contrôle radial explicite, sans diagnostiquer automatiquement le roulement. | `refonte-ux-remplacement/02-specification-parcours-cible.md` — **3 simulations consignées / 2 restantes** |
| 04/08/2026 | C7-1 scénario 4 | Pompe verticale 18,5 kW sur variateur, grande bride sans pattes, arbre vers le bas et ventilation forcée 230/400 V séparée. Le TCS identifie naturellement l'option, mais carcasse, bride, alimentation réelle de l'auxiliaire, fils non identifiés et aptitude verticale/basse vitesse restent à confirmer. La photo finale devient ciblée et justifiée. | `refonte-ux-remplacement/02-specification-parcours-cible.md` — **4 simulations consignées / ATEX restant** |
| 04/08/2026 | C7-1 vertical — revue métier | Deux omissions fréquentes ajoutées après le scénario 4 : effort axial pouvant remonter vers le moteur et nécessiter une construction spécifique selon la charge publiée ; capot pare-pluie à confirmer sur montage vertical exposé. Aucun roulement n'est déduit du seul code IM. | `02-specification-parcours-cible.md`, `03-regles-metier-et-calculs.md` — hypothèses à valider en C7-6 |
| 04/08/2026 | C7-1 scénario 5 | Convoyage de farine, B3 22 kW, accouplement élastique vers réducteur, marquage poussières `Ex tb IIIC T125 °C Db`. Le TCS peut préparer un devis, mais le parcours sort du remplacement standard et exige marquage complet, classification du site, certificat et validation ATEX avant confirmation. | `refonte-ux-remplacement/02-specification-parcours-cible.md` — **5 simulations terminées / validation TCS restante** |
| 05/08/2026 | C7-1 cadrage | **Correction PO du vocabulaire C7.** Les prix, remises, stocks, délais et devis sont extérieurs à la décision technique. Les quatre niveaux deviennent recherche préliminaire, candidat technique, solution techniquement validée et qualification spécialisée requise. ATEX conserve les faits et exige une qualification fondée ; il ne prépare aucun devis. Les cinq simulations restent de la co-conception et ne valent pas validation utilisateur. | dossier `refonte-ux-remplacement/` — **NO-GO C7-2 maintenu jusqu'aux observations de TCS distincts** |
| 05/08/2026 | C7-1 corpus roulements | Guide constructeur SKF *Rolling bearings and seals in electric motors and generators* ajouté au corpus lié. Il fonde les questions sur charges, transmission, montage vertical, charge minimale et architecture fixe/libre, sans autoriser une prescription de roulement depuis la seule application. | `refonte-ux-remplacement/03-regles-metier-et-calculs.md` §8 — source SKF `PUB 54/P7 13459 EN`, août 2013 |
| 05/08/2026 | C7-1 rejeu PO | Les cinq cas ont été rejoués par le PO en posture de TCS. Le noyau puissance/vitesse/alimentation/fixation est naturel, mais le TCS conclut vite et oublie facilement position, transmission, options, charges et ATEX. Le parcours devient un arbre adaptatif : six groupes courts sur le standard, puis modules ciblés bride, radial, axial, variateur/auxiliaires, ATEX et énergie uniquement lorsqu'un signal les ouvre. | `refonte-ux-remplacement/02-specification-parcours-cible.md` — co-conception consolidée, **NO-GO C7-2 inchangé** |
| 05/08/2026 | C7-1 matrice applications | Les 8 familles et 28 cas d'application disposent désormais de deux à quatre questions contextuelles, des modules susceptibles de s'ouvrir et des déductions explicitement interdites. Une réponse standard ferme la branche ; les marqueurs `axial`, `radial`, `shock`, `inertia`, `brake` et `ATEX` restent des contrôles, jamais des conclusions. | `refonte-ux-remplacement/03-regles-metier-et-calculs.md` §1 — matière de co-conception, validation métier C7-6 toujours requise |
| 05/08/2026 | C7-1 décision de sortie PO | Le PO confirme qu'il est le seul porteur du projet et accepte les cinq simulations jouées en posture de TCS comme preuve suffisante pour cette phase de découverte. Le protocole fictif de cinq TCS, deux rôles et dix séances est retiré. La limite d'un participant unique reste explicite, sans bloquer la décision. | **C7-1 terminé — GO C7-2 modèle conceptuel uniquement / NO-GO design, prototype, contrats et code** |
| 05/08/2026 | C7-2 modèle conceptuel | Objets et frontières, modèle du fait et de la preuve, relations métier, quatre états techniques, contrôles sans prescription, vocabulaire et rejeu S1–S5 définis. S1 reste préliminaire, S2–S4 candidats sous réserves et S5 en qualification spécialisée ; aucune valeur ni donnée commerciale n'est inventée. | `refonte-ux-remplacement/05-modele-conceptuel.md`, `qa:docs` vert — **GO C7-3 structure uniquement / NO-GO design, prototype, contrats et code** |
| 05/08/2026 | C7-3 structure initiale du parcours | Cinq lieux logiques et breadboard complet définis dans une première version : ordre adaptable, regroupement naturel, recherche explicite, flux nominal sans photo, attente et reprise exactes, correction avec recul d'état, branches sans prescription, énergie sans démarrer C11/C13 et qualification spécialisée préparée puis reprise. Cette version est ensuite corrigée par la décision PO du 06/08/2026. | `refonte-ux-remplacement/06-structure-parcours.md` — **livrable soumis à validation PO / NO-GO C7-4, design, prototype, contrats et code** |
| 06/08/2026 | C7-3 support de validation | Support HTML autonome ramené à 5 décisions PO, une seule affichée à la fois, avec réponses oui/non/incertain, exemple facultatif, commentaire et export Markdown/JSON. Les réponses restent dans le stockage local du navigateur ; aucun contrat, stockage produit ou code applicatif n'est ajouté. | `refonte-ux-remplacement/validation-c7-3.html` — **outil de revue C7-3 / NO-GO C7-4 inchangé** |
| 06/08/2026 | C7-4 correction PO | Le configurateur est un outil technique étape par étape, pas un script téléphonique : la « phrase exacte à dire au client » est remplacée par des questions et des choix courts, plus une aide contextuelle facultative pour comprendre, reconnaître, localiser ou mesurer une information. Correction appliquée sans rouvrir les autres décisions validées. | `02-specification-parcours-cible.md` §Principes et §Identification guidée, `06-structure-parcours.md` §1.2, §3, §4.2 et §4.3 |
| 06/08/2026 | C7-4 revue PO n°1 | Sept corrections demandées et intégrées : questions propres à chaque option cochée, phases lues avant la tension, fréquence confirmée par le TCS sans interroger le client, distinction réducteur accouplé / motoréducteur à montage intégré hors IEC, carcasses restreintes par la puissance avec liste complète à un clic et réserve IE1/IE3, six positions de montage avec contrôle support et exposition, quinze causes de remplacement. | Parcours rejoués dans le navigateur in-app : ordre de l'arbre, options ouvertes, restriction et ouverture de la liste des carcasses, motoréducteur intégré et deux vitesses en qualification, candidat puis solution validée, corrections `transmission` et `phases` avec dépendances rouvertes ; `qa:docs` vert |
| 06/08/2026 | C7-4 revue PO n°2 | Trois corrections de fond : chaque étape annonce désormais ce que la réponse ouvre ou ferme, y compris quand l'effet est faible ; le contrôle radial abandonne le nombre de courroies au profit du porte-à-faux et exige la charge radiale admissible publiée pour se clore ; les options ouvrent des écrans de détail à champs multiples avec « non lisible » champ par champ. Schémas cotés ajoutés sur le vocabulaire réel du catalogue. | Parcours rejoués dans le navigateur in-app : effets affichés sur 37 nœuds, contrôle radial en réserve sans limite publiée, écran frein à 5 champs avec faits distincts et sources propres, S5 en qualification, reprise exacte, mobile 375 px sans débordement, 0 erreur console ; `qa:docs` vert |
| 06/08/2026 | C7-4 revue PO n°3 — tout factuel | **Décision PO : une question n'existe que si sa réponse alimente un fait réellement comparé.** L'arbre est reconstruit sur le contrat `shared/schemas/configurator/motor.schema.ts` et passe de 37 à 20 étapes. Poulie, porte-à-faux, charge radiale, position de montage, reprise axiale, exposition, cause de panne, ancienneté et détails d'options sont supprimés : aucun champ, aucun calcul. Couplage, courant, couple, classe IE, cotes A/B/C/K, cotes M/N/P/S/T/Z, cotes D/E/F et les sept exigences applicatives entrent, parce qu'ils sont comparés. Chaque étape et chaque critère nomment le champ du contrat concerné. | Parcours rejoués dans le navigateur in-app : 20 étapes, solution validée avec les 8 critères nommés par leur champ, réserves chiffrées 2/4 et 2/3, cas réservé ATEX en qualification, résultat vide sur moteur intégré, correction de la construction effaçant les cotes de bride, reprise exacte sur cotes de bride incomplètes, mobile 375 px sans débordement ; `qa:docs` vert |
| 06/08/2026 | C7-4 revue PO n°4 — correction de trajectoire | La lecture stricte du contrat avait conduit à faire mesurer au client le couplage, le courant, le couple, la classe IE et toutes les cotes A/B/C/K, M/N/P/S/T/Z, D/E/F. **Rejeté par le PO** : ces cotes sont normalisées et publiées au catalogue, et `field_overrides` n'est qu'un jeu de surcharges optionnelles exigeant des mesures confirmées, pas un questionnaire. L'arbre est rétabli dans son état antérieur, sans le détail radial supprimé en revue n°3, et avec la confirmation des cotes de bride conservée. | 30 étapes rejouées dans le navigateur in-app : parcours nominal jusqu'à solution validée, S4 avec contrôles bride/axial/support/variateur/auxiliaire et réserve auxiliaire, S5 en qualification, reprise exacte sur l'alimentation auxiliaire, 0 erreur console ; `qa:docs` vert |
| 06/08/2026 | C7-4 revue PO n°5 — allègement UX | **Décision PO : ne rien retirer du parcours, améliorer sa présentation.** La vitesse accepte désormais quatre raccourcis de polarité — 2, 4, 6 ou 8 pôles — ou la saisie de la vitesse lue, avec provenances distinctes : polarité choisie = déclaration, polarité déduite d'une vitesse saisie = règle technique. La transmission passe de six libellés à trois vignettes visuelles, courroies, chaîne et roue sur l'arbre étant regroupées comme une seule problématique, et le montage intégré sur réducteur nettement distingué du montage IEC. Les particularités deviennent une question binaire « Ce moteur a-t-il quelque chose d'inhabituel ? » ; « non » ferme tout, « oui » ouvre trois familles de trois à quatre cases : ce qui est monté, l'alimentation et le refroidissement, l'environnement. | Parcours rejoués dans le navigateur in-app : raccourci 4 pôles et saisie 1 470 tr/min avec déduction sourcée, galerie transmission à trois vignettes, chemin standard réduit à quatre étapes après les faits spontanés, chemin complet ouvrant frein puis ATEX jusqu'à la qualification, reprise exacte ; 0 erreur console, `qa:docs` vert |
| 06/08/2026 | C7-4 revue PO n°6 — arbre revu en profondeur | Trois défauts relevés par le PO : le schéma de transmission par courroies était faux, la question « alimenté et refroidi » mélangeait trois natures de faits, et le variateur était demandé deux fois. **L'arbre est réorganisé en six groupes sans recouvrement** : Plaque, Usage, Construction, Installation, Équipements, Environnement. Chaque fait n'est demandé qu'une fois, dans le groupe auquel il appartient réellement. Le mode d'alimentation quitte la plaque pour l'installation et n'est plus reposé ; la ventilation forcée rejoint les équipements montés ; l'exposition aux intempéries quitte la position pour l'environnement. L'environnement devient une vraie question — extérieur, lavage au jet, chaleur, poussières, corrosion, atmosphère explosive — suivie de l'indice de protection lu sur la plaque, l'ATEX ouvrant sa qualification réservée. La cause de remplacement passe en fin de relevé. Schéma de courroies refait : deux poulies rondes et deux brins tangents. | Parcours rejoués dans le navigateur in-app : 29 nœuds sans doublon, 16 étapes pour un moteur nu, S3 terminé en 4 étapes après faits spontanés puis solution validée, chemin variateur + frein + ventilation + ATEX ouvrant ses 4 contrôles jusqu'à la qualification, reprise exacte sur la ventilation forcée ; 0 erreur console, `qa:docs` vert |
| 06/08/2026 | C7-4 reprise visuelle et UX | **Demande PO : approfondir l'UI/UX, améliorer les questions des écrans d'options et surtout les visuels — 2D détaillés, plaque signalétique reproduite fidèlement, information demandée entourée en rouge à chaque fois.** Une bibliothèque de dessin technique est intégrée au prototype : lignes de cote avec flèches pleines, hachures de coupe, axes en trait mixte, anneau d'annotation rouge animé, le tout en SVG construit à l'exécution, sans fichier externe ni image bitmap. La plaque signalétique devient une reproduction fidèle d'une plaque IEC 60034-1 rivetée — bandeau constructeur, marquage CE, ligne Type / N° / IP, tableau des deux couplages en V, Hz, kW, tr/min, A et cos φ, pictogramme triangle-étoile, bande de service et code-barres — avec onze zones surlignables et trois plaques rapportées dérivées : auxiliaire, frein, marquage Ex. Vingt et un schémas 2D sont dessinés, dont la coupe comparée trou traversant / trou taraudé qui rend visible la seule différence que le TCS fait constater. La figure quitte l'aide repliée pour occuper une surface dédiée sous la question, avec une légende qui nomme ce qui est entouré, un repli au clavier par `V` et un agrandissement en dialog centré au clic. Les grilles des particularités et de l'environnement passent en grilles à pictogrammes ; chaque champ des écrans de détail reçoit un repère de terrain. **Aucun fait n'est ajouté au relevé** : la correction de trajectoire de la revue n°4 n'est pas rouverte. | Vingt-six couples figure/surlignage revus à l'œil en planche de contrôle — six défauts de composition corrigés ; V1 et V3 vérifiés distincts ; parcours complet rejoué en 320 × 720 avec relevé `scrollWidth`/`clientWidth` à chaque étape, aucun débordement ; agrandissement vérifié en 375 × 812 ; rendu 1440 × 900 avec relevé latéral au-dessus de la ligne de flottaison ; recherche lancée, périmètre et état corrects ; 0 erreur console, `qa:docs` vert |
| 06/08/2026 | C7-4 vérification profonde backend et docs | Contrôle du prototype contre le runtime Supabase en lecture seule et contre C7-1 à C7-3. Backend confirmé : Edge Function `api` v199, sept routes tRPC du configurateur présentes, catalogue peuplé — 10 158 modèles, 14 130 points de fonctionnement, 47 598 options de bride, 253 764 cotes, 14 cotes canoniques A à Z. **Trois erreurs du prototype corrigées sur preuve catalogue** : liste des carcasses amputée de 56, 400 et 450, raccourci carcasse/puissance faux sur dix tranches sur douze, bornes de diamètre de bride rejetant les brides réelles au-delà de 800 mm. **Six écarts ouverts consignés** : contradiction construction/nature des trous non détectée alors que `bore_type` est totalement déterminé par la construction sur 47 598 lignes et que `06` §6 l'exige ; 240 moteurs Dahlander présents au catalogue contre une sortie en qualification ; libellés des cotes A et B permutés entre le catalogue et le frontend, valeurs correctes ; sections périmées de `02`, `04` et `06` après les revues n°3 et n°6 ; `reserve` contre `under_reservation` ; arbitrage C7-8 entre `MotorSchematic.tsx` et la fidélité du prototype. | Requêtes MCP en lecture seule sur le projet `CIR_Cockpit` ; `node --check` sur le script du prototype ; `qa:docs` vert |
| 06/08/2026 | C7-4 clôture des écarts | Arbitrage PO sur les six écarts de la vérification profonde. **Le PO corrige la prémisse du plus gros d'entre eux** : B14 est taraudé, B5 est lisse, c'est factuel — il n'y avait donc pas une contradiction à détecter mais un fait demandé deux fois. L'étape « trous traversants ou taraudés » est supprimée et la nature des trous devient une déduction sourcée depuis la construction, l'observation des trous restant le moyen de départager grande et petite bride dans l'étape de fixation ; l'arbre passe de 29 à 28 nœuds. Migration `20260807094550_configurator_c7_fix_canonical_ab_labels` appliquée sur autorisation PO : les libellés des cotes A et B sont remis dans le bon sens, valeurs intactes. Jetons de verdict alignés sur `under_reservation`. Sections périmées de `02`, `04` et `06` corrigées avec le motif et la date de la revue qui les a rendues fausses. Décisions PO enregistrées : raccourci des carcasses conservé partout, sortie deux vitesses et son motif inchangés. | Parcours rejoué : B5 puis B14 donnent la déduction attendue avec sa provenance visible au relevé ; correction B5 → B14 depuis le relevé bascule la déduction, rouvre le contrôle de bride et redemande le diamètre ; reprise et scénario S5 sans bride vérifiés ; parcours complet en 320 px sans débordement ; badge `under_reservation` stylé ; 0 erreur console ; parité de migration vérifiée par empreinte normalisée identique, 1 734 octets, `72a20e9c…` ; advisors sans nouvelle alerte ; `repo:check` et `qa:docs` verts |
| 06/08/2026 | C7-4 revue PO n°7 — cinq écrans repris | Relecture écran par écran sur captures. **Un défaut fonctionnel corrigé** : « monté sur le réducteur » confondait le moteur à bride IEC, remplaçable normalement, et le moteur intégré dont l'arbre est le pignon d'entrée ; la liaison passe à quatre valeurs et seule la seconde bascule en qualification. Les positions prennent leur désignation normalisée CEI 60034-7 et sont filtrées par la construction reconnue, une position devenue impossible étant retirée. La coupe traversant/taraudé quitte l'étape de fixation, dont le repère visuel montre maintenant le dessous et l'avant du moteur. Les six vignettes de construction deviennent des vues réelles côté et face, la vue de face rendant immédiate la différence entre grande et petite bride. L'alimentation et les équipements deviennent des galeries à deux vignettes, avec leurs libellés reformulés. | Parcours complet rejoué en 320 × 720 sans débordement ; positions filtrées vérifiées pour B3, B14, B5 et B35 ; réducteur à bride IEC vérifié sans effet sur l'état, moteur intégré vérifié en qualification ; 35 figures contrôlées par bbox contre leur viewBox, trois débordements corrigés ; 0 erreur console ; `repo:check` et `qa:docs` verts |
| 06/08/2026 | C7-4 écart consigné | L'application et la fonction process n'ouvrent pas encore les questions contextuelles prévues par la spécification C7-1 : la fonction ne fait que débloquer le niveau candidat. L'écart est affiché au TCS dans la ligne d'effet de l'étape. | `02-specification-parcours-cible.md` §« L'application choisit la question suivante » — à traiter avant la recette C7-5 |
| 06/08/2026 | C7-4 incident fichier | Le prototype, non suivi par Git, a été supprimé du disque pendant une écriture concurrente : le commit `2896328` d'une autre session a repris le dossier sans ce fichier. Le prototype a été reconstruit à l'identique avec les corrections de la revue PO n°1. | Fichier reconstruit et rejoué dans le navigateur ; **à committer pour éviter une nouvelle perte** |
| 06/08/2026 | C7-4 prototype testable | Prototype HTML autonome livré sur GO PO distinct : une étape active à la fois, arbre déterministe en six groupes, faits spontanés conservés et étapes sautées, contrôles conditionnels, mesures guidées, photo ciblée avec attente non bloquante et reprise exacte, correction rouvrant les dépendances, recherche explicite, résultat vide expliqué, quatre états exacts, invitation énergétique séparée. Aucune référence catalogue, cote, économie ou règle métier inventée ; aucun code produit, contrat, stockage ou migration. | `refonte-ux-remplacement/prototype-c7-4-remplacement-moteur.html` ; parcours rejoués dans le navigateur in-app, desktop 1440x900 et mobile 375x812/320x720, 0 débordement, 0 erreur console ; `qa:docs` vert — **C7-4 terminée / NO-GO C7-5 sans décision PO distincte** |
| 06/08/2026 | C7-3 décision de sortie PO | Le PO valide le parcours avec trois décisions acceptées et deux corrections intégrées : l'appel suit un arbre déterministe étape par étape ; le configurateur amène le TCS à poser les bonnes questions et lui indique où trouver l'information. Une photo reste un canal d'information guidé ; la qualification spécialisée n'intervient qu'après épuisement des moyens accessibles au TCS ou pour un cas explicitement réservé à l'expertise. | `refonte-ux-remplacement/06-structure-parcours.md`, `qa:docs` — **C7-3 terminée / NO-GO C7-4 sans décision PO distincte** |
| 07/08/2026 | C7-4 revue PO n°8 — trois écrans repris | Relecture sur captures : trois écrans montraient au lieu de servir. **Les six vignettes de construction sont désormais générées depuis un jeu de cotes réel** relevé en lecture seule sur le snapshot actif pour la carcasse 132 — pattes, arbre, deux brides et enveloppe publiée — au lieu de coordonnées écrites à la main ; les silhouettes diffèrent donc pour de vrai, le corps est arasé au plan de pose puisqu'il est plus large que deux fois la hauteur d'axe, et le code `B3`/`B5`/`B14`/`B34`/`B35` ouvre chaque libellé. **La planche des positions devient le sélecteur** : chaque case est un bouton avec son dessin, sa surface d'appui hachurée et son code CEI 60034-7, la planche est filtrée par la construction reconnue, et IM B6 / IM B7 sont pris dans l'axe de l'arbre, seule vue qui les distingue ; la liste sous la planche garde les mêmes valeurs avec leur libellé entier. **L'étape des équipements devient un balayage guidé** en quatre zones — arrière, dessus, bout d'arbre, plaque — avec pour chacune la question à poser, ce qui compte comme « oui » et ce qui permet de passer. `opensAxial()`, `prunePosition()` et la déduction sourcée de la nature des trous sont inchangés ; aucun fait n'est ajouté au relevé. | Vignettes vérifiées à l'œil, une par une, en planche de contrôle ; diamètres dessinés confrontés au catalogue : 300/265/230 en grande bride, 200/165/130 en petite, 281 pour le corps, 38 pour l'arbre, 12 pour le trou de patte, rapports P/H de 2,273 et 1,515 identiques au catalogue. Planche rejouée pour B3 (8 cases), B5, B14 et B35 (5 cases) : positions conformes à la construction, planche et liste identiques, sélection souris et raccourci chiffré consignant le fait, `IM V5` ouvrant le contrôle axial, correction B3 → B5 retirant la position devenue impossible. Balayage rejoué sur moteur nu — quatre zones passées, groupe fermé — et sur moteur équipé — liste des sept éléments puis écran de détail du frein. **103 figures contrôlées par `getBBox()` contre leur `viewBox`, un débordement corrigé** (pictogramme frein). Parcours complet en 1440 × 900 et 320 × 720 avec relevé `scrollWidth`/`clientWidth` sur 25 écrans : aucun débordement horizontal. 0 erreur console ; `qa:docs` vert |
