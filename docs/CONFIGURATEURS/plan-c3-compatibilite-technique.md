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
- [ ] `VALIDATION PO` : activation du candidat C2b.

`BLOQUANT` : aucune probe mécanique C3 ne doit utiliser l’ancien snapshot actif.

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

- [ ] Relire `docs/CONFIGURATEURS/c2/controles.json`.
- [ ] Relire `docs/CONFIGURATEURS/c2/diff-activation.json`.
- [ ] Vérifier les cinq fixtures B par SQL MCP.
- [ ] Vérifier 540 `K` mappées par SQL MCP.
- [ ] Vérifier les volumes candidat et 0 anomalie bloquante.
- [ ] Obtenir la validation explicite du PO.
- [ ] Activer via `configurator.activate_snapshot`, jamais par `UPDATE` direct.
- [ ] Prouver un seul snapshot actif et l’ancien `retired`.
- [ ] Rejouer les lectures RLS `anon`, `tcs`, `agency_admin`, `super_admin`.

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

- [ ] Étendre les schémas Zod d’entrée avec :
  - A/B/C/H/K ;
  - D/E/F ;
  - M/N/P/S ou `S_thread`/T/Z ;
  - diamètre réel du boulon ;
  - courses transversale et longitudinale du bâti ;
  - plage axiale de l’accouplement ;
  - réseau, tension, couplage et mode réseau/variateur ;
  - exigences applicatives facultatives ;
  - origine, confirmation et preuve de chaque mesure.
- [ ] Créer les schémas de sortie des quatre statuts.
- [ ] Exposer `adaptations_required`, `checks_required`, valeurs attendues,
  observées, delta, jeu calculé et preuves.
- [ ] Définir `ruleset_id` et une version immuable.
- [ ] Conserver la surcharge terrain uniquement si explicite et confirmée.
- [ ] Ajouter les fixtures Zod de refus des champs inconnus.

### Checkpoint C3-1

- Tous les contrats sont `strictObject`.
- Entrées et sorties passent les tests Zod.
- `K`, diamètre du boulon et course du bâti restent trois faits distincts.
- Aucun champ prix, stock, remise ou disponibilité.

## 6. Phase C3-2 — Exécuteur PostgreSQL read-only et erreurs

### Checklist

- [ ] Créer l’exécuteur configurateur transactionnel :
  1. `SET TRANSACTION READ ONLY` ;
  2. claims issus de l’`AuthContext` ;
  3. `SET LOCAL ROLE authenticated` ;
  4. `statement_timeout` et `lock_timeout` bornés ;
  5. `search_path` explicite ;
  6. transaction typée seule transmise aux services.
- [ ] Interdire le client racine dans les services configurateur.
- [ ] Ajouter une garde statique interdisant `saved_configuration`.
- [ ] Ajouter les codes CIR :
  - snapshot absent ou indisponible ;
  - point de fonctionnement absent ;
  - jeu mécanique non calculable ;
  - règles indisponibles ;
  - lecture PostgreSQL échouée ;
  - timeout ;
  - sortie backend invalide.
- [ ] Conserver SQL, stack, diagnostics et valeurs brutes côté privé.
- [ ] Messages publics français, courts, avec `request_id`.

### Checkpoint C3-2

- Tests d’intégration prouvant le rôle `authenticated` et la RLS.
- Toute tentative d’écriture échoue.
- Le scan statique trouve zéro accès C3 à `saved_configuration`.
- Toutes les erreurs publiques passent le catalogue CIR.

## 7. Phase C3-3 — Catalogue et normalisation

### Checklist

- [ ] Implémenter `configurator.motor.catalog.list`.
- [ ] Implémenter `configurator.motor.catalog.get`.
- [ ] Résoudre uniquement le snapshot moteur actif.
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

- le snapshot C2b corrigé est actif ;
- les sept procédures répondent sur le runtime distant ;
- toutes les routes sont read-only ;
- les quatre statuts et leurs preuves sont présents ;
- les budgets et timeouts sont respectés ;
- les tests et probes sont archivés ;
- le plan vivant positionne C5 comme prochaine tranche.

## 13. Interdictions de clôture

Ne pas déclarer C3/C4 terminé si l’un des éléments suivants subsiste :

- activation C2b non validée ;
- utilisation de l’ancien snapshot pour les probes ;
- tolérance fixe arbitraire sur A/B ;
- H, D, F, bride, puissance, pôles ou fréquence compensés par un score ;
- donnée manquante transformée en succès ;
- accès privilégié hors RLS ;
- lecture ou écriture de `saved_configuration` ;
- route non testée sur le runtime distant.
