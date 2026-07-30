# Plan de reprise — C3 compatibilité technique moteur

## 1. Objet et règle de conduite

Ce document est le point d’entrée unique de la prochaine IA pour C3. Il
remplace toute interprétation de C3 comme score global et absorbe l’ancienne
tranche C4.

Chaque phase est indépendante. La phase suivante ne commence que lorsque son
checkpoint est validé avec les preuves demandées.

Légende :

- `[x]` terminé et prouvé ;
- `[ ]` à faire ;
- `BLOQUANT` interdit de poursuivre ;
- `VALIDATION PO` exige une décision explicite du product owner.

Règles permanentes :

- aucun score pondéré ne compense une incompatibilité essentielle ;
- aucune valeur catalogue manquante n’est inventée ;
- PostgreSQL/Supabase est la source runtime ; SQLite reste un oracle historique ;
- aucune route C3 ne lit ou n’écrit `saved_configuration` ;
- aucun frontend, prix, stock, catalogue commercial, PDF final ou IA dans C3 ;
- toute migration, preuve distante et livraison Supabase passe par le MCP ;
- maximum quatre moteurs dans une comparaison.

## 2. État exact du handoff

### Handoff consolidé au 30/07/2026

Ce bloc remplace les snapshots C2b/C2c ci-dessous comme référence runtime. Les
sections historiques restent conservées pour expliquer les décisions et les
preuves de chaque correction.

- Branche cible : `main`.
- C0, C1 et C2/C2d : terminés avec **GO pour démarrer C3**.
- C3/C4 : aucune implémentation commencée.
- Snapshot moteur actif unique :
  `6fbf4046-be74-4422-9fe8-2d2d8a8d9157`, statut `active`, gate `passed`.
- Lot actif : `cc5689ac-cbf1-45e8-a079-62df8f77dfd8`, empreinte
  `5db53991095401581953e48fd9b4bbba68c8a8be5b4d5f8c227456fc14256bdb`.
- Volumes de départ C3 : 1 665 modèles, 2 355 points de fonctionnement,
  5 699 rendements, 2 370 couples, 45 568 cotes, 7 940 brides et
  141 issues moteur explicites.
- Qualifications de départ : 59 VFD obligatoires, 109 intégrés non-IEC,
  aucune qualification nulle sur le snapshot actif.
- Schéma distant : 20 tables, RLS activée et forcée sur les 20, 44 policies,
  aucun advisor sécurité propre à `configurator`.
- Edge Function `api` active en version 198, mais la probe
  `configurator.motor.catalog.list` répond `404 NOT_FOUND`.
- Surface locale : contrats dans `shared/schemas/configurator/`, mais aucun
  routeur/service Configurateurs dans `backend/functions/api` et aucune
  intégration frontend.
- Registre d'incertitudes obligatoire :
  `docs/CONFIGURATEURS/c2d/incertitudes-restantes.md`.
- Audit complet : `docs/CONFIGURATEURS/audit-etat-2026-07-30.md`.

Les tests et probes C3 doivent toujours résoudre le snapshot actif par la base.
L'UUID ci-dessus est une preuve de handoff, pas une constante applicative.

### Socle versionné avant C2b

- Branche : `main`.
- Commit de sauvegarde complet : `c7e5813dbcbfd4010723f064d3e760045c100b13`.
- Distant GitHub : `origin/main` confirmé sur le même SHA avant C2b.
- C3/C4 : aucune implémentation commencée.

### C2b locale

- [x] Lecture géométrique des cellules fusionnées Bonfiglioli.
- [x] Tests extracteur Bonfiglioli : 2/2.
- [x] Fixtures exactes page PDF 58 :
  - `BY 280SCK B = 368 mm` ;
  - `BY 280MAK B = 419 mm` ;
  - `BY 315SCK B = 406 mm` ;
  - `BY 315SDK B = 406 mm` ;
  - `BY 315MBK B = 457 mm`.
