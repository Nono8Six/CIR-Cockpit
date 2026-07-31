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
- C3/C4 : terminés et prouvés jusqu'au runtime distant ; décision courante
  **GO C5**. C5 reste non commencé.
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
- Surface locale : contrats stricts, exécuteur read-only, catalogue,
  normalisation, moteurs mécanique puis électrique/applicatif, équivalences,
  conseils, énergie et comparaison présents dans
  `shared/schemas/configurator/` et `backend/functions/api/services/configurator/`.
  Aucune route tRPC Configurateurs, intégration frontend ou surface runtime
  distante n'est encore livrée.
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

QA de checkpoint : `qa:back` et `qa:fast` sont verts. Après autorisation
explicite, la fixture Auth `AUDIT_20260604_api_int_user@cir.invalid` a été
recréée avec un profil humain actif `tcs` rattaché à l'agence de test CIR
Bordeaux. `pnpm run qa` est entièrement vert sur le commit `9b97e8a` dans un
worktree isolé : 160 fichiers / 742 tests frontend, 454 tests backend et
9 intégrations distantes réussis ; 0 échec, 7 ignorées. La preuve MCP finale
confirme une identité Auth validée, un profil, un rattachement et
0 entité / interaction de test résiduelle. Le test PostgreSQL C3-2 ciblé reste
vert.

Décision de sortie : **GO C3-3**. C3-3 n'est pas commencé dans ce checkpoint.

## 7. Phase C3-3 — Catalogue et normalisation

### Checklist

- [x] Implémenter le service de `configurator.motor.catalog.list`.
- [x] Implémenter le service de `configurator.motor.catalog.get`.
- [x] Résoudre uniquement le snapshot moteur actif, par jointure explicite sur
  `catalog_snapshot.is_active`. Le snapshot retiré reste lisible sous RLS :
  ajouter un test qui échoue si une lecture catalogue renvoie une ligne d’un
  snapshot non actif.
- [x] Charger modèle, point, rendement, couple, dimensions, brides et options.
- [x] Ne pas écraser deux points IE3/IE4 visuellement proches.
- [x] Construire `fromMotor` comme spécification catalogue sourcée.
- [x] Appliquer les mesures terrain confirmées après la spécification catalogue.
- [x] Retourner `indeterminate` pour une donnée décisive absente, pas une erreur HTTP.

### Checkpoint C3-3

- [x] Probes authentifiées `catalog.list/get` sous la fixture humaine `tcs`.
- [x] Provenance présente sur chaque fait décisif et chaque ligne technique
  chargée.
- [x] Aucun point, bride ou variante fusionné silencieusement.

Preuves du 30/07/2026 :

- la résolution du snapshot impose `domain='motor'`, `is_active=true`,
  `status='active'` et gate `passed` sur la requête principale et sur chaque
  chargement enfant ;
- la pagination est stable sur l'identifiant du point, avec une ligne de liste
  par point de fonctionnement ;
- un modèle actif portant IE3 et IE4 renvoie deux identifiants distincts ;
- un point du snapshot retiré renvoie
  `CONFIGURATOR_OPERATING_POINT_NOT_FOUND` ;
- six tests de normalisation et deux tests d'erreurs sont verts ; `qa:back`
  est vert avec 460 tests backend ;
- `qa:fast` et le gate complet `pnpm run qa` sont verts : 160 fichiers /
  763 tests frontend, couverture, build, 460 tests backend et 9 intégrations
  standards réussies, 0 échec ;
- la suite distante ciblée est verte : 11 intégrations réussies, 0 échec,
  6 ignorées, dont la preuve C3-3 sous rôle et claims réels.

La surface tRPC et le déploiement restent respectivement réservés à C3-7 et
C3-8. Aucun routeur, migration, déploiement ou état distant n'a été modifié.

Décision de sortie : **GO C3-4**. C3-4 n'est pas commencé dans ce checkpoint.

## 8. Phase C3-4 — Compatibilité mécanique

### Fixation par pattes

