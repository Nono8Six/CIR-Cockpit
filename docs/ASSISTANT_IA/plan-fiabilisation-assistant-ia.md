# Plan de fiabilisation profonde — Assistant IA CIR

> Créé le 2026-07-13 à partir des incidents réels observés sur `/remises/referentiels`.
> Ce document complète le plan général et la Phase 6. Il devient la checklist de suivi du
> chantier correctif portant sur la pertinence, la fiabilité SQL, la continuité conversationnelle,
> la preuve des réponses et le choix du modèle.

## 1. Objectif et règles de livraison

L'assistant doit répondre exactement aux questions métier connues sans laisser un modèle générer
librement le SQL. Le SQL conçu par le modèle reste un recours pour les questions imprévues, sous
contrôles de schéma, de lecture seule, de périmètre et de preuve.

Une phase n'est terminée que si :

1. son comportement est couvert par un test de régression reproductible ;
2. son checkpoint vérifiable est exécuté avec succès ;
3. les preuves sont inscrites dans son tableau de suivi ;
4. aucune modification étrangère au chantier n'a été altérée ;
5. les erreurs suivent les contrats CIR (`httpError`, `createAppError`, catalogue partagé) ;
6. les payloads API sont validés par des schémas Zod stricts avec messages français ;
7. aucune donnée mockée, clé en clair, chaîne de pensée, donnée métier excessive ou texte décoratif
   n'est livré dans le code applicatif.

Le déploiement de l'Edge Function `api` reste interdit sans demande explicite de l'utilisateur.

## 2. Incidents de référence à éliminer

| ID   | Incident                                                                     | Cause prouvée                                                                    | Comportement attendu                                            |
| ------| ------------------------------------------------------------------------------| ----------------------------------------------------------------------------------| -----------------------------------------------------------------|
| I-01 | FESTO retourne 0 CAT_FAB au lieu de 673                                      | Le modèle filtre `FESTO` alors que le snapshot stocke `FEST`                     | Alias canonique et comptage déterministe sans provider          |
| I-02 | ROCK absent de la recherche `drive`                                          | `LIKE` PostgreSQL sensible à la casse ne trouve pas `Drives`                     | Recherche textuelle insensible à la casse et exhaustive         |
| I-03 | « et ROCK ? » retourne « Je ne sais pas »                                    | L'historique ne transporte que le texte, sans contexte ni preuve des outils      | Héritage contrôlé de la dimension, des termes et du snapshot    |
| I-04 | Le modèle invente `agency_id` sur une table qui ne possède pas cette colonne | Le SQL généré n'est pas validé contre le catalogue avant exécution               | Identifiants invalides refusés avant PostgreSQL                 |
| I-05 | Après deux échecs, une requête globale sans snapshot produit 140             | La réparation change le périmètre sémantique pour obtenir un succès              | Une réparation maximum et invariants de périmètre obligatoires  |
| I-06 | Ajouter un point-virgule contourne l'anti-boucle                             | Fingerprint fondé sur les arguments bruts                                        | Fingerprint canonique des requêtes équivalentes                 |
| I-07 | Une trace d'outil réussie est prise pour une preuve métier suffisante        | Le succès technique ne valide pas la sémantique de la requête                    | Provenance structurée de chaque fait et validation du périmètre |
| I-08 | Le runtime continue d'utiliser l'ancien comportement                         | Correctifs présents localement mais Edge Function distante encore en version 118 | Distinguer systématiquement code local, QA et runtime déployé   |

## 3. Architecture cible

```text
Question utilisateur
  ├─ intention métier connue
  │    └─ outil déterministe strict
  │         └─ résultat validé + preuve structurée
  ├─ suivi d'une question précédente
  │    └─ contexte conversationnel compact
  │         └─ outil déterministe strict
  └─ question imprévue
       └─ LLM + outils autorisés
            └─ SQL read-only contrôlé
                 └─ validation schéma + périmètre + preuve
```

La chaîne de pensée interne du modèle n'est jamais affichée. Le diagnostic utilisateur expose
uniquement des éléments auditables : intention interprétée, filtres canoniques, snapshot, outil,
SQL réellement exécuté le cas échéant, nombre de lignes, durée et erreurs normalisées.

## 4. Tableau de suivi global

Statuts autorisés : `À FAIRE`, `EN COURS`, `BLOQUÉE`, `VALIDÉE`.

| Phase | Intitulé | État initial au 2026-07-13 | Statut | Checkpoint final | Preuve |
| --- | --- | --- | --- | --- | --- |
| 0 | État de référence et régressions | Incidents reproduits manuellement, couverture incomplète | VALIDÉE | Les cinq conversations réelles échouent avant correction pour la cause attendue | Snapshot/vérités DB figés ; 7 régressions rouges ; baseline live complète sur `api` v118 |
| 1 | Couche sémantique déterministe | `aggregate_segments` et FESTO → FEST présents localement | VALIDÉE | FESTO, ROCK et comptages passent sans SQL généré | 7 tests P1 dédiés + 7 contrats/broker verts ; vérités DB P0 confirmées par MCP ; provider/tokens/coût à zéro |
| 2 | Routage d'intentions | Routage déterministe limité au comptage CAT_FAB | VALIDÉE | Chaque intention critique ne reçoit que ses outils autorisés | Matrice P2 : 20 cas, allowlists exactes, fallback SQL borné et 4 chemins sans provider |
| 3 | Contexte conversationnel | Historique limité à `{role, content}` | VALIDÉE | « et ROCK ? » hérite correctement du contexte précédent | Contrat strict borné, TTL/snapshot contrôlés, 5 tests P3 backend + transport frontend vert |
| 4 | Fallback SQL durci | Lecture seule/RLS bornées, validation sémantique incomplète | VALIDÉE | Colonnes inventées, changements de scope et boucles équivalentes sont bloqués | Validation structurelle + catalogue réel avant SQL métier ; 17 tests P4 verts ; P5 reste isolée |
| 5 | Preuves, erreurs et diagnostic UI | Sources et SQL partiellement visibles localement | VALIDÉE | Aucun fait sans provenance ; aucun détail interne ou sensible exposé | Contrat public Zod strict, statuts et dérivations validés ; `api` v122 ACTIVE |
| 5B | Contexte universel : schéma auto-descriptif, vues typées, catalogue cherchable | Dump catalogue 27–49K tokens ; 5 commentaires `pg_description` ; colonnes financières `text` | VALIDÉE | Fallback documenté et cherchable ; estimation conservatrice p95 2 080 tokens ; RLS des vues prouvée | Migration `20260714102852`, 36 tests offline + 3 intégration DB, Supabase MCP |
| 6 | Évaluations et choix du modèle | Harnais corrigé et pré-vol réel concluant sur six candidats ; campagne recentrée sur DeepSeek Flash/Pro | VALIDÉE | Flash retenu pour le courant/borné, Pro pour le fallback SQL complexe, avec réserve explicite sur le lot Pro interrompu | `rapport-evaluation-modeles-p6.md` |
| 7 | Performance, Realtime et UX | Correctifs Realtime/React locaux, non livrés | À FAIRE | p50/p95 mesurés, absence de boucle Realtime, parcours UI vérifié | — |
| 8 | QA finale, documentation et livraison | `pnpm run qa` bloqué par un chantier dashboard concurrent | BLOQUÉE | Gate complète verte et probes conditionnelles vertes | E4 déployé sur `api` v138 ; auth/CORS/Flash verts ; Pro bloqué par politique de données OpenRouter + `max_price` ; couverture dashboard préexistante 13,33 % < 30 % |

---

## Phase 0 — État de référence et tests de régression

### Objectif

Figer les données, les conversations et les symptômes avant toute nouvelle correction afin de
mesurer chaque amélioration et d'éviter les correctifs spéculatifs.

### Travaux

- [x] Identifier et documenter le snapshot d'évaluation avec son UUID, son agence et sa date.
- [x] Vérifier sur ce snapshot les attentes FEST/FESTO, ROCK, marques `drive/variateur` et nombre
  de marques distinctes.
- [x] Ajouter les phrases exactes I-01 à I-05 à la suite offline versionnée.
- [x] Ajouter les résultats attendus dans des fixtures de test uniquement, jamais dans le code
  applicatif.
- [x] Capturer le modèle, le provider, les outils, le SQL, les tours, le coût et la latence de la
  baseline actuelle.
- [x] Cartographier les fichiers IA modifiés et les séparer du chantier dashboard dans le rapport.

### Checkpoint vérifiable P0