- [x] Contrôle d’implausibilité bloquant, sans correction automatique.
- [x] `K` ajouté aux contrats Zod et au mapping canonique du pipeline.
- [x] Dry-run C2b : `GO_TECHNIQUE`, 17 critères sur 17, 0 anomalie bloquante.
- [x] Contrat Zod moteur ciblé : 11/11.
- [x] `qa:docs`, `qa:back` et `qa:fast` :
  - 706 tests frontend ;
  - 449 tests backend ;
  - 0 échec ;
  - 14 tests d'intégration explicitement ignorés hors environnement live.
- [x] Empreinte du lot :
  `0a295854acae92bc239b610cdf5ffa2837802b6926912a84a8f0dd79425a0876`.

Attention au handoff : `C:\GitHub\CIR_Moteur` n'est pas un dépôt Git dans
l'environnement audité. Les modifications de
`tools/extract/extract_bonfiglioli_dimensions.py`, son test et le JSON régénéré
y sont présentes localement, mais ne peuvent pas être publiées sur
`origin/main` de CIR Cockpit. Le code, la migration, les manifestes, les preuves
et ce plan propres à CIR Cockpit sont, eux, versionnés dans CIR Cockpit.

### C2b distante

- [x] Migration MCP :
  `20260727145013_configurator_c2b_dimension_k`.
- [x] `K` : 540 lignes sourcées, 540 mappées, 0 non mappée, plage 6–35 mm.
- [x] Snapshot candidat :
  `bcb48c8f-44e6-486f-a8ad-0d1a837ebed3`.
- [x] Lot :
  `66620d6b-a0e1-4b76-901d-0ade7d208ffd`.
- [x] Candidat `ready`, gate `passed`, 0 anomalie bloquante.
- [x] Volumes candidat :
  - 1 721 modèles ;
  - 2 355 points de fonctionnement ;
  - 5 699 points de rendement ;
  - 2 370 points de couple ;
  - 37 545 cotes ;
  - 7 926 brides ;
  - 256 options frein ;
  - 599 corrélations ;
  - 705 seuils IEC ;
  - 62 anomalies métier.
- [x] Diff cotes candidat contre actif :
  - 37 449 identiques ;
  - 67 corrigées ;
  - 241 retirées ;
  - 29 restaurées.
- [x] Snapshot actif inchangé :
  `2bb33c0b-8bf0-401c-8016-5e0fbd1bee54`.
- [x] Advisors Supabase après DDL :
  - aucun advisory de sécurité sur le schéma `configurator` ;
  - uniquement des index `configurator` encore non utilisés en niveau
    information ; aucun index ajouté sans plan SQL démontrant son besoin.
- [x] `VALIDATION PO` : candidat C2b activé le 27/07/2026.

`BLOQUANT` : aucune probe mécanique C3 ne doit utiliser l’ancien snapshot actif.

`BLOQUANT` — constat du 27/07/2026 après activation : le snapshot `retired`
reste **entièrement lisible** par tout utilisateur authentifié. Une sonde `tcs`
voit 3 442 modèles et 75 302 cotes, soit les deux snapshots cumulés, et une
lecture non filtrée de `BY 315MBK` renvoie 457 mm (actif) **et** 5 706 mm
(retiré). Aucune requête C3 ne doit donc dépendre d’un filtre implicite : la
résolution du snapshot actif est une obligation de service, à couvrir par un
test dédié en C3-3, et non une propriété garantie par la RLS.

## 3. Modèle métier verrouillé

Chaque candidat expose quatre états :

| Axe | Sens |
| --- | --- |
| `mechanical_status` | Montage physique du moteur. |
| `electrical_status` | Fonctionnement sur l’alimentation existante. |
| `application_status` | Respect des exigences explicitement renseignées. |
| `overall_status` | Synthèse déterministe du pire état essentiel. |

États autorisés :

| État | Signification |
| --- | --- |
| `satisfied` | Remplacement direct démontré. |
| `under_reservation` | Compatible sous réserve d’une mesure ou vérification identifiée. |
| `not_satisfied` | Adaptation mécanique ou électrique nécessaire. |
| `indeterminate` | Donnée décisive absente ou ambiguë. |