- [x] Montage B3/B35/B34 identique.
- [x] H strictement identique ; tout écart implique une adaptation.
- [x] Calculer `abs(Acandidat - Aexistant) / 2`.
- [x] Calculer `abs(Bcandidat - Bexistant) / 2`.
- [x] Calculer `(Kcandidat - diametre_boulon) / 2`.
- [x] Ajouter une course de bâti uniquement si mesurée et confirmée.
- [x] A/B différents sans mesure du bâti : `under_reservation`.
- [x] Écart prouvé supérieur au jeu : `not_satisfied`.
- [x] C différent : réserve, puis adaptation si course insuffisante.

### Arbre

- [x] D identique pour un remplacement direct.
- [x] `DECISION PO 2026-07-27` : diamètre D identique et tolérance d’ajustement
  différente restent `satisfied`. L’écart est publié dans `checks_required`
  comme information de montage d’accouplement, jamais dans
  `adaptations_required`, et ne dégrade aucun statut. Tolérance absente : aucune
  alerte, aucune réserve.
- [x] F identique, sans compensation générique.
- [x] E différent : réserve sur engagement et encombrement.
- [x] E ne passe à `satisfied` qu’avec preuve de plage d’accouplement.

### Bride

- [x] Même montage B5/B14/B35/B34.
- [x] Même nature de perçage.
- [x] N, M, Z et S ou `S_thread` strictement identiques.
- [x] P/T différents uniquement avec dégagement vérifié.
- [x] Option `larger`/`smaller` admise si interface exacte et
  `requires_option = true`.
- [x] Ne jamais déduire une bride depuis H.

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

**Checkpoint validé le 30/07/2026 — VERT.**

Livraison :

- `motorMechanicalCompatibility.ts` sépare fonctions pures de pattes, arbre et
  bride, puis agrège les quatre statuts sans score ;
- `motor.schema.ts` expose un résultat mécanique strict et ajoute seulement les
  faits décisifs manquants : nature d'alésage et dégagements P/T prouvés ;
- les calculs A/B, K/boulon, P radial et T axial sont publiés avec leurs entrées
  et leurs preuves ; aucune inconnue n'est convertie en zéro ;
- les adaptations et contrôles restent distincts ; la tolérance D différente
  produit seulement `CHECK_SHAFT_D_FIT`, sans dégrader le verdict ;
- les options `larger`/`smaller` ne sont appariées qu'après interface exacte et
  avec `requires_option=true`.

Preuves :

- 41 tests unitaires C3-4 et 6 tests de normalisation réussis ;
- 19 tests Vitest shared réussis ; lint et typecheck ciblés verts ;
- preuve distante sous la fixture humaine `tcs` : résolution dynamique du
  snapshot actif et d'un point B5 complet, lecture réelle catalogue/RLS,
  provenance conservée, verdict identique `satisfied` ; runner complet
  `RUN_CONFIGURATOR_DB_PROOFS=1`, 11 intégrations réussies, 0 échec,
  6 ignorées ;
- MCP Supabase : actif `6fbf4046-…`, gate `passed`, 1 665 modèles, 2 355 points,
  45 568 cotes, 7 940 brides, 141 alertes ;
- `qa:back` et `qa:fast` verts ; gate final rejoué sur l'index C3-4 isolé :
  743 tests frontend et 501 backend ;
- `pnpm run qa` vert sur cet index isolé : 743 tests frontend avec couverture,
  build, 501 tests backend et 9 intégrations standards réussies, 0 échec ;
- aucune migration, mutation distante, route tRPC ou Edge Function.

Limites conservées : une course, un dégagement ou une plage axiale non prouvé
reste indéterminé ou sous réserve. La compatibilité électrique/applicative,
l'agrégation finale, les procédures tRPC et le déploiement restent hors C3-4.

Décision de sortie : **GO C3-5**. C3-5 n'est pas commencé dans ce checkpoint.

## 9. Phase C3-5 — Compatibilité électrique et applicative

### Électrique bloquant

- [x] Puissance nominale identique.
- [x] Nombre de pôles identique.
- [x] Fréquence identique.
- [x] Mode réseau ou variateur compatible.
- [x] Tension et couplage compatibles avec le réseau fourni.

### Électrique informatif

- [x] Vitesse, couple, rendement/IE, courant, démarrage, masse, inertie et bruit
  ne bloquent pas la compatibilité.
