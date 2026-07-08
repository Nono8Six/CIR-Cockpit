# Phase 2 — Outils référentiels complets + agrégat par famille

> Prérequis : Phase 1 terminée (lire son changelog). Lire `00-plan-general.md`.
> Périmètre : backend + shared. Gate QA : `pnpm run qa:back`.
> Objectif : que l'assistant réponde **exactement** aux questions cibles du PO, en
> particulier « quelles familles / segments ont augmenté ou baissé par rapport au dernier
> fichier tarif ». Cela exige un nouvel agrégat SQL et un registre d'outils complet.

## 1. Le manque à combler

Le résumé de diff existant (`getPricingReferenceDiffSummary`) agrège par **type de diff**,
**type d'objet** et **colonne modifiée**, mais **pas par dimension métier (famille/segment/
marque) avec la direction du changement** (hausse vs baisse d'un prix ou d'une remise).

Or les questions cibles sont précisément dimensionnelles et directionnelles :

- « familles chez ROCKWELL qui ont **augmenté** » → GROUP BY famille, filtre marque=ROCKWELL, direction=hausse ;
- « familles dont les **remises ont baissé** » → GROUP BY famille, mesure=remise, direction=baisse.

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
- `group_by` : `z.enum(['famille','segment','marque','object_type','changed_column'])` ;
- `measure` : `z.enum(['prix','remise','any'])` (défaut `any`) ;
- `direction` : `z.enum(['hausse','baisse','any'])` (défaut `any`) ;
- filtres optionnels : `marques[]`, `severities[]`, `diff_types[]` (réutiliser les enums existants) ;
- `limit` : int 1..100 (défaut 50).

`response` (étend `apiSuccessSchema`) :

- `groups` : tableau de `{ key, label, total, hausse_count, baisse_count, added_count,
  removed_count, avg_delta_pct (nullable), max_delta_pct (nullable), sample_object_keys[] (max 5) }` ;
- `group_by`, `measure`, `direction` (écho) ;
- `truncated` : boolean si plus de `limit` groupes existent ;
- `run_id`, `base_snapshot_id`, `target_snapshot_id`.

L'implémentation agrège en SQL (Drizzle) sur `pricing_reference_diffs` filtrées par le run
résolu. La direction se déduit du signe du delta extrait du `payload` (selon 2.1). Respecter
l'isolation `agency_id` comme les autres services diff. Si la donnée métier (famille) n'est pas
présente dans le payload, remonter proprement le fait (groupe « inconnu » plutôt que crash).

### 2.3 Procédure tRPC

`data.pricing.references.diffs.aggregate` : `authedProcedure` (réutilisable aussi par l'UI
Changements plus tard). Input/output ci-dessus. Miroir `shared/api/trpc.ts`. Test de contrat
dans `pricingReferenceContracts_test.ts`.

### 2.4 Registre d'outils complet

Compléter `assistantTools.ts` (créé en phase 1) avec les outils manquants :

4. `aggregate_diffs` → wrappe `aggregatePricingReferenceDiffs`. **Outil central** pour les
   questions « quelles familles ont augmenté/baissé ». Description FR très explicite pour que
   le LLM le préfère à `list_diffs` sur les questions dimensionnelles.
5. `get_import_details` → détail d'un import (health report, compteurs par fichier, statut mapping).
6. `get_health_report` → rapport de santé (classification + segments + anomalies) d'un import.
7. `get_anomalies_summary` → wrappe le summary anomalies (facettes sévérité/type/marque +
   `action_label` par type). Base du cas « aide-moi à corriger les anomalies ».
8. `list_anomalies` → wrappe la liste paginée d'anomalies filtrable (sévérité/type/marque),
   résultats plafonnés à 50, avec le total réel.