Priorité du verdict global :

1. un critère essentiel `not_satisfied` ;
2. sinon un critère essentiel `indeterminate` ;
3. sinon une réserve ;
4. sinon `satisfied`.

Classement :

1. verdict global ;
2. verdict mécanique ;
3. nombre de réserves ;
4. nombre de données manquantes ;
5. tri demandé par l’utilisateur.

## 4. Phase C2b-A — Activation contrôlée

### Critère d’entrée

- Le candidat `bcb48c8f-…` est toujours `ready/passed`.
- Le snapshot `2bb33c0b-…` est toujours seul actif.
- La QA locale et la parité des migrations sont vertes.

### Checklist

- [x] Relire `docs/CONFIGURATEURS/c2/controles.json`.
- [x] Relire `docs/CONFIGURATEURS/c2/diff-activation.json`.
- [x] Vérifier les cinq fixtures B par SQL MCP.
- [x] Vérifier 540 `K` mappées par SQL MCP.
- [x] Vérifier les volumes candidat et 0 anomalie bloquante.
- [x] Obtenir la validation explicite du PO.
- [x] Activer via `configurator.activate_snapshot`, jamais par `UPDATE` direct.
- [x] Prouver un seul snapshot actif et l’ancien `retired`.
- [x] Rejouer les lectures RLS `anon`, `tcs`, `super_admin`.
- [ ] Rejouer la lecture RLS `agency_admin` : aucun profil de ce rôle n’existe
  aujourd’hui, la sonde n’a pas pu être exécutée sans créer un compte. Non
  bloquant pour ce checkpoint : la policy `SELECT` des trois tables catalogue
  est la même expression pour les trois rôles,
  `private.configurator_actor_is_active()`, dont le seul test est
  `role in ('super_admin','agency_admin','tcs')`. Les sondes `tcs` et
  `super_admin` parcourent déjà ce chemin; `agency_admin` est le littéral
  central du même `IN`. À exécuter dès qu’un profil de ce rôle existera.

### Checkpoint C2b-A

Le checkpoint est vert uniquement si :

- le candidat C2b est l’unique actif ;
- les cinq valeurs B distantes sont exactes ;
- les 540 valeurs K sont mappées ;
- les compteurs actifs correspondent au manifeste ;
- le rollback vers l’ancien snapshot est documenté ;
- aucun changement C3 n’a encore été déployé.

### Rollback

Réactiver l’ancien snapshot par la fonction d’activation. Ne jamais modifier une
migration déjà appliquée et ne jamais supprimer le candidat avant conservation
des preuves.

## 5. Phase C3-1 — Contrats et règles versionnées

### Critère d’entrée

Checkpoint C2b-A vert.

### Checklist

- [x] Étendre les schémas Zod d’entrée avec :
  - A/B/C/H/K ;
  - D/E/F ;
  - M/N/P/S ou `S_thread`/T/Z ;
  - diamètre réel du boulon ;
  - courses transversale et longitudinale du bâti ;
  - plage axiale de l’accouplement ;
  - réseau, tension, couplage et mode réseau/variateur ;
  - exigences applicatives facultatives ;
  - origine, confirmation et preuve de chaque mesure.
- [x] Créer les schémas de sortie des quatre statuts.
- [x] Exposer `adaptations_required`, `checks_required`, valeurs attendues,
  observées, delta, jeu calculé et preuves.
- [x] Définir `ruleset_id` et une version immuable.
- [x] Conserver la surcharge terrain uniquement si explicite et confirmée.
- [x] Ajouter les fixtures Zod de refus des champs inconnus.
- [x] Porter la décision D/tolérance de la phase C3-4 dans le contrat : la
  tolérance est un fait distinct du diamètre, jamais fusionné avec lui.

### Checkpoint C3-1

- Tous les contrats sont `strictObject`.
- Entrées et sorties passent les tests Zod.
- `K`, diamètre du boulon et course du bâti restent trois faits distincts.
- Aucun champ prix, stock, remise ou disponibilité.