Le checkpoint est validé si les cinq conversations de référence sont reproductibles sur un
snapshot identifié, si les tests échouent avant correction pour les causes attendues et si le
rapport de baseline contient modèle, provider, outils, SQL, coût et latence.

Preuves minimales :

```powershell
deno test --env-file=backend/.env --allow-env --config backend/deno.json `
  backend/functions/api/services/ai/assistantPhase6Evaluations_test.ts
```

Pour la vérification DB conditionnelle, utiliser Supabase MCP ou le runner d'intégration documenté,
sans inscrire de secret dans la commande.

### Suivi P0

| Date | Statut | Exécuté par | Preuve/commande | Résultat | Écart ou blocage |
| --- | --- | --- | --- | --- | --- |
| 2026-07-13 | VALIDÉE | Codex | Supabase MCP, tests Deno ciblés, runner live conditionnel (1 répétition/cas) | Snapshot/vérités DB figés ; 13 tests verts et 7 régressions rouges attendues ; baseline v118 complète | Deux cas terminent en erreur provider, ce qui fait partie de la baseline reproduite |

### État de référence P0 — 2026-07-13

#### Snapshot et vérité DB

- Projet Supabase réellement lié : `rbjtrcorlezvocayluok` (`CIR_Cockpit`).
- Snapshot actif : `4e216bc4-7d82-4eb7-aa20-2cc8316667cc`, statut `actif`,
  `is_active=true`, créé le 2026-07-07 à 14:41:15 UTC et activé à 14:41:35 UTC.
- Import : `58f279d4-cc64-47ac-af72-05e2280f3f46`, statut `analyse_ok`, créé le
  2026-07-07 à 14:40:53 UTC, analyse terminée à 14:41:21 UTC. Fichier attaché :
  `Classification_produit_07-07-2026_16-36-34.xlsx` (497 lignes). Les sources effectives peuvent
  être réutilisées depuis des imports précédents selon le mécanisme existant.
- Agence : non applicable au snapshot. Les tables partagées `pricing_reference_snapshots` et
  `pricing_supplier_segments` ne portent pas de colonne `agency_id`; l'agence active concerne
  l'identité et l'audit IA, pas le périmètre de ce référentiel global.
- FEST canonique : 673 lignes segment et 673 `CAT_FAB` distinctes. L'alias `FESTO → FEST` est une
  règle locale dans `resolvePricingReferenceBrandAliases`, pas une ligne d'alias en DB.
- ROCK avec `CAT_FAB_L ILIKE '%drive%'` : 234 lignes.
- Marques dont `CAT_FAB_L` contient `variateur` ou `drive`, sans casse : `BONF`, `FEST`, `LERO`,
  `OPTI`, `PARK`, `REXR`, `ROCK`, `SIEM`.
- Marques distinctes dans le snapshot : 140.

#### Cartographie local / déployé

- Edge Function réellement active : `api` version 118, statut `ACTIVE`, `verify_jwt=false`,
  entrypoint `source/supabase/functions/api/index.ts`, import map `source/deno.json`.
- Modifications Assistant IA locales : services `backend/functions/api/services/ai/*`, tests et
  runners IA, contrats `shared/schemas/ai.schema.ts`, erreurs partagées, schéma/migrations IA,
  services référentiels utilisés par l'assistant, composants/tests `pricing-references`, docs
  `docs/ASSISTANT_IA/*`, runbook et cahier des charges IA.
- Modifications concurrentes exclues : `frontend/src/components/Dashboard.tsx`, tout
  `frontend/src/components/dashboard/**`, `frontend/e2e/dashboard-p06.spec.ts`, routes/racine React,
  hooks/agrégats dashboard et interactions Realtime, ainsi que `docs/refonte-pilotage-v3.md`.
- Conclusion : le comptage déterministe FESTO, les améliorations de diagnostic et les changements
  de routage visibles localement ne prouvent pas le comportement de la version 118 déployée.

#### Incidents, causes et régressions

- Les cinq conversations exactes sont versionnées dans la suite offline et dans le runner live P0,
  limité à une répétition par cas. Le compte d'intégration fourni a permis la campagne sur `api` v118.
- FEST/FESTO : réponse 673 exacte, mais 4 tours provider et SQL global sans filtre snapshot.
- Recherche `variateur/drive` : réponse incomplète (`FEST`, `LERO`, `OPTI`, `PARK`, `REXR`) ; SQL
  `LIKE` sensible à la casse, donc `BONF`, `ROCK` et `SIEM` manquent par rapport à la vérité DB.
- Relance ROCK : `Je ne sais pas.`, aucun outil, aucun héritage structuré du résultat précédent.
- Nombre de marques : échec `AI_PROVIDER_UNAVAILABLE`; SQL invente `agency_id`, répète des requêtes
  équivalentes avec point-virgule et n'atteint jamais le snapshot de référence.
- Changements tarifaires : échec `AI_PROVIDER_RATE_LIMITED`; SQL invente également `agency_id` sur
  `pricing_reference_snapshots`, avant résultat métier.
- `assistantPhase6Evaluations_test.ts` fige l'UUID et les attentes DB, puis caractérise en rouge le
  routage `drive`/`Drive`/`Drives`/`DRIVE`, la recherche exhaustive, le comptage de marques, la
  relance ROCK et la distinction succès technique/preuve métier.
- `assistantSqlTools_test.ts` caractérise en rouge la colonne `agency_id` inexistante, le fingerprint
  SQL avec/sans point-virgule et l'interdiction de retirer le snapshot pendant une réparation.
- Commande ciblée : 20 tests, 13 réussis et 7 échecs attendus. Aucun test ignoré et aucune assertion
  affaiblie. Aucun code applicatif n'a été modifié pour les faire passer.

#### Baseline provider

Modèle demandé : `mistralai/mistral-small-3.2-24b-instruct`; modèle servi identique; passerelle
`openrouter`; provider réellement servi sur les générations observées : `DeepInfra`.

| Cas | Réponse/état | Tours | Tokens entrée/sortie | Coût USD | Latence | Snapshot réellement consulté |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| FEST/FESTO | `673` | 4 | 27 379 / 125 | 0,00207843 | 11 131 ms | Aucun filtre snapshot |
| `variateur/drive` + `cat_fab` | 5 marques, résultat incomplet | 4 | 27 487 / 129 | 0,00208733 | 7 826 ms | Aucun filtre snapshot |
| `tes sur ? et rock ?` | `Je ne sais pas.` | 1 | 4 966 / 6 | 0,00037365 | 1 371 ms | Aucun outil/snapshot |
| Nombre de marques | `AI_PROVIDER_UNAVAILABLE` | échec après outils | 49 478 / 537 | 0,00381825 | 12 555 ms | Aucun; filtre `agency_id` invalide |
| Changements tarifaires | `AI_PROVIDER_RATE_LIMITED` | échec après outils | 20 314 / 602 | 0,00164395 | 29 298 ms | Tentative snapshot actif invalide avec `agency_id` |

Coût total observé : `0,01000161 USD`. Les arguments SQL n'ont pas été ajoutés à
`ai_usage_events` par P0 : ils existaient déjà dans les métadonnées de la version 118 déployée,
ce qui constitue un écart de runtime à traiter dans les phases correctives.

Décision : P0 `VALIDÉE`. P1 est la seule phase suivante autorisée.

---

## Phase 1 — Couche sémantique déterministe des référentiels

### Objectif

Supprimer le SQL généré pour les recherches et comptages métier critiques.

### Travaux

- [x] Finaliser `aggregate_segments` avec métrique explicite, snapshot résolu côté backend et
  alias canoniques.
- [x] Ajouter `search_supplier_categories` pour les recherches CAT_FAB insensibles à la casse.
- [x] Ajouter `count_supplier_brands` pour le comptage exact des marques du snapshot actif.
- [x] Ajouter `check_brand_matches` pour vérifier une marque dans une recherche précédente.
- [x] Centraliser les alias de marques, notamment FESTO → FEST et ROCKWELL → ROCK.
- [x] Échapper `%`, `_` et `\` dans les termes destinés à une recherche `LIKE`/`ILIKE`.
- [x] Définir les synonymes contrôlés (`drive`, `drives`, `variateur`, `VFD`) sans recherche
  approximative non auditée.
- [x] Valider les entrées et sorties par Zod `.strict()` avec messages français.
- [x] Attacher snapshot, filtres canoniques et métrique aux citations structurées.

### Checkpoint vérifiable P1

Le checkpoint est validé si :

- FEST et FESTO retournent le même comptage exact ;
- ROCK est présent pour `drive`, `Drive`, `Drives` et `DRIVE` ;
- le nombre de marques est celui du snapshot actif ;
- ces questions utilisent exclusivement les outils métier attendus ;
- aucun appel OpenRouter ni SQL généré n'est effectué ;
- coût provider et tokens provider sont nuls pour ces chemins.

Preuves minimales : tests de services, contrats stricts, phrase exacte et vérification DB sur le
snapshot figé.

### Suivi P1

| Date | Statut | Exécuté par | Preuve/commande | Résultat | Écart ou blocage |
| --- | --- | --- | --- | --- | --- |
| 2026-07-13 | VALIDÉE | Codex | Tests Deno P1/contrats/broker, lint ciblé, `deno check`, Supabase MCP, déploiement `api` | FEST/FESTO 673 CAT_FAB et 673 segments ; ROCK+drive 234 ; 8 marques exactes ; 140 marques ; provider/tokens/coût = 0 ; `api` v119 ACTIVE | `qa:back` volontairement rouge : 298 verts, 5 rouges P3/P4/P5, 11 conditionnels ignorés ; aucune migration P1 nécessaire |
| 2026-07-13 | VALIDÉE | Codex | Correctifs ciblés VFD/accents, tests Deno P1, Supabase MCP read-only sur le snapshot P0 | Le terme demandé, le terme canonique et les variantes de requête sont séparés ; `vfd` et `électrique` restent littéralement recherchés ; DB : VFD 3, variateur 11, drive 348, électrique 9, electrique 2 | Recherche accent-insensitive complète reportée : aucune extension, migration ou translittération asymétrique ajoutée |

#### Checkpoint P1 — 2026-07-13

- Architecture : règles métier centralisées dans `referenceSemantics.ts`; résolution du snapshot
  par contexte de page puis snapshot actif; requêtes paramétrées et agrégées dans le service
  référentiels; contrats d'outils stricts dans `assistantTools.ts`; dispatch déterministe avant le
  déchiffrement et l'appel OpenRouter dans `assistantBroker.ts`.
- Outils : `aggregate_segments`, `search_supplier_categories`, `count_supplier_brands` et
  `check_brand_matches`, tous en contrat `1.0`, avec entrées/sorties Zod strictes, limites de
  termes/marques/exemples, plafond global d'octets et validation de sortie avant le broker.
- Preuve DB, projet `rbjtrcorlezvocayluok`, snapshot
  `4e216bc4-7d82-4eb7-aa20-2cc8316667cc` : FEST/FESTO = 673 segments et 673 CAT_FAB distinctes;
  ROCK + `drive` = 234 segments; `variateur OR drive` = `BONF`, `FEST`, `LERO`, `OPTI`, `PARK`,
  `REXR`, `ROCK`, `SIEM`; 140 marques distinctes. Les requêtes métier filtrent `snapshot_id` et
  ne contiennent pas `agency_id`.
- Normalisation corrigée : `FESTO → FEST`, `ROCKWELL → ROCK`; les termes demandés, canoniques et
  variantes SQL sont distincts. `VFD` conserve `vfd` et s'étend de façon bornée à `drive`,
  `drives`, `variateur`; `électrique` conserve sa variante accentuée. Les espaces/casse sont
  normalisés et `%`, `_`, `\` restent échappés sans wildcard utilisateur implicite. Une recherche
  accent-insensitive symétrique complète reste explicitement hors P1 faute d'`unaccent`.
- Broker : les trois intentions P1 reconnues exécutent directement l'outil métier. Le test avec
  provider factice qui lève immédiatement reste vert; `input_tokens=0`, `output_tokens=0`, coût
  `0`, trace et citation avec outil, métrique, filtres canoniques et snapshot.
- Tests : suite dédiée `assistantSemanticTools_test.ts` 7/7; contrats/broker ciblés 7/7;
  baseline P0 rejouée après correction : 15 verts et 5 rouges attendus. Les rouges restants sont
  P3 (héritage de « et ROCK ? »), P4 (colonne SQL inconnue, fingerprint point-virgule, invariant
  snapshot pendant réparation) et P5 (preuve métier complète d'un succès technique).
- Fichiers P1 : `assistantBroker.ts`, `assistantTools.ts`, `assistantSemanticTools_test.ts`,
  `referenceDiffs.ts`, `referenceImports.ts`, `referenceSemantics.ts` et ce document.
- Validations : lint Deno ciblé vert; `deno check --config backend/deno.json
  backend/functions/api/index.ts` vert; `qa:back` atteint 298 tests verts puis échoue uniquement
  sur les cinq régressions futures conservées; vérification MCP en lecture seule verte. Aucun test
  P3/P4/P5 affaibli. `pnpm run qa` franchit 156 fichiers/686 tests frontend mais bloque sur la
  couverture dashboard concurrente (`useDashboardStatusHelpers.ts`, 13,33 % pour 30 %).
- Livraison distante autorisée le 2026-07-13 : aucune migration P1 à appliquer; les six migrations
  IA locales existantes étaient déjà toutes présentes dans l'historique distant. Edge Function
  `api` déployée en version 119 `ACTIVE`, `verify_jwt=false`, entrypoint
  `source/supabase/functions/api/index.ts`, import map `source/deno.json`. Probes sans session :
  `ai.assistant.status` et `ai.assistant.ask` répondent `401 AUTH_REQUIRED` (aucun 404), preflight
  `OPTIONS` 200 avec origine `http://localhost:3000`. Aucun commit ou push.

Décision : P1 `VALIDÉE`. La prochaine phase autorisée est P2 uniquement.

---

## Phase 2 — Routage d'intentions et allowlist d'outils

### Objectif

Sélectionner le chemin métier avant le provider et empêcher le catalogue SQL d'être proposé quand
un outil déterministe couvre la question.

### Travaux

- [x] Reconnaître les comptages CAT_FAB par marque.
- [x] Reconnaître le comptage de marques distinctes.
- [x] Reconnaître la recherche textuelle dans CAT_FAB.
- [x] Reconnaître la vérification autonome d'une marque avec termes et dimension explicites.
- [x] Conserver les routes bornées pour changements, anomalies et santé.
- [x] Définir une allowlist d'outils par intention dans une source unique.
- [x] Poser une clarification lorsque « famille » peut désigner CAT_FAB ou FAM/FAM_LIB.
- [x] Laisser les seuls outils SQL généralistes disponibles si aucune intention connue n'est retenue.

### Checkpoint vérifiable P2

Le checkpoint est validé si une matrice de tests prouve, pour chaque intention critique, la liste
exacte des outils exposés et l'absence de `get_database_catalog`,
`describe_database_tables` et `execute_readonly_sql` lorsque l'outil métier suffit.

### Suivi P2

| Date | Statut | Exécuté par | Preuve/commande | Résultat | Écart ou blocage |
| --- | --- | --- | --- | --- | --- |
| 2026-07-13 | VALIDÉE | Codex | `assistantIntentRouting_test.ts`, suites P1/contrats/consolidée, lint/check, `qa:docs`, Supabase MCP read-only | 20 cas de matrice et 3 tests P2 verts ; allowlists exactes ; quatre fast paths à zéro provider ; fallback CRM limité aux 3 outils SQL ; 31 verts/5 rouges futurs dans la suite consolidée ; `qa:back` 303 verts/5 rouges/11 ignorés | Les cinq rouges restent exactement P3 (continuité), P4 (colonne/fingerprint/snapshot) et P5 (preuve métier) |

#### Matrice d'intentions P2 — 2026-07-13

| Intention | Dimension | Mode | Outils autorisés exacts |
| --- | --- | --- | --- |
| `segment_count` | `cat_fab` | déterministe direct | `aggregate_segments` |
| `supplier_category_search` | `cat_fab` | déterministe direct | `search_supplier_categories` |
| `supplier_brand_count` | `brand` | déterministe direct | `count_supplier_brands` |
| `supplier_brand_check` | `cat_fab` | déterministe direct | `check_brand_matches` |
| `diff_analysis` | diff / CAT_FAB / famille CIR | provider borné | `get_diff_summary`, `aggregate_diffs`, `list_diffs` |
| `anomaly_analysis` | anomalie | provider borné | `get_anomalies_summary`, `list_anomalies` |
| `health_analysis` | import | provider borné | `list_imports`, `get_import_details`, `get_health_report` |
| `clarification` | ambiguë | sans provider | aucun |
| `general_sql` | imprévue | fallback SQL | `get_database_catalog`, `describe_database_tables`, `execute_readonly_sql` |

Priorité stable : changements, anomalies, santé/imports, intentions référentiels, clarification,
puis fallback SQL. Les citations, négations et noms propres testés ne déclenchent pas une intention
CAT_FAB. Une instruction injectée demandant le SQL ne peut pas élargir l'allowlist. `ROCK` et
`et ROCK ?` seuls restent volontairement hors routage P2 afin de préserver la régression P3.

Décision : P2 `VALIDÉE`. La prochaine phase autorisée est P3 uniquement.

---

## Phase 3 — Contexte conversationnel structuré

### Objectif

Permettre les relances courtes sans persister les conversations en DB et sans renvoyer de données
métier excessives au provider.

### Travaux

- [x] Étendre le contrat de réponse avec un contexte conversationnel compact et strict.
- [x] Transporter domaine, intention, dimension, snapshot et filtres canoniques utiles.
- [x] Transporter uniquement un résumé borné du dernier résultat nécessaire au suivi.
- [x] Définir les règles d'héritage pour « et ROCK ? », « et SIEMENS ? » et « combien parmi
  celles-là ? ».
- [x] Réinitialiser le contexte lors d'un changement explicite de sujet ou de snapshot.
- [x] Refuser un contexte expiré, incohérent ou provenant d'une surface non autorisée.
- [x] Ne pas réinjecter les traces brutes, le prompt système, les résultats SQL complets ou une
  chaîne de pensée.

### Checkpoint vérifiable P3

Le checkpoint est validé si le scénario suivant passe de bout en bout :

1. recherche CAT_FAB contenant `variateur` ou `drive` ;
2. relance « et ROCK ? » ;
3. réponse fondée sur les mêmes termes, la même dimension et le même snapshot ;
4. aucun nouvel appel au catalogue généraliste ;
5. changement explicite de sujet réinitialisant correctement le contexte.

### Suivi P3

| Date | Statut | Exécuté par | Preuve/commande | Résultat | Écart ou blocage |
| --- | --- | --- | --- | --- | --- |
| 2026-07-13 | VALIDÉE | Codex | 5 tests `assistantConversationContext_test.ts`, baseline Phase 6, tests hook/dialog, typechecks, lint, `qa:back` | `et ROCK ?`, `et SIEMENS ?` et « combien parmi celles-là ? » héritent termes/dimension/snapshot sans provider généraliste ; contexte strict limité à 8 termes/50 marques et TTL 15 min ; frontend conserve uniquement le dernier contexte en mémoire | `qa:back` : 309 verts, 4 rouges futurs P4/P5, 11 conditionnels ignorés ; aucune migration nécessaire |

#### Checkpoint P3 — 2026-07-13

- Contrat partagé : `conversation_context` versionné et strict dans la requête/réponse, avec
  domaine, intention, dimension, snapshot, termes demandés/canoniques/requête, marques et résumé
  agrégé. Aucun résultat SQL, trace brute, prompt ou chaîne de pensée n'est transporté.
- Durée et cohérence : TTL maximal de 15 minutes, dates valides, surface
  `pricing.references` et snapshot de page cohérent. Un contexte expiré ou incohérent est ignoré.
- Héritage : seules les relances courtes reconnues héritent du contexte. Une intention autonome ou
  une question CRM remplace/réinitialise le chemin; `ROCK` seul sans contexte reste non inventé.
- Exécution : `et ROCK ?` et `et SIEMENS ?` appellent directement `check_brand_matches` avec les
  termes et le mode hérités. « combien parmi celles-là ? » utilise `count_supplier_brands` borné
  aux marques du dernier résumé. Aucun catalogue SQL ni provider n'est requis.
- Frontend : `useAssistantChat` conserve le dernier contexte dans une ref transitoire, l'attache à
  la requête suivante et l'efface au reset ou lorsqu'une réponse renvoie `null`. Aucune persistance
  locale ou DB.
- Tests : 5/5 contexte backend, 9/10 baseline Phase 6 avec la seule réserve P5 attendue, 8/8
  hook/dialog frontend, typechecks front/back et lint verts. Suite ciblée : 37 verts, 4 rouges
  futurs P4/P5. `qa:back` : 309 verts, 4 rouges P4/P5, 11 ignorés.

Décision : P3 `VALIDÉE`. La prochaine phase autorisée est P4 uniquement.

---

## Phase 4 — Fallback SQL généraliste durci

### Objectif

Conserver la capacité à répondre aux questions imprévues sans accepter un SQL techniquement valide
mais sémantiquement faux ou hors périmètre.

### Travaux

- [x] Vérifier avant exécution qu'une seule instruction read-only est présente.
- [x] Vérifier les tables et colonnes contre le catalogue autorisé.
- [x] Refuser les schémas, fonctions et constructions interdites.
- [x] Imposer ou injecter côté backend le snapshot pour les tables versionnées.
- [x] Ne jamais demander au modèle d'inventer un filtre `agency_id` ; s'appuyer sur l'identité
  backend, le rôle `authenticated` et RLS.
- [x] Refuser les recherches exhaustives textuelles sensibles à la casse lorsqu'elles changent
  la sémantique attendue.
- [x] Canonicaliser casse, espaces, retours à la ligne, arguments JSON et point-virgule final dans
  le fingerprint anti-boucle.
- [x] Autoriser une seule réparation SQL après échec.
- [x] Vérifier que la réparation conserve tables, snapshot, dimensions et filtres métier.
- [x] Refuser toute réponse factuelle si aucun résultat équivalent n'a réussi.

### Checkpoint vérifiable P4

Le checkpoint est validé si les tests prouvent que :

- une colonne `agency_id` inexistante est refusée avant PostgreSQL ;
- ajouter un point-virgule ne contourne plus l'anti-boucle ;
- une réparation ne peut pas retirer le snapshot ni élargir la requête à tout l'historique ;
- une injection, une multi-instruction et une table interdite sont refusées ;
- une requête read-only légitime sur une question imprévue reste fonctionnelle.

### Suivi P4

| Date | Statut | Exécuté par | Preuve/commande | Résultat | Écart ou blocage |
| --- | --- | --- | --- | --- | --- |
| 2026-07-13 | VALIDÉE | Codex | `assistantSqlTools_test.ts`, suites assistant P1/P2/P3/P4, lint/check Deno, `pnpm run qa:back`, `pnpm run qa`, Supabase MCP et probes HTTP/CORS | 17/17 tests SQL P4 ; suites assistant 43 verts et 1 rouge P5 réservé ; `qa:back` 319 verts/1 rouge P5/11 ignorés ; frontend global 687/687 vert avant seuil coverage ; `api` v121 active et probes vertes | `qa` reste arrêté par `useDashboardStatusHelpers.ts` à 13,33 % de branches pour 30 %, écart frontend préexistant et hors P4 |

#### Checkpoint P4 — 2026-07-13

- Architecture : tokenizer SQL structurel côté backend, analyse des relations, projections,
  dimensions, filtres et snapshots, puis validation contre le catalogue `information_schema`
  réellement lisible sous le rôle PostgreSQL `authenticated` avant la requête métier.
- Protections SQL : une instruction `SELECT`/`WITH` uniquement, sans commentaire, écriture,
  verrouillage de ligne, schéma non public, relation secrète, fonction hors allowlist ou
  construction non reconnue. Les tables et colonnes inconnues sont refusées avant PostgreSQL.
- Snapshot et RLS : `snapshot_id` est obligatoire sur les tables de données référentielles
  versionnées. Aucun `agency_id` n'est injecté ; l'outil interdit au modèle d'ajouter ce filtre et
  conserve l'identité JWT backend, `set local role authenticated`, la transaction read-only et les
  RLS. Les référentiels globaux sans `agency_id` restent interrogeables avec leur vrai catalogue.
- Recherche textuelle : `LIKE` est refusé pour le fallback exhaustif ; `ILIKE` est requis afin de
  ne pas perdre les variations de casse présentes dans les référentiels.
- Fingerprint : canonicalisation du SQL hors casse non significative, espaces, retours à la ligne
  et point-virgule final, plus tri récursif stable des objets JSON. Les valeurs métier distinctes
  restent distinctes.
- Réparation : une seule réparation après échec ; tables, snapshots, dimensions et filtres doivent
  rester strictement identiques. La seconde exécution est bloquée avant l'accès métier si un
  invariant change. Une réponse factuelle est refusée si aucune exécution SQL valide n'aboutit.
- Tests : `assistantSqlTools_test.ts` 17/17 ; suites assistant P1/P2/P3/P4 43 vertes, avec la seule
  régression P5 volontaire encore rouge. `pnpm run qa:back` : 319 verts, 1 rouge P5, 11 tests
  conditionnels ignorés. Lint Deno ciblé et complet, `deno check` Edge Function : verts.
- Gate finale : `pnpm run qa` atteint 687/687 tests frontend verts et échoue uniquement sur le
  seuil préexistant de branches de `useDashboardStatusHelpers.ts` (13,33 % < 30 %). Aucun E2E
  exécuté : aucun parcours UI n'est modifié.
- Migration : aucune ; P4 ne modifie ni schéma, ni RLS, ni index, ni donnée.
- Déploiement distant : `api` v121 `ACTIVE`, `verify_jwt=false`, wrapper
  `supabase/functions/api/index.ts` et import map `deno.json` confirmés par Supabase MCP.
  `ai.assistant.status` et `ai.assistant.ask` répondent `401 AUTH_REQUIRED` sans authentification,
  jamais `404`. Leurs preflights `OPTIONS` depuis `http://localhost:3000` répondent `200` avec
  `Access-Control-Allow-Origin` et `GET, POST, OPTIONS`.
- Réserve P5 : la preuve métier structurée d'un succès technique reste volontairement hors P4 et
  sa régression dédiée demeure rouge.

Décision : P4 `VALIDÉE`. La prochaine phase fonctionnelle reste P5, non implémentée ici.

---

## Phase 5 — Preuves, erreurs et diagnostic utilisateur

### Objectif

Rendre chaque réponse factuelle vérifiable sans exposer la chaîne de pensée, les descriptions
internes des outils ou les détails sensibles d'une erreur backend.

### Travaux

- [x] Attacher chaque fait à un outil, un snapshot, un champ de résultat et une valeur.
- [x] Représenter explicitement les comptes dérivés d'une liste.
- [x] Distinguer résultat vérifié, analyse partielle et échec.
- [x] Afficher intention, dimension, filtres, snapshot, outil, durée et nombre de lignes.
- [x] Afficher le SQL réellement exécuté uniquement pour le fallback SQL généraliste.
- [x] Afficher les filtres serveur ajoutés et le numéro de tentative sans exposer de secret.
- [x] Masquer prompts système, descriptions internes et messages PostgreSQL bruts.
- [x] Ajouter ou compléter les codes d'erreur partagés nécessaires.
- [x] Vérifier `httpError`, `createAppError`, `handleUiError`, `reportError` et `notifyError` sur
  tous les chemins impactés.

### Checkpoint vérifiable P5

Le checkpoint est validé si :

- aucun chiffre n'est affiché sans provenance structurée ;
- une liste de huit marques peut justifier un compte dérivé de huit ;
- un outil échoué est visible comme échec et non comme source métier ;
- aucune chaîne de pensée ou description interne n'apparaît ;
- les erreurs d'accès, quota, SQL refusé et provider vide produisent les codes et actions de
  récupération attendus.

Validation frontend minimale : tests Vitest ciblés, typecheck, lint et contrôle de conformité des
erreurs.

### Suivi P5

| Date | Statut | Exécuté par | Preuve/commande | Résultat | Écart ou blocage |
| --- | --- | --- | --- | --- | --- |
| 2026-07-14 | VALIDÉE | Codex | Régression P5, suites assistant, `qa:back`, `qa:front`, `qa`, navigateur local, Supabase MCP et probes HTTP/CORS | 51/51 assistant ; backend 323 verts/11 ignorés ; frontend 687/687 ; `api` v122 ACTIVE ; auth 401 et CORS 200 | `qa` reste arrêté uniquement par `useDashboardStatusHelpers.ts` à 13,33 % de branches pour 30 %, écart préexistant hors P5 |

### Checkpoint P5 — 2026-07-14

- Contrat : `evidence` public strict et borné sépare les faits, exécutions assainies et traces
  internes. Chaque fait expose outil, snapshot, champ, valeur source, valeur affichée et dérivation.
- Vérification : `verified` exige au moins un fait prouvé ; `partial` conserve les faits vérifiés
  avec les échecs complémentaires ; `failed` remplace toute formulation factuelle fournisseur par
  un message de récupération sûr.
- Dérivations : un compte `count` est refusé si la valeur affichée diffère de la longueur de la
  liste source ; le cas des huit marques est couvert explicitement.
- Diagnostic public : intention, dimension, filtres demandés/canoniques/serveur, snapshot, outil,
  durée, lignes et tentative SQL sont transportés sans arguments bruts. Le SQL n'est public que
  pour `execute_readonly_sql` après exécution réussie et validation P4.
- Protection : prompts système, descriptions d'outils, secrets, stacks, erreurs PostgreSQL brutes
  et SQL refusé ne figurent pas dans le contrat public. Les codes existants d'accès, quota,
  provider vide/indisponible et boucle SQL restent utilisés ; aucune migration n'est nécessaire.
- Frontend : panneau accessible et repliable avec statuts textuels, valeurs tabulaires, provenance,
  filtres et diagnostic ; retry masqué pour les erreurs non retryables. Contrôle local authentifié :
  140 marques, snapshot `4e216bc4-7d82-4eb7-aa20-2cc8316667cc`, champ
  `distinct_brand_count`, outil `count_supplier_brands`.
- QA : suites assistant P1–P5 51/51 ; `qa:back` 323 verts et 11 intégrations conditionnelles
  ignorées ; `qa:front` 156 fichiers et 687/687 tests ; conformité erreurs verte. `pnpm run qa`
  franchit les 687 tests puis reste bloqué uniquement par la couverture dashboard préexistante
  (13,33 % de branches pour un seuil de 30 %).
- Livraison : commit fonctionnel `3e0c899` poussé sur `main`. Edge Function `api` v122 `ACTIVE`,
  `verify_jwt=false`, entrypoint `supabase/functions/api/index.ts`, import map `deno.json`.
  `ai.assistant.status` et `ai.assistant.ask` répondent 401 sans session, jamais 404 ; leurs
  preflights depuis `http://localhost:3000` répondent 200. Aucune migration P5.
- Réserves : campagnes modèles P6, performance/Realtime P7, clôture globale P8 et couverture
  dashboard restent hors P5.

---

## Phase 5B — Contexte universel : préalables de la campagne P6

### Objectif

Rendre le fallback SQL auto-descriptif, cherchable et typé avant de mesurer les modèles.
Conception détaillée, audit DB/code et justifications : `architecture-contexte-universel.md`.
La campagne P6 mesure coût, tours et exactitude par modèle : elle doit s'exécuter sur
l'économie cible (catalogue cherchable, vues typées), pas sur le dump actuel de 27–49K tokens,
sinon la sélection du modèle est invalidée par les phases suivantes.

### Constats d'audit fondateurs (2026-07-14, Supabase MCP + code)

- 5 commentaires `pg_description` dans tout le schéma `public` : `describe_database_tables`
  lit déjà `obj_description`/`col_description` mais ne trouve rien à remonter.
- Les conditions d'achat (`remise_ha`, `coef_retro`, `coef_ha`, `coef_majvte`, `borne_acha`)
  vivent dans `pricing_segment_purchase_grids` (89 278 lignes), jointes aux segments par
  `(segment_id, snapshot_id)` ; toutes les colonnes financières sont `text` (échantillon de
  2 000 valeurs : 100 % numériques à point décimal, artefacts float Excel type
  `69.400000000000006`). Un `ORDER BY` généré sur la valeur brute trie alphabétiquement.
- `pg_trgm` est installé ; `unaccent`, `vector` et `pgroonga` sont disponibles mais non
  installés et ne doivent pas l'être sans besoin mesuré.
- `get_database_catalog` renvoie l'intégralité des 44 tables `public` à chaque question
  imprévue (27–49K tokens d'entrée mesurés en baseline P0).

### Travaux

E1 — Schéma auto-descriptif :

- [x] Migration `COMMENT ON` couvrant les tables utiles à l'assistant (~12 tables, colonnes
  clés en priorité) : type réel, format, pièges (casse, jointures, snapshot), rédigés en
  français, sans secret ni donnée métier, relus comme du code.
- [x] Fonction `private.ai_to_numeric(text)` (immutable, strict) pour les casts financiers.

E2 — Projections typées :

- [x] Vues `ai_v_purchase_terms_active` et `ai_v_segments_active` (snapshot actif
  pré-filtré, casts numériques faits, jointures pré-écrites), plus variantes non filtrées
  exposant `snapshot_id` pour les questions historiques (règle `VERSIONED_TABLES` conservée).
- [x] `security_invoker = on` sur chaque vue, prouvé par un test d'intégration RLS à deux
  identités.
- [x] Étendre `loadDatabaseCatalog` aux vues `ai_v_%` (le filtre actuel `BASE TABLE` les
  exclut) et documenter la préférence vue > table brute dans les commentaires.

E3 — Catalogue cherchable :

- [x] Outil `search_schema(terms)` : classement `pg_trgm` (`similarity()`) sur noms de
  tables/colonnes et texte des commentaires, retour des N meilleures colonnes groupées par
  table avec types, descriptions et clés étrangères, sortie Zod stricte et plafond d'octets.
- [x] Rétrograder `get_database_catalog` : le prompt oriente vers `search_schema` d'abord ;
  `describe_database_tables` inchangé pour le zoom.
- [x] Mesurer les tokens d'entrée p95 du fallback avant/après sur les cas P0 rejoués.

#### Mesure contexte fallback P5B — 2026-07-14

La baseline provider P0 reste celle réellement observée avant P5B : **27–49K tokens**
d'entrée lorsque `get_database_catalog` dumpait le schéma complet. L'Edge Function P5B
n'étant volontairement pas déployée, la mesure après est une mesure locale reproductible du
payload `search_schema` sur les cinq formulations P0 : top 20 colonnes, mêmes commentaires et
même classement `pg_trgm` que le code livré. Les tailles UTF-8 sont converties avec une borne
conservatrice de 3 octets par token ; ce n'est pas une mesure facturée du provider.

| Cas P0 rejoué | Octets UTF-8 | Estimation conservatrice tokens |
| --- | ---: | ---: |
| P0-1 familles produit FEST/CAT_FAB | 6 239 | 2 080 |
| P0-2 marques/variateurs/drives | 6 205 | 2 069 |
| P0-3 ROCK/CAT_FAB | 6 171 | 2 057 |
| P0-4 marques distinctes | 5 652 | 1 884 |
| P0-5 changements/dernier tarif | 5 698 | 1 900 |
| **p95 (5 cas)** | **6 239** | **2 080** |

Le seuil de checkpoint `< 8 000` est respecté avec une marge de 74 %. Une mesure provider
facturée pourra confirmer ce chiffre après autorisation explicite de déployer l'API, mais
n'est pas requise pour exposer l'écart structurel avec la baseline 27–49K.

Hors périmètre P5B (décisions actées dans `architecture-contexte-universel.md` §4) : aucune
installation d'extension (`vector`, `unaccent`, `pgroonga`), aucune modification de la couche
déterministe P1/P2, pas de SSE. E4 (régime double modèle) est arbitré par la campagne P6 ;
E5 (intention annoncée, provenance) est couvert par P5 ; E6 (boucle de promotion) est
documenté en P8.

### Checkpoint vérifiable P5B

Le checkpoint est validé si :

- les nouveaux cas offline passent : « top 3 CAT_FAB de FEST par remise d'achat » (jointure
  grilles + cast + tri numérique correct) et « où sont stockées les remises ? »
  (`search_schema` retourne la bonne table dans le top 3) ;
- un test d'intégration prouve qu'aucune vue `ai_v_*` ne contourne les RLS ;
- les tokens d'entrée p95 du fallback sont inférieurs à 8 000 sur les cas P0 rejoués
  (baseline 27–49K) ;
- un tri généré sur une colonne financière `text` brute est refusé ou réorienté vers la vue ;
- les validations P4 (catalogue, snapshot, fingerprint, réparation unique) restent vertes
  avec les vues incluses au catalogue.

### Suivi P5B

| Date | Statut | Exécuté par | Preuve/commande | Résultat | Écart ou blocage |
| --- | --- | --- | --- | --- | --- |
| 2026-07-14 | VALIDÉE ET DÉPLOYÉE | Codex | Migration `20260714102852`; tests Deno ciblés (36/36); intégration DB (3/3); `pnpm run qa:back`; Supabase MCP; probes HTTP | 110 commentaires; 4 vues `security_invoker`; recherche remises top 3 correcte; top FEST trié en `numeric`; p95 conservateur 2 080 tokens; Edge Function `api` v127 `ACTIVE`; CORS 200 et route authentifiée 401 sans jeton | Aucun blocage P5B; déploiement autorisé explicitement le 2026-07-14 |

---

## Phase 6 — Évaluations et sélection du modèle

### Objectif

Choisir le modèle sur le coût par réponse correcte après stabilisation de l'architecture, et non
sur le prix par token ou le seul taux de tool calling.

### Travaux

- [x] Vérifier le checkpoint P5B avant la campagne 10/20 : l'économie de tokens et la
  surface SQL changent toutes les mesures de coût, tours et exactitude.
- [x] Étendre la suite offline avec les incidents I-01 à I-07.
- [x] Ajouter casse, accents, `%`, `_`, résultat vide, colonne inexistante, prompt injection,
  question hors périmètre et changement de snapshot.
- [x] Ajouter les cas P5B : « top 3 CAT_FAB de FEST par remise d'achat », « écarts de remise
  supérieurs à 20 % par rapport au snapshot précédent » (`aggregate_diffs`,
  `measure=remise`, `direction=baisse`), « où sont stockées les remises ? »
  (`search_schema`) et tri généré sur colonne financière `text` brute (refus attendu).
- [x] Tester l'isolation sur deux agences et deux identités distinctes.
- [x] Clore la campagne sur les seuls candidats retenus par décision utilisateur : DeepSeek V4
  Flash et DeepSeek V4 Pro. Claude est exclu pour coût excessif ; GPT-OSS est refusé ; Mistral et
  GLM restent uniquement dans l'historique comparatif.
- [x] Exécuter vingt répétitions de l'agrégat critique Flash. Le lot Pro a été arrêté à 13/70 en
  raison de latences très élevées ; cette dérogation est acceptée explicitement pour clôturer P6
  et reste visible dans le rapport.
- [x] Conserver uniquement le mode standard ; Exacto est exclu de la sélection finale.
- [x] Enregistrer modèle demandé, modèle servi, provider, tours, finish reasons, tokens, coût,
  latence p50/p95, exactitude, tentatives d'outils et exécutions effectives.
- [x] Sélectionner le modèle **par régime** : décider le routage intention → modèle (léger ou
  aucun sur les chemins
  déterministes/bornés, candidat renforcé sur le fallback SQL si la campagne le justifie),
  avec pré-vol des endpoints, `require_parameters`, un plafond `max_price`, fallback normal
  autorisé et endpoint épinglé pendant les mesures comparatives. Aucun filtre ZDR ou de collecte
  n'est appliqué par le runtime P6.

### Seuils bloquants

- 100 % des agrégats critiques exacts ;
- 100 % des réponses sur le snapshot attendu ;
- zéro fuite inter-agence ;
- zéro outil non autorisé **exécuté** ; une tentative bloquée puis récupérée est tracée mais ne
  disqualifie pas le modèle ;
- zéro colonne inventée exécutée ;
- zéro chiffre non prouvé ;
- zéro recherche exhaustive faussée par la casse ;
- 100 % de réussite du suivi « et ROCK ? » ;
- zéro contournement de boucle par requête équivalente ;
- zéro appel provider sur les chemins déterministes ;
- coût cumulé projeté de campagne inférieur ou égal à 20 USD ; au-delà, suspension et demande
  d'autorisation. Les tours, tokens, latences et réparations restent des métriques de sélection,
  pas des plafonds arbitraires bloquants ; les limites techniques anti-boucle ne remplacent pas
  l'évaluation du modèle.

### Checkpoint vérifiable P6

Le checkpoint est validé lorsque le rapport versionné contient toutes les métriques par modèle,
provider épinglé et régime, qu'un candidat passe tous les seuils de sécurité et d'exactitude par
régime, et que la politique provider effective confirme le pré-vol d'au moins un endpoint avec
tools, `require_parameters`, le plafond `max_price` et l'identité modèle/provider réellement servis.

Commande live conditionnelle :

```powershell
$env:RUN_API_INTEGRATION='1'
$env:RUN_AI_LIVE_EVALS='1'
deno test --env-file=backend/.env --allow-env --allow-net --config backend/deno.json `
  backend/functions/api/integration/assistantLiveEvaluations_integration_test.ts
```

### Suivi P6

| Date | Statut | Exécuté par | Modèles/providers | Répétitions | Résultat | Rapport |
| --- | --- | --- | --- | ---: | --- | --- |
| 2026-07-14 | EN COURS | Codex | Mistral/DeepInfra ; GPT-OSS/SambaNova ; DeepSeek Flash/Novita | 1 smoke provider/candidat + 1 smoke déterministe corrigé | Le défaut amont P3-bis est corrigé et vérifié live ; les anciens échecs ne classent pas les modèles ; campagne 10/20 et sélection encore à faire | `rapport-evaluation-modeles-p6.md` |
| 2026-07-14 | EN COURS | Codex | Mistral, GPT-OSS, DeepSeek Flash/Pro, GLM 5.2, Claude Sonnet 4.6 | 1 smoke P5B par candidat + 1 second smoke Mistral | Aucun candidat ne franchit les smoke tests provider appropriés : exactitude, boucle, tours ou disponibilité bloquants ; matrice 10/20 suspendue avant dépense inutile ; Mistral restauré | `rapport-evaluation-modeles-p6.md` |
| 2026-07-14 | EN COURS | Codex | Runtime commun, aucun appel provider supplémentaire | 84 tests IA + 3 intégrations DB réelles | Correctif local de preuve, routage borné FEST et terminaison en deux tours ; deux identités/deux agences validées ; `qa:back` 351/351 ; déploiement et reprise live en attente d'autorisation | `rapport-evaluation-modeles-p6.md` |
| 2026-07-14 | HISTORIQUE INVALIDÉ | Codex | Mistral/DeepInfra ; GPT-OSS/WandB+Groq ; DeepSeek Pro+GLM/Novita ; Flash et Claude refusés | Smokes P5B + balayages transversaux de l'ancien harnais | Coût 0,05662744 USD conservé au cumul ; verdict modèle annulé car providers mélangés, pool artificiellement filtré et tentatives bloquées comptées comme exécutions | `rapport-evaluation-modeles-p6.md` |
| 2026-07-14 | EN COURS | Codex | Six candidats ; pré-vol OpenRouter par endpoint | 93 tests IA/contrats ciblés, 3 intégrations DB, gate backend 356/356 | Ancien verdict invalidé : fallbacks et filtres arbitraires retirés, tentatives bloquées distinguées des exécutions, récupération guidée, seuil de remise borné, prompts enrichis ; chaque candidat possède au moins un endpoint tools sous `max_price` | `rapport-evaluation-modeles-p6.md` |
| 2026-07-14 | VALIDÉE AVEC RÉSERVE | Codex + décision utilisateur | DeepSeek V4 Flash : DeepInfra/GMICloud ; DeepSeek V4 Pro : StreamLake/Baidu | Flash 20/20 ; Pro 13/70 avant arrêt accepté | Flash : 20 réponses exactes, `rank_purchase_terms` seul, 0,00216521 USD, p50 3 856 ms, p95 5 886 ms. Pro : 13 réponses HTTP 200, 0,11942355 USD, p50 22 695 ms, p95 131 807 ms ; balisage d'outil brut observé sur I-04, réserve acceptée. Coût P6 total : 3,99044667 USD | `rapport-evaluation-modeles-p6.md` |

#### Reprise P6 après correctif P3-bis — 2026-07-14

- Les trois identifiants OpenRouter ont été vérifiés et testés sans substitution silencieuse.
- Cette politique provider historique est retirée : elle vidait artificiellement certains pools
  et confondait faisabilité de routage et qualité du modèle. Le pré-vol et l'épinglage par endpoint
  deviennent la preuve de campagne ; le runtime normal autorise les fallbacks sous `max_price`.
- `api` v125 persiste modèle servi, provider et finish reasons jusque sur les erreurs et porte le
  correctif de clarification conversationnelle.
- Le scénario « question ambiguë → `cat_fab` » reprend désormais les termes initiaux et exécute
  `search_supplier_categories` sans provider : 8 marques exactes, 359 segments, coût nul.
- L'extraction n'utilise aucun dictionnaire métier fermé : le smoke live `raccords` retourne 6
  marques et 33 segments avec le même chemin déterministe et un coût nul.
- Les contrôles Mistral, GPT-OSS, DeepSeek et Qwen antérieurs sur ce cas ne sont plus considérés
  comme une comparaison valide des modèles : ils exposaient tous le même défaut de routage amont.
- P6 repasse en cours ; les smoke tests provider doivent être rejoués sur des cas appropriés avant
  la campagne 10/20. P7 reste non autorisée jusqu'au checkpoint P6 validé.
- Le modèle initial Mistral Small 3.2 a été restauré ; aucune migration n'a été créée.

---

## Phase 7 — Performance, Realtime et qualité UX

### Objectif

Réduire les latences à leur cause, éviter les connexions Realtime inutiles et rendre le diagnostic
lisible sans ajouter prématurément le streaming SSE.

### Travaux

- [ ] Mesurer séparément résolution d'intention, DB, provider, nombre de tours et rendu frontend.
- [ ] Calculer p50/p95 sur un échantillon suffisant après réduction des tours provider.
- [ ] Conserver le transport non-streaming si le p95 reste acceptable.
- [ ] Ne proposer SSE que si le p95 mesuré reste durablement supérieur au seuil 10–15 secondes et
  si le temps provider domine réellement.
- [ ] Vérifier qu'aucun canal `interactions` n'est ouvert sur `/remises/referentiels`.
- [ ] Vérifier arrêt des reconnexions infinies, fallback polling borné et nettoyage au changement
  de route.
- [ ] Profiler l'ouverture du Dialog, le rendu des sources et l'expansion du diagnostic.
- [ ] Corriger uniquement les handlers longs et reflows forcés reproductibles.

### Checkpoint vérifiable P7

Le checkpoint est validé si un rapport donne p50/p95 et leur décomposition, si la décision SSE est
justifiée par ces chiffres, si le parcours référentiels n'ouvre aucun canal Realtime hors périmètre
et si aucun handler critique reproductible ne dépasse le budget UX retenu sans explication.

Le parcours UI réel doit être vérifié dans le navigateur Codex. Playwright est réservé aux scénarios
reproductibles confirmés ou à une demande explicite.

### Suivi P7

| Date | Statut | Exécuté par | p50 | p95 | Décision SSE | Preuve Realtime/UI |
| --- | --- | --- | ---: | ---: | --- | --- |
| — | À FAIRE | — | — | — | — | — |

---

## Phase 8 — QA finale, documentation et livraison

### Objectif

Livrer un ensemble vérifié de bout en bout sans masquer les échecs d'un chantier concurrent et
sans déployer avant autorisation.

### Travaux

- [ ] Exécuter les tests ciblés après chaque phase.
- [ ] Exécuter `pnpm run qa:back` puis `pnpm run qa:front`.
- [ ] Exécuter `pnpm run qa:fast` après stabilisation des contrats transverses.
- [ ] Rejouer la suite offline, la probe concurrence DB et la campagne live.
- [ ] Exécuter `pnpm run qa` complet jusqu'au vert.
- [ ] Documenter séparément tout blocage provenant du chantier dashboard ; ne pas modifier ce
  chantier uniquement pour contourner la gate.
- [ ] Vérifier rate limit, admission atomique, idempotence, purge, rétention, clés et alertes budget.
- [ ] Documenter dans le runbook la boucle de promotion continue (E6) : requête d'analyse sur
  `ai_usage_events` listant les questions servies par `general_sql`, et rituel périodique de
  promotion des motifs récurrents en outils métier stricts.
- [ ] Mettre à jour le runbook, IA-7, la Phase 6 et les faits d'architecture destinés à la Phase 7.
- [ ] Mettre à jour le tableau global de ce document et tous les suivis de phase.
- [ ] Préparer la procédure de déploiement sans l'exécuter.

### Checkpoint vérifiable P8

Le checkpoint est validé si :

- `pnpm run qa` est vert ;
- les probes sécurité et DB conditionnelles sont vertes ;
- la campagne du modèle retenu respecte tous les seuils ;
- le diff ne contient ni clé, ni donnée persistée excessive, ni mock applicatif, ni contrat lâche ;
- les documents et changelogs correspondent au code réel ;
- le statut reste « prêt à déployer » tant que l'utilisateur n'a pas explicitement demandé le
  déploiement.

### Déploiement conditionnel

Uniquement après demande explicite :

1. utiliser la source `backend/functions/api/` ;
2. vérifier le wrapper `supabase/functions/api/index.ts` ;
3. utiliser l'import map `deno.json` racine ;
4. conserver `verify_jwt=false` ;
5. déployer l'Edge Function `api` ;
6. vérifier via Supabase MCP la version et l'entrypoint ;
7. prober `ai.assistant.status`, `ai.assistant.ask`, auth, quota et CORS ;
8. rejouer FESTO, ROCK, nombre de marques et changements depuis l'UI réelle.

### Suivi P8

| Date | Statut | Exécuté par | Gate/probe | Résultat | Déploiement | Écart ou blocage |
| --- | --- | --- | --- | --- | --- | --- |
| — | À FAIRE | — | — | — | NON DEMANDÉ | — |

---

## 5. Ordre d'exécution obligatoire

```text
P0 baseline et régressions
  → P1 outils métier
  → P2 routage
  → P3 contexte conversationnel
  → P4 fallback SQL
  → P5 preuves et erreurs
  → P5B contexte universel (préalables campagne)
  → P6 campagne modèles
  → P7 performance et UX
  → P8 QA et livraison
```

Une phase bloquée empêche de déclarer les phases suivantes validées. Des travaux préparatoires
peuvent être menés en parallèle, mais les checkpoints restent séquentiels.

## 6. Journal transversal

| Date       | Phase              | Décision ou événement                                                                                                                                                                                                                 | Preuve                                                                                                                                                                                      | Impact sur la suite                                                                                                                   |
| ------------| --------------------| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ---------------------------------------------------------------------------------------------------------------------------------------|
| 2026-07-13 | Initialisation     | Plan correctif créé ; aucun code ni déploiement effectué                                                                                                                                                                              | Ce document                                                                                                                                                                                 | Commencer par P0                                                                                                                      |
| 2026-07-13 | P0                 | Snapshot/vérités DB figés ; sept régressions rouges ; cinq conversations reproduites sur `api` v118                                                                                                                                   | Supabase MCP, tests Deno ciblés, runner live conditionnel                                                                                                                                   | P0 validée ; P1 uniquement est autorisée                                                                                              |
| 2026-07-13 | P1                 | Couche sémantique déterministe livrée localement pour CAT_FAB, recherche de marques, comptage de marques et vérification directe de marque                                                                                            | 14 tests P1/contrats verts, MCP snapshot P0, lint/check verts; `qa:back` 298 verts/5 rouges futurs                                                                                          | P1 validée sans provider ni SQL généré; P2 uniquement est autorisée                                                                   |
| 2026-07-13 | P1                 | Déploiement explicitement autorisé; aucune migration P1 absente du distant                                                                                                                                                            | Supabase CLI + MCP : `api` v119 ACTIVE; routes 401 sans session; CORS OPTIONS 200                                                                                                           | Correctif P1 actif sur le backend lié; P2 reste la seule phase suivante autorisée                                                     |
| 2026-07-13 | P1 corrective      | VFD littéral et accents préservés avant P2 ; aucune migration ni extension                                                                                                                                                            | 9 tests sémantiques verts ; MCP snapshot P0 : 3/11/348 et 9/2                                                                                                                               | Précondition fermée ; P2 autorisée                                                                                                    |
| 2026-07-13 | P2                 | Parseur typé et politique centrale intention → outils ; clarifications et fallback bornés                                                                                                                                             | Matrice 20 cas, 3 tests P2, suite consolidée 31 verts/5 rouges futurs ; `qa:back` 303 verts/5 rouges/11 ignorés                                                                             | P2 validée ; P3 uniquement est autorisée                                                                                              |
| 2026-07-13 | P3                 | Contexte conversationnel compact, strict et transitoire ; héritage déterministe des relances courtes                                                                                                                                  | 5 tests contexte, tests frontend, suite ciblée 37 verts/4 rouges futurs ; `qa:back` 309 verts/4 rouges/11 ignorés                                                                           | P3 validée sans migration ni persistance ; P4 uniquement est autorisée                                                                |
| 2026-07-14 | P5B                | Insertion du chantier contexte universel (E1 commentaires `COMMENT ON`, E2 vues typées `ai_v_*`, E3 catalogue cherchable `search_schema`) comme préalable de la campagne P6 ; E4 arbitré en P6, E5 couvert par P5, E6 documenté en P8 | `architecture-contexte-universel.md` (audit DB/code du 2026-07-14 : 5 commentaires `pg_description`, grilles d'achat `text`, `pg_trgm` installé)                                            | La campagne 10/20 de P6 attend le checkpoint P5B ; P6 reste EN COURS ; aucun code ni migration livré à ce stade                       |
| 2026-07-14 | P5B                | E1/E2/E3 exécutés : dictionnaire DB, casts et vues typées, recherche de schéma prioritaire, garde-fou de tri brut                                                                                                                     | Migration distante `20260714102852`; MCP : 4 vues invoker, 110 commentaires, top 3 remises; 36 tests offline + 3 DB; `qa:back`; Edge Function `api` v127 `ACTIVE`; probes CORS/auth 200/401 | Checkpoint P5B validé et déployé après autorisation explicite; P6 peut reprendre                                                      |
| 2026-07-14 | P6                 | Six candidats configurés et smoke tests P5B rejoués après remplacement autorisé de la clé OpenRouter                                                                                                                                  | MCP `api` v127; Mistral/DeepSeek Pro/GLM exécutent `search_schema` mais ne produisent pas de réponse exacte; GPT-OSS boucle; DeepSeek Flash et Claude retournent 429                        | Aucun candidat admissible; campagne 10/20 suspendue; aucune sélection; P7 reste interdite                                             |
| 2026-07-14 | P6 corrective      | Preuve universelle sourcée, routage borné `rank_purchase_terms` et conclusion après outil unique réussi                                                                                                                               | 84/84 tests IA; 3/3 intégrations DB sur deux identités/deux agences; `qa:back` 351 verts; MCP 673 CAT_FAB FEST                                                                              | Correctif prêt localement mais absent de `api` v127; nouveau déploiement requis avant smoke et campagne 10/20                         |
| 2026-07-14 | P6 historique      | Correctif v129, smokes de six modèles et restauration de la configuration                                                                                                                                                             | `api` code v129 / révision v131 ACTIVE; providers mélangés; coût 0,05662744 USD; `qa:back` 352 verts; auth/CORS 401/200                                                                     | Verdict modèle invalidé par la correction v6.1; coût conservé; aucune sélection ni activation                                         |
| 2026-07-14 | P6 corrective v6.1 | Pré-vol endpoint, politique sans filtres arbitraires, récupération guidée et distinction tentative/exécution ; seuil de remise promu                                                                                                  | Six modèles avec endpoint tools sous `max_price`; 93 tests IA/contrats ciblés; 3/3 intégrations DB; `qa:back` 356/356                                                                       | Correctif prêt à déployer; smokes puis campagne 10/20 à exécuter; P7 reste interdite                                                  |
| 2026-07-14 | P6 clôture         | Sélection finale OpenRouter en mode standard : aucun provider sur les chemins déterministes, DeepSeek V4 Flash sur le courant/borné et DeepSeek V4 Pro sur le fallback SQL complexe                                                   | Flash 20/20 exact via DeepInfra/GMICloud ; Pro 13/70 via StreamLake/Baidu avant arrêt accepté ; coût P6 3,99044667 USD ; configuration et quotas restaurés                                  | P6 validée avec réserve par décision utilisateur ; sélection en attente d'activation ; P7 reste interdite sans autorisation explicite |
| 2026-07-15 | E4 local           | Routage mode → modèle implémenté dans le broker, résolution exacte Flash/Pro, statut conditionné aux deux modèles et traçage du régime                                                                                                 | 37 tests ciblés, 4 intégrations DB, `qa:back` 360/360, `qa:docs` et diff-check verts ; gate complet arrêté après 692 tests frontend verts sur le seuil dashboard préexistant 13,33/30 %      | Implémentation locale validée ; aucun déploiement/configuration distante ; P7 reste interdite sans autorisation explicite               |
| 2026-07-15 | E4 runtime         | Routage E4 déployé dans `api` v138 ; aucune migration ni mutation de modèle/quota                                                                                                                                                      | MCP v138 ACTIVE ; auth 401, CORS 200, statut Flash 200 ; Flash 200 via DeepInfra ; deux smokes Pro 502 ; probe sans plafond 200 via StreamLake                                               | Flash opérationnel ; Pro bloqué par politique de données OpenRouter + plafond 0,435/0,87 ; décision de configuration requise ; P7 reste interdite |

## 7. État de livraison

| Élément                                     | État                                          |
| ---------------------------------------------| -----------------------------------------------|
| Plan correctif documenté                    | OUI                                           |
| Corrections entièrement validées            | OUI pour P0–P6, avec réserve Pro documentée   |
| Campagne comparative terminée               | OUI par décision utilisateur                  |
| `pnpm run qa` complet vert pour le worktree | NON — seuil dashboard préexistant 13,33/30 % |
| Documentation finale synchronisée           | OUI pour P6                                   |
| Prêt à déployer                             | DÉPLOYÉ — `api` v138 ACTIVE                   |
| Déploiement demandé                         | OUI — autorisé explicitement le 2026-07-15    |
| Edge Function corrective déployée           | OUI — v138 ; acceptation Pro encore bloquée   |
