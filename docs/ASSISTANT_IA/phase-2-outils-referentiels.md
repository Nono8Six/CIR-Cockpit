# Phase 2 — Outils référentiels complets + agrégats métier

> Prérequis : Phase 1 terminée (lire son changelog). Lire `00-plan-general.md`.
> Périmètre : backend + shared. Gate QA : `pnpm run qa:back`.
> Objectif : que l'assistant réponde **exactement** aux questions cibles du PO, en
> particulier « quelles familles / segments ont augmenté ou baissé par rapport au dernier
> fichier tarif ». Cela exige un nouvel agrégat SQL et un registre d'outils complet.

## 1. Le manque à combler

Le résumé de diff existant (`getPricingReferenceDiffSummary`) agrège par **type de diff**,
**type d'objet** et **colonne modifiée**, mais **pas par dimension métier explicite
(famille CIR, catégorie fabricant, segment, marque) avec la direction du changement**
(hausse vs baisse d'un prix ou d'une remise).

Or les questions cibles sont précisément dimensionnelles et directionnelles :

- « familles chez ROCKWELL qui ont **augmenté** » → GROUP BY dimension famille choisie,
  filtre marque/alias ROCKWELL, direction=hausse ;
- « familles dont les **remises ont baissé** » → GROUP BY dimension famille choisie,
  mesure=remise, direction=baisse.

Sans cet agrégat, le LLM devrait paginer `list_diffs` sur potentiellement des milliers de
lignes et agréger lui-même : coûteux en tokens, lent, et non fiable. Phase 2 crée l'agrégat
côté SQL/service et l'expose comme outil.

## 2. Spécification détaillée

### 2.1 Comprendre la structure réelle des diffs (à faire en premier)

Avant de coder l'agrégat, **inspecter le `payload` jsonb réel** de `pricing_reference_diffs`
via Supabase MCP (`execute_sql` en lecture, projet lié) et le code qui l'écrit dans
`referenceDiffs.ts`. Identifier précisément :

- où vivent la marque, la famille/segment, le code produit dans `object_key` / `payload` ;
- comment est encodée une valeur avant/après (prix, taux de remise) pour déterminer la direction ;
- quels `diff_type` / `object_type` correspondent à une évolution tarifaire (vs ajout/suppression).
- quelles colonnes financières contiennent du bruit d'arrondi (`1.1000000000000001` vs `1.1`,
  deltas quasi nuls, précision décimale variable) ;
- quelle différence métier existe entre `FAM/FAM_LIB` (famille CIR), `CAT_FAB` (catégorie/famille
  fabricant), `SEGMENT` et `MARQUE` ;
- quels alias de marque sont nécessaires pour les questions PO (`ROCKWELL` peut être stocké sous
  un code court comme `ROCK`).

Consigner ces faits dans le changelog : ils conditionnent la justesse de l'agrégat. Ne pas
supposer la structure d'après ce document — la vérifier.

### 2.2 Service d'agrégation (`referenceDiffs.ts` ou nouveau `referenceDiffAggregates.ts`)

```ts
export const aggregatePricingReferenceDiffs = async (
  db: DbClient,
  authContext: AuthContext,
  input: PricingReferenceDiffAggregateInput,
): Promise<PricingReferenceDiffAggregateResponse>
```

`input` (schéma Zod `.strict()` dans `shared/schemas/pricing/references.schema.ts`, à côté des
autres schémas diff) :

- sélecteur de run : `run_id?` OU `target_snapshot_id?` (+ `base_snapshot_id?`), même règle
  que `pricingReferenceDiffRunSelectorSchema` existant (réutiliser/composer, ne pas dupliquer) ;
- `group_by` : `z.enum(['famille_cir','categorie_fabricant','segment','marque','object_type','changed_column'])`.
  Ne pas utiliser le nom vague `famille` dans le contrat public sans le mapper explicitement :
  `famille_cir` = `FAM/FAM_LIB` via classification/liaison si disponible ;
  `categorie_fabricant` = `CAT_FAB` issu des grilles/segments fabricant.