**Checkpoint validé le 30/07/2026 — VERT.** Preuves :
`common.schema.ts`, `motor.schema.ts`,
`configurator-c3-contracts.test.ts` et les deux suites Configurateurs adaptées ;
3 fichiers / 24 tests ciblés réussis, typecheck et lint ciblé verts. Les
frontières d'entrée et de sortie appellent `safeParse`, le ruleset
`motor.compatibility.cir` version `1` est littéral et gelé, et aucune donnée
commerciale n'est acceptée.

Décision de sortie : **GO C3-2**.

## 6. Phase C3-2 — Exécuteur PostgreSQL read-only et erreurs

### Checklist

- [x] Créer l’exécuteur configurateur transactionnel :
  1. `SET TRANSACTION READ ONLY` ;
  2. claims issus de l’`AuthContext` ;
  3. `SET LOCAL ROLE authenticated` ;
  4. `statement_timeout` et `lock_timeout` bornés ;
  5. `search_path` explicite ;
  6. transaction typée seule transmise aux services.
- [x] Interdire le client racine dans les services configurateur.
- [x] Ajouter une garde statique interdisant `saved_configuration`.
- [x] Ajouter les codes CIR :
  - snapshot absent ou indisponible ;
  - point de fonctionnement absent ;
  - jeu mécanique non calculable ;
  - règles indisponibles ;
  - lecture PostgreSQL échouée ;
  - timeout ;
  - sortie backend invalide.
- [x] Conserver SQL, stack, diagnostics et valeurs brutes côté privé.
- [x] Messages publics français, courts, avec `request_id`.

### Checkpoint C3-2

- Tests d’intégration prouvant le rôle `authenticated` et la RLS.
- Toute tentative d’écriture échoue.
- Le scan statique trouve zéro accès C3 à `saved_configuration`.
- Toutes les erreurs publiques passent le catalogue CIR.

**Checkpoint validé le 30/07/2026 — VERT.** Preuves locales :
`configuratorReadExecutor.ts`, `configuratorErrors.ts`, 5 tests unitaires
réussis, 1 test d'intégration PostgreSQL distant réussi et garde centrale
`check-repo-state.mjs`. La transaction relève `current_user=authenticated`,
les claims issus de l'`AuthContext`, `statement_timeout=5s`,
`lock_timeout=1s` et le `search_path` explicite. L'écriture de preuve échoue
avec SQLSTATE `25006` et laisse zéro ligne.

Preuves MCP Supabase, toutes terminées par `ROLLBACK` :

- identité recevable : rôle `authenticated`, claim `sub` exact, lecture RLS
  autorisée ;
- identité UUID sans profil : 0 snapshot et 0 modèle visibles ;
- tentative d'insertion sous profil super_admin réel : refus
  `read_only_sql_transaction`, 0 ligne dans la transaction et 0 après rollback ;
- aucun compte Auth, aucune migration, aucun déploiement et aucune mutation
  persistante créés.

QA de checkpoint : `qa:back` et `qa:fast` sont verts (160 fichiers /
746 tests frontend, 454 tests backend). `pnpm run qa` valide les étapes 0 à 8,
puis l'étape 9 conserve 6 échecs historiques dus à l'absence de la fixture
Auth `AUDIT_20260604_api_int_user@cir.invalid` (`auth.users` = 0). La fixture
n'a pas été recréée : cette mutation Auth est hors périmètre. Le test
PostgreSQL C3-2 ciblé reste vert.

Décision de sortie : **GO C3-3**. C3-3 n'est pas commencé dans ce checkpoint.

## 7. Phase C3-3 — Catalogue et normalisation

### Checklist

- [ ] Implémenter `configurator.motor.catalog.list`.
- [ ] Implémenter `configurator.motor.catalog.get`.
- [ ] Résoudre uniquement le snapshot moteur actif, par jointure explicite sur
  `catalog_snapshot.is_active`. Le snapshot retiré reste lisible sous RLS :
  ajouter un test qui échoue si une lecture catalogue renvoie une ligne d’un
  snapshot non actif.