- [x] Courant supérieur : conseil protection et chute de tension.
- [x] Couple inférieur : information, puis contrôle seulement si exigence fournie.
- [x] Rendement différent : comparaison énergétique.
- [x] Vitesse différente à pôles/fréquence identiques : information de glissement.

### Application

- [x] IP, frein, VFD, refroidissement, service, température et démarrages/heure
  ne bloquent que s’ils sont explicitement demandés.
- [x] Exigence non publiée : `indeterminate`.
- [x] Exigence publiée et insuffisante : `not_satisfied`.
- [x] Aucune exigence : information seulement.

### Checkpoint C3-5

Tests couvrant chaque exigence absente, satisfaite, non satisfaite et non
publiée. Un écart de rendement, couple ou courant ne doit jamais masquer ni
créer un blocage électrique.

**Checkpoint validé le 30/07/2026 — VERT.**

Livraison :

- `motorElectricalApplicationCompatibility.ts` est une frontière métier pure,
  sans SQL, tRPC, état global, score, donnée commerciale ni appel IA ;
- les cinq critères électriques décisifs comparent uniquement des valeurs
  prouvées ; toute absence ou valeur non publiée devient `indeterminate` ;
- courant, couple sans exigence, classe IE et vitesse/glissement restent
  informatifs et ne participent pas au verdict électrique ;
- une exigence explicite de couple devient décisive ; sans cette exigence,
  aucun écart de couple ne crée d'incompatibilité ;
- les sept exigences applicatives sont évaluées seulement si elles sont
  fournies. Une capacité candidate absente ou non interprétable reste
  `indeterminate`, jamais une non-conformité supposée ;
- le ruleset reste `motor.compatibility.cir` version `1`, l'agrégation conserve
  `not_satisfied > indeterminate > under_reservation > satisfied`, et toutes les
  listes/preuves sont dédupliquées puis ordonnées canoniquement ;
- la normalisation catalogue propage désormais la classe IE sourcée dans la
  spécification moteur.

Preuves :

- 60 tests Deno C3-5 réussis ; matrice complète des cinq critères électriques
  et des sept exigences applicatives, informations non bloquantes, priorité des
  statuts, `missing_facts`, preuves et ordre d'entrée ;
- non-régression ciblée : 41 tests C3-4 et 6 tests de normalisation réussis ;
- 9 tests Vitest shared réussis, dont sortie C3-5 positive/négative et refus
  d'un champ commercial externe ; lint et typecheck ciblés verts ;
- `qa:back` vert : 150 fichiers lintés, typecheck backend et 561 tests réussis,
  0 échec, 16 intégrations conditionnelles ignorées ;
- `qa:fast` vert dans un worktree isolé : parité migrations, 160 fichiers /
  744 tests frontend, conformité erreurs, lint/typecheck et 561 tests backend ;
- `pnpm run qa` vert dans le même worktree isolé : 744 tests frontend avec
  couverture, build, 561 tests backend et 9 intégrations distantes réussies,
  0 échec, 8 ignorées ;
- MCP Supabase en lecture seule : projet `rbjtrcorlezvocayluok`
  `ACTIVE_HEALTHY`, unique snapshot actif `6fbf4046-be74-4422-9fe8-2d2d8a8d9157`
  `active/passed`, 1 665 modèles, 2 355 points, 45 568 cotes, 7 940 brides,
  141 issues, Edge Function `api` active version 198 ;
- aucune migration, mutation Supabase, fixture persistante, route tRPC,
  modification Auth/RLS, Edge Function ou intégration frontend.

Limites conservées : une notation IP publiée hors forme comparable reste
`indeterminate`; refroidissement et service sont comparés comme exigences
explicites canoniques. Démarrage, masse, inertie et bruit restent informatifs et
n'entrent dans aucun statut décisif. La recherche d'équivalents, l'énergie, le
classement, les conseils consolidés, tRPC et le déploiement restent hors C3-5.

Décision de sortie : **GO C3-6**. C3-6 n'est pas commencé dans ce checkpoint.

## 10. Phase C3-6 — Équivalences, conseils, énergie et comparaison

### Checklist