- `measure` : `z.enum(['prix','remise','any'])` (défaut `any`) ;
- `direction` : `z.enum(['hausse','baisse','any'])` (défaut `any`) ;
- filtres optionnels : `marques[]`, `severities[]`, `diff_types[]` (réutiliser les enums existants) ;
- `include_neutral` : boolean défaut `false` pour exclure les deltas neutralisés par tolérance ;
- `limit` : int 1..100 (défaut 50).

`response` (étend `apiSuccessSchema`) :

- `groups` : tableau de `{ key, label, total, hausse_count, baisse_count, added_count,
  removed_count, avg_delta_pct (nullable), max_delta_pct (nullable), sample_object_keys[] (max 5) }` ;
- `group_by`, `measure`, `direction` (écho) ;
- `truncated` : boolean si plus de `limit` groupes existent ;
- `run_id`, `base_snapshot_id`, `target_snapshot_id`.

L'implémentation agrège en SQL (Drizzle) sur `pricing_reference_diffs` filtrées par le run
résolu. La direction se déduit du delta extrait du `payload` (selon 2.1), **après normalisation
numérique**. Interdiction de classer une hausse/baisse sur un simple signe flottant non normalisé.
Définir une tolérance par type de mesure/colonne (par exemple via `numeric(18,6)` ou une fonction
de normalisation testée) et exclure les deltas neutres par défaut. Respecter l'isolation
`agency_id` comme les autres services diff. Si la donnée métier demandée (`famille_cir`, par
exemple) n'est pas présente dans le payload, faire le join métier nécessaire ou remonter
proprement le fait (groupe « inconnu » plutôt que crash) ; ne pas remplacer silencieusement par
`CAT_FAB`.

Ajouter une résolution d'alias de marque contrôlée : le filtre utilisateur `ROCKWELL` doit pouvoir
matcher le code réel si la donnée l'encode comme `ROCK`. Cette résolution doit être déterministe
(table/config/code contrôlé), testée, et visible dans le changelog. Ne pas laisser le LLM décider
seul qu'un alias est équivalent.

### 2.3 Procédure tRPC

`data.pricing.references.diffs.aggregate` : `authedProcedure` (réutilisable aussi par l'UI
Changements plus tard). Input/output ci-dessus. Miroir `shared/api/trpc.ts`. Test de contrat
dans `pricingReferenceContracts_test.ts`.

### 2.4 Registre d'outils complet

Compléter `assistantTools.ts` (créé en phase 1) avec les outils manquants :

4. `aggregate_diffs` → wrappe `aggregatePricingReferenceDiffs`. **Outil central** pour les
   questions « quelles familles ont augmenté/baissé ». Description FR très explicite pour que
   le LLM le préfère à `list_diffs` sur les questions dimensionnelles. La description doit citer
   les dimensions exactes (`famille_cir`, `categorie_fabricant`, `segment`, `marque`) pour éviter
   la confusion métier.
5. `get_import_details` → détail d'un import (health report, compteurs par fichier, statut mapping).
6. `get_health_report` → rapport de santé (classification + segments + anomalies) d'un import.
7. `get_anomalies_summary` → wrappe le summary anomalies (facettes sévérité/type/marque +
   `action_label` par type). Base du cas « aide-moi à corriger les anomalies ».
8. `list_anomalies` → wrappe la liste paginée d'anomalies filtrable (sévérité/type/marque),
   résultats plafonnés à 50, avec le total réel.

