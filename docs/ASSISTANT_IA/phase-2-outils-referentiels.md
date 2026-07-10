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

- [ ] Structure réelle du `payload` de `pricing_reference_diffs` inspectée et documentée (source de la direction hausse/baisse, champs marque/famille/segment, bruit numérique).
- [ ] Contrat de dimensions explicite (`famille_cir`, `categorie_fabricant`, `segment`, `marque`) validé ; aucun `group_by='famille'` ambigu exposé sans mapping.
- [ ] Normalisation numérique/tolérance par mesure implémentée et testée ; les deltas neutres ne sortent pas en hausse/baisse par défaut.
- [ ] Alias marque déterministes implémentés/testés pour les questions PO (ex. ROCKWELL ↔ code réel si confirmé).
- [ ] `aggregatePricingReferenceDiffs` implémenté (GROUP BY dimension + direction normalisée, isolation agency_id, groupe « inconnu » géré).
- [ ] Schémas `PricingReferenceDiffAggregate*` `.strict()` FR + procédure `data.pricing.references.diffs.aggregate` (authed) + miroir `shared/api/trpc.ts`.
- [ ] Outils 4 à 8 branchés, contrats entrée/sortie stricts et versionnés, plafonnés en lignes/octets.
- [ ] Règle de résolution du run/import cible depuis `page_context` (ou dernier `analyse_ok`) implémentée et documentée.
- [ ] Prompt système v2 publié (ancienne version conservée).
- [ ] Test de contrat pour `aggregate` dans `pricingReferenceContracts_test.ts`.
- [ ] Jeu d'évaluation versionné avec attentes machine-checkables + vérification live des 4 questions PO (résultats au changelog).
- [ ] `pnpm run qa:back` vert.

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

_(vide — phase non encore exécutée)_