- [x] Implémenter `configurator.motor.equivalents.fromSpec`.
- [x] Implémenter `configurator.motor.equivalents.fromMotor`.
- [x] Implémenter la synthèse et le classement déterministes.
- [x] Implémenter `configurator.motor.advice.build`.
- [x] Implémenter `configurator.motor.energy.compute`.
- [x] Interdire l’extrapolation hors points de rendement publiés.
- [x] Implémenter `configurator.motor.compare` pour 2 à 4 moteurs.
- [x] Conserver `not_published` comme absence de donnée, jamais comme pénalité.
- [x] Reprendre les bornes énergétiques dans le sens référence/candidat.

### Checkpoint C3-6

- [x] Un blocage essentiel reste premier quel que soit le reste ; classement
  verrouillé par verdict global, verdict mécanique, réserves, faits manquants,
  tri demandé puis clé technique canonique.
- [x] Aucun calcul par points pondérés ; les critères informatifs ne compensent
  jamais une incompatibilité.
- [x] Les résultats énergétiques incomplets restent `indeterminate` ;
  interpolation linéaire uniquement entre deux points publiés strictement
  encadrants, sans profil, heures, rendement, coût ou retour sur investissement
  par défaut.
- [x] Les bornes de gain sont calculées sur le couple ordonné
  référence/candidat avec la matrice `upper | lower | exact | indeterminate`.
- [x] Les conseils sont structurés, canoniques et sourcés ; les quatre issues
  `CURRENT_MISMATCH`, `IE_BELOW_THRESHOLD`, `EFFICIENCY_CURVE` et
  `INERTIA_IMPLAUSIBLE` conservent leurs restrictions.
- [x] Le comparateur 2 à 4 moteurs est stable et ordonné ; les dimensions sont
  une identité, les absences restent `not_published`, les mélanges
  `at_threshold`/`measured` et les ex æquo n'ont aucun gagnant.
- [x] **33 nouveaux tests Deno C3-6**, non-régression C3-3/C3-4/C3-5 comprise
  dans une passe ciblée de **145 tests**, et **24 tests Vitest shared** :
  0 échec, lint et typecheck ciblés verts.
- [x] `qa:back` vert dans un worktree isolé : **594 tests backend**, 0 échec,
  16 intégrations conditionnelles ignorées.
- [x] `qa:fast` vert : **748 tests frontend** et **594 tests backend**, 0
  échec.
- [x] `pnpm run qa` vert dans le même worktree isolé : 748 tests frontend,
  couverture, build et 593 tests backend locaux, 0 échec. Les 17 scénarios
  distants ont été explicitement ignorés pour respecter le checkpoint
  read-only et l'interdiction de fixture/écriture distante.
- [x] MCP Supabase relu sans écriture : projet `rbjtrcorlezvocayluok`
  `ACTIVE_HEALTHY`, unique snapshot actif `6fbf4046-…` `active/passed`,
  1 665 modèles, 2 355 points, 5 699 rendements, 2 370 couples, 45 568 cotes,
  7 940 brides, 141 issues, 59 VFD obligatoires, 109 non-IEC et API v198.
- [x] Aucune migration, mutation Supabase, fixture persistante, modification
  Auth/RLS, route tRPC, Edge Function, déploiement ou intégration frontend.

Fichiers :
`shared/schemas/configurator/motor.schema.ts`,
`shared/schemas/__tests__/configurator-c3-contracts.test.ts`,
`backend/functions/api/services/configurator/motorCatalog.ts`,
`motorC3Determinism.ts`, `motorEquivalence.ts`, `motorAdvice.ts`,
`motorEnergy.ts`, `motorCompare.ts` et leurs tests.

Limitations explicites : un point énergétique non encadré, une qualification
normative absente ou une donnée décisive non publiée restent
`indeterminate`. Les 141 issues catalogue restent visibles et contraignent les
conclusions concernées. Coût annuel et temps de retour ne sont pas
contractualisés et restent hors périmètre. Aucune surface tRPC ou preuve runtime
des nouvelles opérations n'existe avant C3-7.

Décision de sortie : **GO C3-7**. C3-7 n'est pas commencé dans ce checkpoint.

## 11. Phase C3-7 — Surface tRPC

Procédures authentifiées, en query, avec validation entrée/sortie :