Tous : validation Zod stricte des arguments **et des sorties**, version de contrat, plafonds
50 lignes + taille sérialisée définis en phase 1, erreur structurée (jamais d'exception nue) si
identifiant manquant. Les résultats métier sont du contenu non fiable pour le prompt, pas des
instructions.

### 2.5 Résolution du contexte de page

Le broker doit, quand la question porte sur « le dernier fichier tarif » sans identifiant
explicite, déduire le run/import cible depuis `page_context` (import_id/run_id/target_snapshot_id).
Si le contexte est vide, un outil de résolution par défaut : utiliser `list_imports` puis
prendre le plus récent `analyse_ok`, à l'image de `getHealthReport` du diagnose. Documenter la
règle de résolution appliquée.

### 2.6 Qualité de réponse

- Enrichir le prompt système `assistant.referentiels` (nouvelle version publiée via le
  mécanisme de versioning des prompts, **sans supprimer** l'ancienne) avec des directives :
  privilégier `aggregate_diffs` pour les questions par dimension métier ; demander une précision
  si l'utilisateur dit « famille » mais que le contexte ne permet pas de choisir entre famille CIR
  et catégorie fabricant ; toujours donner les chiffres exacts (nombre de groupes, delta moyen) ;
  formater les listes de groupes de façon lisible ; proposer une action concrète pour les anomalies.
- Définir un jeu de questions de référence versionné (les 4 questions PO + variantes) avec les
  agrégats/chiffres attendus calculés par les services, les outils attendus et les cas ambigus.
  Ce jeu alimente la suite d'évaluations de la phase 6. Vérifier aussi les réponses en réel avec
  la clé de développement et consigner les résultats dans le changelog.

## 3. Checkpoints à valider

- [x] Structure réelle du `payload` de `pricing_reference_diffs` inspectée et documentée (source de la direction hausse/baisse, champs marque/famille/segment, bruit numérique).
- [x] Contrat de dimensions explicite (`famille_cir`, `categorie_fabricant`, `segment`, `marque`) validé ; aucun `group_by='famille'` ambigu exposé sans mapping.
- [x] Normalisation numérique/tolérance par mesure implémentée et testée ; les deltas neutres ne sortent pas en hausse/baisse par défaut.
- [x] Alias marque déterministes implémentés/testés pour les questions PO (ex. ROCKWELL ↔ code réel si confirmé).
- [x] `aggregatePricingReferenceDiffs` implémenté (GROUP BY dimension + direction normalisée, isolation agency_id, groupe « inconnu » géré).
- [x] Schémas `PricingReferenceDiffAggregate*` `.strict()` FR + procédure réelle `pricing.references.diffs.aggregate` (authed) + miroir `shared/api/trpc.ts` ; le routeur existant ne possède pas de sous-namespace `data.pricing`.
- [x] Outils 4 à 8 branchés, contrats entrée/sortie stricts et versionnés, plafonnés en lignes/octets.
- [x] Règle de résolution du run/import cible depuis `page_context` (ou dernier `analyse_ok`) implémentée et documentée.
- [x] Prompt système Phase 2 publié sur le Supabase lié ; v1/v2 archivées et conservées, v3 durcie publiée après test réel.
- [x] Test de contrat pour `aggregate` dans `pricingReferenceContracts_test.ts`.
- [x] Jeu d'évaluation versionné avec attentes machine-checkables + vérification live des 4 questions PO et variantes explicites.
- [x] `pnpm run qa:back` vert, confirmé par le gate complet `pnpm run qa` du 2026-07-12.

## 4. Prompt d'exécution (à coller dans une conversation neuve)

```
Tu travailles sur le repo CIR Cockpit (C:\GitHub\CIR_Cockpit\CIR-Cockpit). Tâche : implémenter
la Phase 2 du chantier Assistant IA (outils référentiels complets + agrégat par famille).

Avant tout code :
1. Lis AGENTS.md puis invoque le skill cir-cockpit-agent-router.
2. Lis docs/ASSISTANT_IA/00-plan-general.md.
3. Lis docs/ASSISTANT_IA/phase-1-socle-assistant-backend.md ET SON CHANGELOG (ce qui a
   réellement été livré en phase 1, écarts inclus — le code fait foi).
4. Lis docs/ASSISTANT_IA/phase-2-outils-referentiels.md : c'est ta spécification.
5. Invoque les skills cir-cockpit-api-contracts, drizzle-orm, supabase-postgres-best-practices.
6. `git status --short` — ne touche pas aux modifications qui ne sont pas les tiennes.

PREMIÈRE ÉTAPE OBLIGATOIRE (section 2.1) : via le MCP Supabase (execute_sql en lecture sur le
projet lié) et le code de referenceDiffs.ts, inspecte la structure réelle du payload jsonb de
pricing_reference_diffs pour savoir où se trouvent marque/famille/segment, comment est encodée
la direction hausse/baisse d'un prix ou d'une remise, quels deltas sont du bruit d'arrondi, et
quels alias de marque sont nécessaires aux questions PO. Ne code l'agrégat qu'après. Documente
ces faits dans le changelog.

Lis le code réel avant d'éditer :
- backend/functions/api/services/pricing/references/referenceDiffs.ts (résumé, list, résolution snapshot)
- referenceImports.ts, et les services d'anomalies wrappés
- shared/schemas/pricing/references.schema.ts (schémas diff existants à composer, ne pas dupliquer)
- backend/functions/api/services/ai/assistantTools.ts et assistantBroker.ts (livrés en phase 1)
- backend/functions/api/trpc/router.ts + shared/api/trpc.ts (miroir manuel)

Implémente les sections 2.2 à 2.6. Contraintes : Zod .strict() messages FR, isolation agency_id
respectée, dimensions métier non ambiguës, normalisation numérique avant direction, alias marques
déterministes, erreurs via httpError/createAppError, résultats d'outils plafonnés à 50 lignes,
zéro mock/TODO dans le code livré.

Écris le test de contrat de l'agrégat. Lance `pnpm run qa:back` jusqu'au vert. Si une clé
OpenRouter de dev est dispo, vérifie manuellement les 4 questions PO (§1 du plan général) et
note les réponses obtenues dans le changelog ; sinon consigne que la vérif reste à faire.

Quand tout passe : coche les checkpoints, remplis le changelog de la phase 2, mets à jour le
tableau de suivi (§8) de 00-plan-general.md. Ne commit/déploie pas sans demande explicite.
```

## 5. Notes de risque

- Le point dur est la sémantique du `payload` : si la direction hausse/baisse est mal
  extraite, toutes les réponses seront fausses de façon crédible. Les deltas quasi nuls dus
  aux arrondis doivent être neutralisés, sinon l'assistant annoncera des hausses/baisses
  inexistantes.
- Le mot « famille » est métierlement ambigu : ne jamais confondre famille CIR et catégorie
  fabricant sans l'avoir explicitement résolu.
- Les marques peuvent être codées : `ROCKWELL` dans une question utilisateur peut devoir matcher
  un code court réel. La règle d'alias doit être contrôlée, pas inventée par le LLM.
- `aggregate_diffs` doit être clairement décrit pour que le LLM le choisisse au lieu de
  paginer `list_diffs`. Tester ce routage.
- L'agrégat est réutilisable par l'UI « Changements » : garder l'API générique, pas
  spécifique à l'assistant.

## 6. Changelog

<!-- À remplir en fin de phase. -->

### 2026-07-10 — Phase exécutée localement
- **Fait** : contrat `PricingReferenceDiffAggregate*`, service SQL `aggregatePricingReferenceDiffs`, procédure authed `pricing.references.diffs.aggregate`, miroir tRPC, registre complet de huit outils, résolution de contexte, alias marque, normalisation numérique, garde-fou déterministe des familles ambiguës, tests de contrat, suite d'évaluation métier `2.0.0` et prompt Phase 2. Les migrations prompt v2 puis v3 ont été appliquées au Supabase lié ; aucun commit ni déploiement d'Edge Function n'a été effectué.
- **Fichiers créés** : `backend/functions/api/services/pricing/references/referenceDiffAggregates.ts`, `backend/functions/api/services/ai/assistantReferentielsEvaluations.ts`, `backend/migrations/20260710143000_ai_assistant_references_prompt_v2.sql`, `backend/migrations/20260710150000_ai_assistant_references_prompt_v3.sql`.
- **Fichiers modifiés** : `shared/schemas/pricing/references.schema.ts`, `backend/functions/api/services/pricing/references/referenceDiffs.ts`, `backend/functions/api/services/ai/assistantTools.ts`, `backend/functions/api/services/ai/assistantBroker.ts`, `backend/functions/api/services/ai/aiAssistantContracts_test.ts`, `backend/functions/api/trpc/router.ts`, `shared/api/trpc.ts`, `backend/functions/api/trpc/pricingReferenceContracts_test.ts`, ce fichier et `docs/ASSISTANT_IA/00-plan-general.md`.
- **Faits réels du payload (Supabase lié `rbjtrcorlezvocayluok`, lecture seule)** : `payload` contient `changed_columns`, `before`, `after`, `labels`, `source_row_numbers` et, pour les grilles, `identity_note`. Une classification est identifiée par `cir_key`; un segment par `segment_key = segment|idnumerique|marque|cat_fab`; une grille par `segment_key|num_four|priorite|type_grill|dates`. `num_four` est un numéro fournisseur, pas une référence produit unitaire. Les labels de grille exposent `segment`, `segment_key`, `marque` et `cat_fab`, mais pas la famille CIR : `fam/fam_lib` est résolu par le join snapshot `segment_key -> pricing_supplier_segments -> pricing_segment_classification_links -> pricing_classification_cir`. Sur le run récent `450ea0d3-5dd4-4800-ac3a-e93fcb631cfb`, 2 493 diffs de grille sur 2 551 trouvent une famille CIR et 58 vont explicitement au groupe `inconnu`.
- **Direction et bruit numérique vérifiés** : les valeurs financières sont des textes dans `before/after`. `modifie` porte l'évolution; `ajoute`/`supprime` portent la présence, et les anomalies utilisent `anomalie_apparue`/`anomalie_disparue`. La direction est calculée après conversion et arrondi `numeric(18,6)`. Sur le run observé, 2 289 `coef_retro`, 80 `coef_majvte` et 259 `remise_ha` sont neutralisés comme bruit (ex. `1.1200000000000001 -> 1.12`, `67.099999999999994 -> 67.1`). Restent une vraie hausse `coef_retro` de `1.05` à `1.07` et deux vraies baisses `remise_ha`, `72 -> 69` et `72 -> 70`. `remise` correspond à `remise_ha`; `prix` couvre les paramètres numériques de prix de grille `borne_acha`, `coef_retro`, `coef_ha`, `coef_majvte`. `tarif_fab` vaut actuellement `0/1` et n'est pas traité comme un prix.
- **Dimensions et alias** : `famille_cir` = code `FAM` + libellé `FAM_LIB`; `categorie_fabricant` = `CAT_FAB` + `CAT_FAB_L`; `segment` et `marque` restent leurs codes source. La base réelle contient `ROCK` (66 diffs sur l'inventaire inspecté) et pas `ROCKWELL`; l'alias déterministe et testé est donc `ROCKWELL -> ROCK` (`ROCK` reste idempotent). Le dernier run ne contient aucune hausse de prix significative ROCK/ROCKWELL après neutralisation.
- **Sémantique de l'agrégat** : `total`, `hausse_count`, `baisse_count`, `added_count` et `removed_count` comptent des diffs distincts par groupe, même si plusieurs colonnes ont changé. `avg_delta_pct` moyenne les événements numériques significatifs; `max_delta_pct` conserve le delta signé de plus grande amplitude absolue. Les groupes sont triés par volume puis clé, plafonnés avec `limit + 1` pour calculer `truncated`, et fournissent au plus cinq `sample_object_keys`.
- **Isolation et résolution** : les tables de référentiels et diffs sont un référentiel CIR partagé sans colonne `agency_id`; leurs politiques RLS de lecture sont globales pour les utilisateurs authentifiés. L'agrégat n'accepte donc aucun sélecteur d'agence, contrôle la cohérence de l'agence active du `AuthContext`, et l'audit/réservation IA reste porté par `agency_id`. Priorité de résolution des outils : arguments explicites, puis `page_context` (`run_id`, snapshot, import), puis imports `analyse_ok`. Pour les outils de diff, si le plus récent n'a pas de run, le premier import `analyse_ok` récent possédant un run calculé est choisi; les outils import/santé restent sur le dernier `analyse_ok`.
- **Outils et plafonds** : ajout de `aggregate_diffs`, `get_import_details`, `get_health_report`, `get_anomalies_summary`, `list_anomalies`; entrées/sorties Zod strictes, contrat `1.0`, maximum 50 éléments et 32 768 octets. Probe réel : détails import 26 031 octets, santé 23 720, résumé anomalies 4 501; `list_anomalies` a conservé le total réel et réduit 50 lignes demandées à 43 pour tenir dans 32 768 octets.
- **Jeu d'évaluation et vérification live** : `assistantReferentielsEvaluations.ts` calcule les attentes via les services réels. Modèle réellement servi : `mistralai/mistral-small-3.2-24b-instruct-2506`. Les deux questions PO contenant seulement « familles » renvoient désormais la clarification `famille CIR` ou `catégorie fabricant` sans outil, token ni coût. Variante ROCKWELL `categorie_fabricant/prix/hausse` : 0 groupe, `aggregate_diffs`, 5,294 s, 0,00075925 USD. Variante `famille_cir/remise/baisse` : groupe `99 — DIVERS`, 2 baisses, moyenne `-3.472223 %`, maximum `-4.166667 %`, 4,210 s, 0,00077147 USD. Résumé général : 2 553 diffs via `get_diff_summary`, 6,238 s, 0,00081018 USD. Aide anomalies Segment : 502 anomalies ciblées via `get_anomalies_summary`, actions concrètes correctes, 5,364 s, 0,00082045 USD.
- **Décisions prises en cours de route** : le prompt v2 a été publié puis le test réel a démontré que Mistral ignorait deux fois la demande de clarification et qualifiait les clés de grille de codes produit. La v3 rend ces règles prioritaires et a été publiée sans supprimer v1/v2. Un garde-fou déterministe `getAmbiguousFamilyClarification` a été placé avant quota/provider : la règle métier ne dépend plus du comportement probabiliste du modèle et ne facture pas une question qui doit seulement être clarifiée.
- **Écarts vs spécification (et pourquoi)** : la procédure est exposée sous `pricing.references.diffs.aggregate`, à côté de `summary/list/compute`, car le routeur réel n'a pas de namespace `data.pricing`; créer un second arbre aurait dupliqué le contrat public. Aucun autre écart fonctionnel restant sur les quatre questions PO.
- **Points ouverts / à surveiller pour les phases suivantes** : ne pas déployer l'Edge Function tant que le chantier CRM concurrent présent dans le même worktree ne passe pas sa gate, afin de ne pas publier des modifications hors Phase 2. La nouvelle clé OpenRouter a été utilisée uniquement en mémoire pour les tests ; l'utilisateur peut la renseigner durablement dans `Admin > IA > Configuration & Clés`, où elle est chiffrée côté backend et jamais réaffichée en clair. Le libellé `famille_cir=99/DIVERS` des deux baisses est exact mais peu discriminant; proposer `categorie_fabricant` pour détailler Z16/Z25.
- **QA** : checks ciblés verts (`deno check` des trois modules Phase 2, `deno lint`, test contrat 13/13, probes SQL/service/outils réels, suite d'évaluation valide). `pnpm run qa:back` : `repo:check`, lint et typecheck verts; la commande s'arrête au pré-check de `dataInteractions_test.ts` sur une factory CRM concurrente hors Phase 2 (`amount`, `stage`, `stage_changed_at`, `quote_sent_at`, `lost_reason`). Exécution backend `--no-check` : 266 réussis, 0 échec, 8 intégrations conditionnelles ignorées. La case QA reste donc ouverte tant que ce changement externe n'est pas stabilisé.

### 2026-07-12 — Statut réconcilié et gate finale verte
- **Réconciliation** : le fixture interactions qui bloquait le pré-check TypeScript a été aligné sur les champs persistés requis. La Phase 2 est désormais terminée ; ses contrats sont inclus dans l'Edge Function `api` version 118 déjà déployée.
- **QA actuelle** : `pnpm run qa` vert — 689 tests frontend, 276 tests backend et 9 tests d'intégration réussis ; couverture, build, lint, typechecks, conformité erreurs, hygiène repo et parité migrations verts.