- [ ] Charger modèle, point, rendement, couple, dimensions, brides et options.
- [ ] Ne pas écraser deux points IE3/IE4 visuellement proches.
- [ ] Construire `fromMotor` comme spécification catalogue sourcée.
- [ ] Appliquer les mesures terrain confirmées après la spécification catalogue.
- [ ] Retourner `indeterminate` pour une donnée décisive absente, pas une erreur HTTP.

### Checkpoint C3-3

- Probes authentifiées `catalog.list/get`.
- Provenance présente sur chaque fait décisif.
- Aucun point, bride ou variante fusionné silencieusement.

## 8. Phase C3-4 — Compatibilité mécanique

### Fixation par pattes

- [ ] Montage B3/B35/B34 identique.
- [ ] H strictement identique ; tout écart implique une adaptation.
- [ ] Calculer `abs(Acandidat - Aexistant) / 2`.
- [ ] Calculer `abs(Bcandidat - Bexistant) / 2`.
- [ ] Calculer `(Kcandidat - diametre_boulon) / 2`.
- [ ] Ajouter une course de bâti uniquement si mesurée et confirmée.
- [ ] A/B différents sans mesure du bâti : `under_reservation`.
- [ ] Écart prouvé supérieur au jeu : `not_satisfied`.
- [ ] C différent : réserve, puis adaptation si course insuffisante.

### Arbre

- [ ] D identique pour un remplacement direct.
- [ ] `DECISION PO 2026-07-27` : diamètre D identique et tolérance d’ajustement
  différente restent `satisfied`. L’écart est publié dans `checks_required`
  comme information de montage d’accouplement, jamais dans
  `adaptations_required`, et ne dégrade aucun statut. Tolérance absente : aucune
  alerte, aucune réserve.
- [ ] F identique, sans compensation générique.
- [ ] E différent : réserve sur engagement et encombrement.
- [ ] E ne passe à `satisfied` qu’avec preuve de plage d’accouplement.

### Bride

- [ ] Même montage B5/B14/B35/B34.
- [ ] Même nature de perçage.
- [ ] N, M, Z et S ou `S_thread` strictement identiques.
- [ ] P/T différents uniquement avec dégagement vérifié.
- [ ] Option `larger`/`smaller` admise si interface exacte et
  `requires_option = true`.
- [ ] Ne jamais déduire une bride depuis H.

### Checkpoint C3-4

`LEVE LE 28/07/2026`, revalidé le 30/07/2026 : C2c a publié K et H pour les
1 012 modèles Innomotics concernés, puis C2d a activé le catalogue qualifié.
Les tests C3-4 doivent résoudre dynamiquement l'unique snapshot actif, dont la
preuve actuelle est `6fbf4046-be74-4422-9fe8-2d2d8a8d9157`. Voir
`plan-execution.md`, gates correctives C2c et C2d.

Tests obligatoires :

- A/B exacts, absorbables, excessifs et jeu inconnu ;
- K absent, boulon absent, compatible et incompatible ;
- H différent ;
- C différent avec course absente, suffisante et insuffisante ;
- D/F différents et E différent ;
- toutes les combinaisons B3/B5/B14/B34/B35 ;
- bride optionnelle exacte.

## 9. Phase C3-5 — Compatibilité électrique et applicative

### Électrique bloquant

- [ ] Puissance nominale identique.
- [ ] Nombre de pôles identique.
- [ ] Fréquence identique.
- [ ] Mode réseau ou variateur compatible.
- [ ] Tension et couplage compatibles avec le réseau fourni.

### Électrique informatif

- [ ] Vitesse, couple, rendement/IE, courant, démarrage, masse, inertie et bruit
  ne bloquent pas la compatibilité.
- [ ] Courant supérieur : conseil protection et chute de tension.
- [ ] Couple inférieur : information, puis contrôle seulement si exigence fournie.
- [ ] Rendement différent : comparaison énergétique.
- [ ] Vitesse différente à pôles/fréquence identiques : information de glissement.

### Application