- [x] `configurator.motor.catalog.list`
- [x] `configurator.motor.catalog.get`
- [x] `configurator.motor.equivalents.fromMotor`
- [x] `configurator.motor.equivalents.fromSpec`
- [x] `configurator.motor.advice.build`
- [x] `configurator.motor.energy.compute`
- [x] `configurator.motor.compare`

### Checkpoint C3-7

- Contrats partagés et backend alignés.
- Sorties invalides converties en erreur CIR stable.
- Zéro procédure non authentifiée.
- Zéro mutation métier C3.

Preuves du 31/07/2026 :

- les sept chemins sont des queries `authedProcedure` et réutilisent directement
  les schémas de `shared/schemas/configurator/motor.schema.ts` en entrée et en
  sortie ;
- le routeur de domaine appelle `motorCatalogService`,
  `motorEquivalenceService`, `motorAdviceService`, `motorEnergyService` et
  `motorComparisonService` sans réécrire leur logique ;
- les erreurs Zod d'entrée sont publiées comme `INVALID_PAYLOAD` avec détails
  français ; une sortie Zod invalide sous `configurator.motor.*` devient
  `CONFIGURATOR_OUTPUT_INVALID`, sans stack ni diagnostic interne ;
- tests ciblés : 11 tests Deno tRPC et 1 test Vitest de contrats partagés
  portant 14 assertions de type, 0 échec ; check Deno et typecheck frontend
  verts ;
- `pnpm run qa:back` vert : 162 fichiers lintés, typecheck Deno vert,
  600 tests backend réussis, 16 intégrations conditionnelles ignorées ;
- `pnpm run qa:fast` vert : 162 fichiers / 784 tests frontend, conformité
  erreurs, lint/typecheck front et backend, puis 600 tests backend réussis,
  16 intégrations conditionnelles ignorées ;
- aucune intégration distante, migration, mutation Supabase, fixture Auth,
  Edge Function, modification frontend visible ou déploiement.

Décision de sortie : **GO C3-8**. C3 reste globalement en cours et C3-8 n'est
pas commencé.

## 12. Phase C3-8 — QA, performance et livraison distante

### Checklist

- [x] Tests métier ciblés.
- [x] `pnpm run qa:back`.
- [x] `pnpm run qa:fast`.
- [x] `pnpm run qa`.
- [x] Preuves RLS avec rollback sous `anon`, `tcs`, `agency_admin`,
  `super_admin`.
- [x] `EXPLAIN ANALYZE` sur les requêtes réelles.
- [x] Aucun index sans plan démontrant son besoin.
- [x] Déploiement Edge Function `api` via MCP.
- [x] Conserver `verify_jwt=false` seulement parce que l’authentification est
  traitée dans le code.
- [x] Probes authentifiées de toutes les procédures.
- [x] Vérifier logs, budgets, timeouts et erreurs publiques.

### Checkpoint C3-8 du 31/07/2026

- Préflight MCP : projet `rbjtrcorlezvocayluok` `ACTIVE_HEALTHY`, migrations
  C0-C2d présentes, Edge Function `api` active en version 198 et
  `verify_jwt=false`. Le bundle exact de v198 a été capturé en mémoire
  d'exécution pour un rollback éventuel ; aucun fichier secret n'a été écrit.
- Tests ciblés verts : 11 tests Deno tRPC et 1 test Vitest partagé portant
  14 assertions de type. Lint/check Deno sur les cinq fichiers C3-7,
  ESLint shared et typecheck frontend sont verts.
- `qa:back` vert : parité dépôt/distant, 162 fichiers backend lintés,
  600 tests backend réussis, 0 échec, 16 intégrations conditionnelles
  ignorées.
- `qa:fast` vert : 162 fichiers et 785 tests frontend, 600 tests backend,
  0 échec.
- `qa` vert : 785 tests frontend, couverture globale 60,98 % statements,
  53,53 % branches, 55,38 % fonctions et 62,40 % lignes ; build vert malgré
  l'avertissement de taille de chunk connu ; 600 tests backend ; 9
  intégrations distantes réussies, 8 ignorées, 0 échec.