Tous : validation Zod des args, plafond 50 lignes, erreur structurée (jamais d'exception nue)
si identifiant manquant.

### 2.5 Résolution du contexte de page

Le broker doit, quand la question porte sur « le dernier fichier tarif » sans identifiant
explicite, déduire le run/import cible depuis `page_context` (import_id/run_id/target_snapshot_id).
Si le contexte est vide, un outil de résolution par défaut : utiliser `list_imports` puis
prendre le plus récent `analyse_ok`, à l'image de `getHealthReport` du diagnose. Documenter la
règle de résolution appliquée.

### 2.6 Qualité de réponse

- Enrichir le prompt système `assistant.referentiels` (nouvelle version publiée via le
  mécanisme de versioning des prompts, **sans supprimer** l'ancienne) avec des directives :
  privilégier `aggregate_diffs` pour les questions par famille/segment ; toujours donner les
  chiffres exacts (nombre de familles, delta moyen) ; formater les listes de familles de façon
  lisible ; proposer une action concrète pour les anomalies.
- Définir un petit jeu de questions de référence (les 4 questions PO + variantes) et vérifier
  manuellement les réponses (clé de dev). Consigner les résultats dans le changelog.

## 3. Checkpoints à valider

- [ ] Structure réelle du `payload` de `pricing_reference_diffs` inspectée et documentée (source de la direction hausse/baisse).
- [ ] `aggregatePricingReferenceDiffs` implémenté (GROUP BY dimension + direction, isolation agency_id, groupe « inconnu » géré).
- [ ] Schémas `PricingReferenceDiffAggregate*` `.strict()` FR + procédure `data.pricing.references.diffs.aggregate` (authed) + miroir `shared/api/trpc.ts`.
- [ ] Outils 4 à 8 branchés (`aggregate_diffs`, `get_import_details`, `get_health_report`, `get_anomalies_summary`, `list_anomalies`), plafonnés à 50 lignes.
- [ ] Règle de résolution du run/import cible depuis `page_context` (ou dernier `analyse_ok`) implémentée et documentée.
- [ ] Prompt système v2 publié (ancienne version conservée).
- [ ] Test de contrat pour `aggregate` dans `pricingReferenceContracts_test.ts`.
- [ ] Vérification manuelle des 4 questions PO : réponses exactes et exhaustives (résultats au changelog).
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
pricing_reference_diffs pour savoir où se trouvent marque/famille/segment et comment est encodée
la direction hausse/baisse d'un prix ou d'une remise. Ne code l'agrégat qu'après. Documente ces
faits dans le changelog.

Lis le code réel avant d'éditer :
- backend/functions/api/services/pricing/references/referenceDiffs.ts (résumé, list, résolution snapshot)
- referenceImports.ts, et les services d'anomalies wrappés
- shared/schemas/pricing/references.schema.ts (schémas diff existants à composer, ne pas dupliquer)
- backend/functions/api/services/ai/assistantTools.ts et assistantBroker.ts (livrés en phase 1)
- backend/functions/api/trpc/router.ts + shared/api/trpc.ts (miroir manuel)

Implémente les sections 2.2 à 2.6. Contraintes : Zod .strict() messages FR, isolation agency_id
respectée, erreurs via httpError/createAppError, résultats d'outils plafonnés à 50 lignes,
zéro mock/TODO dans le code livré.

Écris le test de contrat de l'agrégat. Lance `pnpm run qa:back` jusqu'au vert. Si une clé
OpenRouter de dev est dispo, vérifie manuellement les 4 questions PO (§1 du plan général) et
note les réponses obtenues dans le changelog ; sinon consigne que la vérif reste à faire.

Quand tout passe : coche les checkpoints, remplis le changelog de la phase 2, mets à jour le
tableau de suivi (§8) de 00-plan-general.md. Ne commit/déploie pas sans demande explicite.
```

## 5. Notes de risque

- Le point dur est la sémantique du `payload` : si la direction hausse/baisse est mal
  extraite, toutes les réponses seront fausses de façon crédible. D'où l'inspection préalable
  obligatoire et la vérification manuelle sur les 4 questions.
- `aggregate_diffs` doit être clairement décrit pour que le LLM le choisisse au lieu de
  paginer `list_diffs`. Tester ce routage.
- L'agrégat est réutilisable par l'UI « Changements » : garder l'API générique, pas
  spécifique à l'assistant.

## 6. Changelog

<!-- À remplir en fin de phase. -->

_(vide — phase non encore exécutée)_