- [ ] IP, frein, VFD, refroidissement, service, température et démarrages/heure
  ne bloquent que s’ils sont explicitement demandés.
- [ ] Exigence non publiée : `indeterminate`.
- [ ] Exigence publiée et insuffisante : `not_satisfied`.
- [ ] Aucune exigence : information seulement.

### Checkpoint C3-5

Tests couvrant chaque exigence absente, satisfaite, non satisfaite et non
publiée. Un écart de rendement, couple ou courant ne doit jamais masquer ni
créer un blocage électrique.

## 10. Phase C3-6 — Équivalences, conseils, énergie et comparaison

### Checklist

- [ ] Implémenter `configurator.motor.equivalents.fromSpec`.
- [ ] Implémenter `configurator.motor.equivalents.fromMotor`.
- [ ] Implémenter la synthèse et le classement déterministes.
- [ ] Implémenter `configurator.motor.advice.build`.
- [ ] Implémenter `configurator.motor.energy.compute`.
- [ ] Interdire l’extrapolation hors points de rendement publiés.
- [ ] Implémenter `configurator.motor.compare` pour 2 à 4 moteurs.
- [ ] Conserver `not_published` comme absence de donnée, jamais comme pénalité.
- [ ] Reprendre les bornes énergétiques dans le sens référence/candidat.

### Checkpoint C3-6

- Un blocage essentiel reste premier quel que soit le reste.
- Aucun calcul par points pondérés.
- Les résultats énergétiques incomplets restent indéterminés.
- Le comparateur est stable et ordonné.

## 11. Phase C3-7 — Surface tRPC

Procédures authentifiées, en query, avec validation entrée/sortie :

- [ ] `configurator.motor.catalog.list`
- [ ] `configurator.motor.catalog.get`
- [ ] `configurator.motor.equivalents.fromMotor`
- [ ] `configurator.motor.equivalents.fromSpec`
- [ ] `configurator.motor.advice.build`
- [ ] `configurator.motor.energy.compute`
- [ ] `configurator.motor.compare`

### Checkpoint C3-7

- Contrats partagés et backend alignés.
- Sorties invalides converties en erreur CIR stable.
- Zéro procédure non authentifiée.
- Zéro mutation métier C3.

## 12. Phase C3-8 — QA, performance et livraison distante

### Checklist

- [ ] Tests métier ciblés.
- [ ] `pnpm run qa:back`.
- [ ] `pnpm run qa:fast`.
- [ ] `pnpm run qa`.
- [ ] Preuves RLS avec rollback sous `anon`, `tcs`, `agency_admin`,
  `super_admin`.
- [ ] `EXPLAIN ANALYZE` sur les requêtes réelles.
- [ ] Aucun index sans plan démontrant son besoin.
- [ ] Déploiement Edge Function `api` via MCP.
- [ ] Conserver `verify_jwt=false` seulement parce que l’authentification est
  traitée dans le code.
- [ ] Probes authentifiées de toutes les procédures.
- [ ] Vérifier logs, budgets, timeouts et erreurs publiques.

### Checkpoint final C3/C4

GO uniquement si :

- le snapshot C2d qualifié est l'unique actif ;
- les sept procédures répondent sur le runtime distant ;
- toutes les routes sont read-only ;
- les quatre statuts et leurs preuves sont présents ;
- les budgets et timeouts sont respectés ;
- les tests et probes sont archivés ;
- le plan vivant positionne C5 comme prochaine tranche.

## 13. Interdictions de clôture

Ne pas déclarer C3/C4 terminé si l’un des éléments suivants subsiste :

- snapshot C2d non actif ou probes mécaniques exécutées sur un snapshot retiré ;
- utilisation de l’ancien snapshot pour les probes ;
- tolérance fixe arbitraire sur A/B ;
- H, D, F, bride, puissance, pôles ou fréquence compensés par un score ;
- donnée manquante transformée en succès ;
- accès privilégié hors RLS ;
- lecture ou écriture de `saved_configuration` ;
- route non testée sur le runtime distant.