- RLS MCP : `anon` est refusé sur le schéma `configurator` avec SQLSTATE
  `42501`. Un profil humain actif `tcs` et le profil `super_admin` passent
  tous deux sous rôle PostgreSQL `authenticated`, voient l'unique snapshot
  actif et les 14 130 points historisés ; le service reste chargé de filtrer
  les 2 355 points du snapshot actif. La tentative d'`UPDATE` sous transaction
  read-only est refusée avec SQLSTATE `25006`.
- RLS `agency_admin` : après autorisation PO, le profil `super_admin` déjà
  rattaché à son agence a été requalifié uniquement dans une transaction de
  preuve. Sous rôle PostgreSQL `authenticated`, il a vu 1 snapshot actif et
  ses 2 355 points, puis une exception contrôlée `P0001` a forcé le rollback.
  La relecture finale retrouve 1 `super_admin`, 2 `tcs` humains et 0
  `agency_admin` persistant.
- `EXPLAIN (ANALYZE, BUFFERS)` : résolution snapshot 0,140 ms ;
  `catalog.list` 20,477 ms ; `catalog.get` 2,945 ms ; recherche
  d'équivalents 20,820 ms ; chargement rendements 5,938 ms ; seuil énergie
  3,148 ms ; comparaison de quatre points 6,982 ms. Tous les plans utilisent
  les index attendus, sans `Seq Scan`, lecture disque ni spill temporaire.
  Les advisors ne signalent aucun défaut sécurité `configurator` et seulement
  des index non encore utilisés de niveau `INFO`, pas un index manquant.
- Livraison MCP : bundle v198 capturé avant action, puis `api` déployée seule
  de v198 vers v199. La relecture confirme `ACTIVE`, wrapper
  `source/supabase/functions/api/index.ts`, import map `source/deno.json`,
  `verify_jwt=false` et empreinte
  `c22e3ac01f81880ec27a00807c6a796f73f9c1bb01e4ff95fa7926d60db6b07e`.
  Les 122 modules runtime relus correspondent au bundle local ; deux fichiers
  purement `type` sont normalement éliminés et `shared/errors/types.ts` est
  conservé comme module vide par le bundler.
- Probes runtime répétées deux fois sur le snapshot actif : les sept chemins
  retournent 200 et passent leurs schémas partagés. Latences observées : liste
  1,213-1,412 s ; détail 1,426-1,498 s ; équivalents depuis moteur
  6,772-7,067 s ; équivalents depuis spécification 5,721-6,723 s ; conseil
  0,991-1,015 s ; énergie 1,488-1,721 s ; comparaison de quatre moteurs
  1,901-2,643 s. Chaque réponse expose un `x-request-id`.
- Dernier passage, preuves corrélables : liste `612e6d48…`, détail
  `8c2560b9…`, équivalents moteur `090d00c7…`, équivalents spécification
  `3f93794b…`, conseil `c5b2e329…`, énergie `054f214f…`, comparaison
  `adb90b4d…`.
- Négatifs runtime : absence d'Authorization et
  `x-client-authorization` seul retournent 401 `AUTH_REQUIRED`; entrée invalide
  400 `INVALID_PAYLOAD`; point absent 404
  `CONFIGURATOR_OPERATING_POINT_NOT_FOUND`; preflight autorisé 200 avec
  `http://localhost:3000`; origine refusée 403. Aucun token, secret, SQL, stack
  ou diagnostic interne n'est exposé.
- Les timeouts DB restent `statement_timeout=5s` et `lock_timeout=1s`; aucune
  requête n'a produit `CONFIGURATOR_DB_TIMEOUT`. Le flux MCP des logs Edge a
  un retard d'indexation : les premières lignes v199 corrèlent le probe
  diagnostique `catalog.list` 200 puis `catalog.get` 400 avant correction du
  script. Elles ne contiennent que méthode, statut, URL, durée et version,
  sans payload, token, SQL, stack ou secret. Ce décalage d'observabilité,
  ainsi que les 5,7-7,1 s des équivalences, sont archivés comme risques non
  bloquants pour C5.

Décision de sortie : **GO C5**. C3/C4 est terminé. C5 est la prochaine tranche
autorisée mais reste non commencé dans ce checkpoint.

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
