# Phase 1 — Socle assistant backend (boucle tool calling)

> Prérequis : aucune phase précédente. Lire d'abord `00-plan-general.md`.
> Périmètre : backend + shared. Gate QA : `pnpm run qa:back`.
> Objectif : une procédure tRPC `ai.assistant.ask` qui fait tourner une vraie boucle
> de tool calling sur OpenRouter, avec 3 outils lecture seule, quotas et journalisation
> réutilisés de l'existant. Aucune UI dans cette phase.

## 1. Résultat attendu

À la fin de la phase, un appel `ai.assistant.ask` avec une question en français et un
contexte de page renvoie une réponse textuelle sourcée, après avoir éventuellement appelé
1 à 3 outils backend. L'appel est soumis aux quotas et journalisé dans `ai_usage_events`
sous la feature `assistant.referentiels`. Testable via test Deno de contrat (sans réseau,
provider mocké).

## 2. Spécification détaillée

### 2.1 Nouvelle feature IA

Dans `shared/schemas/ai.schema.ts`, étendre `aiFeatureSchema` avec `'assistant.referentiels'`.
Vérifier tous les usages de `aiFeatureSchema` (labels front, quotas seed, prompts) et le
`featureLabel()` de `AdminAiPanel.tsx` pour éviter un enum non exhaustif — ne pas casser
l'existant, seulement ajouter.

**Important (typage Drizzle)** : dans `backend/drizzle/schema.ts`, les colonnes `feature` de
`ai_quota_policies` (~L570) et `ai_usage_events` (~L595) sont des colonnes `text` mais typées en
TS par une **union littérale figée** qui n'inclut pas la nouvelle valeur. Étendre ces deux
`$type<...>()` avec `'assistant.referentiels'` (sinon TypeScript refusera d'insérer un usage ou
un quota sur la nouvelle feature). Aucune migration SQL n'est nécessaire (colonnes `text`), mais
vérifier via Supabase MCP qu'aucune contrainte CHECK n'y restreint les valeurs ; si c'est le
cas, prévoir une micro-migration d'ajout de valeur au CHECK.

### 2.2 Schémas de contrat (dans un nouveau fichier `shared/schemas/aiAssistant.schema.ts`)

Créer les schémas Zod (`.strict()`, messages FR) :

- `aiAssistantPageContextSchema` : contexte de page injecté par le front. Champs optionnels :
  `surface` (z.enum, v1 = `['pricing.references']`), `import_id` (uuid), `run_id` (uuid),
  `target_snapshot_id` (uuid), `base_snapshot_id` (uuid nullable), `active_tab` (string court),
  `file_kind` (`'classification' | 'segments_grids'`, optionnel).
- `aiAssistantMessageSchema` : `{ role: z.enum(['user','assistant']), content: string(1..4000) }`.
- `aiAssistantAskInputSchema` : `{ question: string(1..2000), history: array(message).max(12).default([]), page_context: aiAssistantPageContextSchema }`.
- `aiAssistantCitationSchema` : `{ tool: string, label: string, ref: jsonb }` — trace des outils
  effectivement utilisés, pour l'affichage « sources » côté UI.
- `aiAssistantToolCallTraceSchema` : `{ name: string, arguments: jsonb, ok: boolean, row_count: z.number().int().nullable(), duration_ms: number }`.
- `aiAssistantAskResponseSchema` : étend `apiSuccessSchema` avec
  `{ ai_available: boolean, answer: string.nullable(), citations: array(citation), tool_trace: array(toolCallTrace), usage: aiUsageTotalsSchema.nullable(), cost: {...}.nullable(), fallback_reason: string.nullable(), model_id: string.nullable(), truncated: boolean }`.
  Réutiliser la forme `usage`/`cost` du schéma diagnose existant pour homogénéité.
- `aiAssistantStatusResponseSchema` : `{ enabled: boolean, model_id: string.nullable(), reason: string.nullable() }`
  — indique au front si l'assistant est utilisable (provider actif + clé + modèle + accès).
- Exporter les types `AiAssistant*Input`/`Response`.

Attention : suivre exactement les conventions de `shared/schemas/ai.schema.ts` (imports de
`uuidSchema`, `nonEmptyStringSchema`, `apiSuccessSchema`, `nullableTextSchema`).

### 2.3 Broker et boucle tool calling (nouveau fichier `backend/functions/api/services/ai/assistantBroker.ts`)

Ne pas alourdir `aiGovernance.ts` : créer un module dédié qui **importe et réutilise** les
helpers existants de `aiGovernance.ts`. Extraire en exports depuis `aiGovernance.ts` (sans
changer leur comportement) ce qui est nécessaire : `resolveModelAndPrompt` (ou une variante
paramétrée par feature), `enforceAiQuota`, `recordUsage`/`recordBlockedUsage`/`recordErrorUsage`,
`computeCost`, `decryptSecret`, `getProviderRow`, types `ProviderRow`/`ModelRow`/`ProviderUsage`.
Si `resolveModelAndPrompt` est couplé au diagnose, généraliser proprement (paramètre `feature`)
plutôt que dupliquer.

Fonction principale :

```ts
export const runAssistantAsk = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: AiAssistantAskInput,
): Promise<AiAssistantAskResponse>
```

Étapes :

1. Résoudre provider actif + clé + modèle par défaut + prompt système publié pour la feature
   `assistant.referentiels`. Si indisponible → retour `ai_available:false` avec `fallback_reason`
   (même pattern que `unavailable()` du diagnose). **Ne pas throw** pour l'indispo de config.
2. `enforceAiQuota(db, authContext, 'assistant.referentiels')`. Si bloqué → `recordBlockedUsage`
   puis throw (le front gère l'erreur quota).
3. Construire les messages : `system` (prompt versionné + contexte de page sérialisé + règles :
   répondre en français, n'utiliser que les outils, dire « je ne sais pas » si les outils ne
   permettent pas de répondre, citer les outils utilisés) + `history` borné + `question`.
4. Boucle bornée (`MAX_TOOL_ROUNDS = 6`) :
   - appeler le provider avec `tools` (voir 2.4) et `tool_choice: 'auto'` ;
   - si la réponse contient des `tool_calls` : exécuter chacun via le registre (2.5),
     ajouter les messages `assistant`(tool_calls) + `tool`(résultats) à la conversation,
     accumuler la trace, itérer ;
   - sinon : réponse finale, sortir de la boucle.
   - Si `MAX_TOOL_ROUNDS` atteint sans réponse finale : forcer un dernier tour avec
     `tool_choice: 'none'` pour obtenir une réponse en clair ; marquer `truncated: true`.
5. Accumuler tokens/coût sur **tous** les tours (somme des `usage` de chaque appel provider) ;
   `recordUsage` une seule fois avec les totaux + `tool_trace` en métadonnée.
6. Construire `citations` à partir des outils réellement exécutés avec succès.
7. Retour validé par `aiAssistantAskResponseSchema`.

Constantes : `MAX_TOOL_ROUNDS = 6`, `MAX_TOOL_RESULT_ROWS = 50`, `OVERALL_TIMEOUT_MS = 60_000`
(annuler via `AbortController` propagé aux fetch provider ; sur timeout → `recordErrorUsage` +
throw `httpError(504, 'AI_TIMEOUT', …)`).

### 2.4 Extension de `callProvider` pour le tool calling

`callProvider` actuel (aiGovernance.ts ~L1049) est single-turn sans outils. Créer une variante
`callProviderWithTools(provider, model, messages, tools, apiKey, signal)` qui :

- envoie `messages` complets (pas seulement system+user), `tools`, `tool_choice`,
  et **retire** `response_format: json_object` (incompatible avec une réponse conversationnelle
  libre / tool calling) ;
- lit `choices[0].message.tool_calls` (format OpenAI) et `choices[0].message.content` ;
- lit `usage` (prompt_tokens, completion_tokens, cached, reasoning) et `usage.cost` OpenRouter ;
- réutilise `openAiCompatibleHeaders`, `providerBaseUrl`, `readProviderJson`, la gestion
  d'erreur `providerHttpError`/`readProviderError` existantes.

Ne pas casser `callProvider` existant (toujours utilisé par le diagnose).

### 2.5 Registre d'outils (nouveau fichier `backend/functions/api/services/ai/assistantTools.ts`)

Définir un registre typé : chaque outil = `{ name, description (FR, précise), parameters (JSON Schema), run(db, authContext, args) }`.
Le broker sérialise `parameters` au format OpenAI `tools`. `run` valide `args` avec un schéma
Zod avant exécution et **plafonne** tout résultat à `MAX_TOOL_RESULT_ROWS`.

Phase 1 — 3 outils seulement (les autres en phase 2) :

1. `list_imports` → wrappe la liste d'imports existante (`referenceImports.ts`). Retourne
   id, libellé/fichier, statut, date, compteurs de lignes, anomalies_total. Paginé/plafonné.
2. `get_diff_summary` → wrappe `getPricingReferenceDiffSummary`. Args : `{ run_id? , target_snapshot_id? , base_snapshot_id? }` (au moins un identifiant, ou déduit du `page_context`).
   Retourne le résumé (total, counts_by_type, counts_by_object_type, changed_columns,
   financial_changes_count, deviation_alerts, snapshot_counters).
3. `list_diffs` → wrappe `listPricingReferenceDiffs`. Args : filtres marques/diff_types/
   object_types/changed_columns/severities + pagination. Retourne les lignes plafonnées
   + total réel (pour que le LLM sache s'il y a plus).

Règle : les outils **n'inventent pas de SQL**, ils appellent les services existants avec le
contexte auth. Si un identifiant manque, l'outil retourne une erreur structurée
(`{ ok:false, reason }`) que le LLM peut lire, jamais une exception non gérée.

### 2.6 Procédures tRPC

Dans `backend/functions/api/trpc/router.ts`, sous `ai: router({ ... })`, ajouter un
sous-routeur `assistant` :

- `ask` : `authedProcedure` (pas superAdmin — c'est un usage utilisateur)
  `.input(aiAssistantAskInputSchema).output(aiAssistantAskResponseSchema).mutation(withAuthedHandler(runAssistantAsk))`.
- `status` : `authedProcedure.input(z.strictObject({}).…).output(aiAssistantStatusResponseSchema).query(withAuthedHandler(getAssistantStatus))`.

Répercuter dans `shared/api/trpc.ts` (miroir manuel — piège connu). Importer les schémas et
les fonctions comme les autres blocs `ai`.

### 2.7 Prompt système seedé

Créer le template de prompt pour `assistant.referentiels` (via le mécanisme
`ai_prompt_templates`/`ai_prompt_versions` existant) : une migration de seed **ou** un script
d'insertion idempotent, cohérent avec la façon dont les prompts diagnose sont seedés
(vérifier s'il existe déjà une migration de seed prompts et suivre le même pattern). Le corps
du prompt (FR) doit : cadrer le rôle (assistant analyste des référentiels tarifaires CIR),
imposer le français, interdire l'invention de chiffres hors outils, imposer la citation des
outils, et exiger un « je ne sais pas » explicite si les outils ne couvrent pas la question.

### 2.8 Choix du modèle (livrable de décision)

Tester en réel (clé OpenRouter de dev) la boucle tool calling avec au moins deux modèles
candidats (Mistral Small et Claude Haiku 4.5, IDs OpenRouter à vérifier). Documenter dans le
changelog : lequel enchaîne correctement 2-3 outils, coût observé par question, latence.
Configurer le gagnant comme modèle par défaut de la feature. Si aucun n'est concluant, le
consigner et proposer une alternative.

## 3. Checkpoints à valider

- [ ] `assistant.referentiels` ajouté à `aiFeatureSchema` sans casser les enums exhaustifs existants.
- [ ] `shared/schemas/aiAssistant.schema.ts` créé, tous schémas `.strict()`, messages FR, types exportés.
- [ ] `callProviderWithTools` implémenté ; `callProvider` d'origine intact (diagnose non régressé).
- [ ] Boucle tool calling bornée (6 tours, plafonds, AbortController/timeout) opérationnelle.
- [ ] 3 outils (`list_imports`, `get_diff_summary`, `list_diffs`) branchés sur les services réels, résultats plafonnés à 50 lignes.
- [ ] Quotas + journalisation `ai_usage_events` sous `assistant.referentiels` (succès, bloqué, erreur, cumul multi-tours).
- [ ] Procédures `ai.assistant.ask` (mutation, authed) et `ai.assistant.status` (query, authed) exposées et miroir `shared/api/trpc.ts` à jour.
- [ ] Prompt système `assistant.referentiels` seedé de façon idempotente.
- [ ] Test Deno de contrat (`aiAssistantContracts_test.ts`) : provider mocké, vérifie un tour d'outil + réponse finale + parse strict de la sortie.
- [ ] Modèle par défaut choisi et documenté (comparatif dans le changelog).
- [ ] `pnpm run qa:back` vert (ou écarts justifiés).

## 4. Prompt d'exécution (à coller dans une conversation neuve)

```
Tu travailles sur le repo CIR Cockpit (C:\GitHub\CIR_Cockpit\CIR-Cockpit). Tâche : implémenter
la Phase 1 du chantier Assistant IA.

Avant tout code :
1. Lis AGENTS.md puis invoque le skill cir-cockpit-agent-router.
2. Lis docs/ASSISTANT_IA/00-plan-general.md en entier (architecture, décisions D1-D10, état de l'existant).
3. Lis docs/ASSISTANT_IA/phase-1-socle-assistant-backend.md en entier : c'est ta spécification.
4. Invoque les skills cir-cockpit-api-contracts (contrats tRPC/Zod) et cir-error-handling
   (erreurs via createAppError/httpError, jamais throw new Error direct).
5. Lance `git status --short` et ne touche jamais aux modifications qui ne sont pas les tiennes.

Lis le code réel avant d'éditer — le plan décrit l'état au 2026-07-08, le code fait foi :
- backend/functions/api/services/ai/aiGovernance.ts (réutilise enforceAiQuota, recordUsage,
  recordBlockedUsage, recordErrorUsage, computeCost, decryptSecret, resolveModelAndPrompt,
  callProvider, openAiCompatibleHeaders, providerBaseUrl ; NE CASSE PAS le diagnose existant)
- backend/functions/api/services/pricing/references/referenceDiffs.ts et referenceImports.ts
  (services que tes outils vont wrapper)
- shared/schemas/ai.schema.ts (conventions Zod à suivre)
- backend/functions/api/trpc/router.ts (bloc `ai: router(...)`) et shared/api/trpc.ts (miroir manuel)

Implémente exactement la spécification (sections 2.1 à 2.8). Respecte : Zod .strict() avec
messages FR, alias @/* côté front (non concerné ici), erreurs via httpError/createAppError,
zéro donnée mockée dans le code livré, zéro TODO non résolu. Ne crée pas de fichiers non
demandés. Préfère étendre les fichiers existants quand la spec le dit.

Pour le tool calling OpenRouter (format tools/tool_calls OpenAI-compatible) et le choix du
modèle, utilise Context7 (doc à jour OpenRouter/Mistral/Anthropic) plutôt que ta mémoire.

Écris le test Deno de contrat avec provider mocké. Lance la gate `pnpm run qa:back` et corrige
jusqu'au vert (ou justifie tout écart). Pour le choix du modèle, si une clé OpenRouter de dev
est disponible, teste réellement la boucle avec 2 modèles et note le comparatif ; sinon,
consigne que le test réel reste à faire et configure un défaut provisoire documenté.

Quand tout passe :
- coche les checkpoints (section 3) dans le fichier de phase,
- remplis le changelog en bas du fichier de phase avec le modèle exact fourni dans le plan,
- mets à jour le tableau de suivi (§8) de docs/ASSISTANT_IA/00-plan-general.md.
Ne commit pas et ne déploie pas sans que l'utilisateur le demande explicitement.
```

## 5. Notes de risque

- La boucle multi-tours est la partie fragile : borner strictement, toujours prévoir la
  sortie forcée `tool_choice:'none'`, et cumuler les coûts sur tous les tours (sinon usage
  sous-estimé).
- Vérifier le format exact des `tool_calls` renvoyés par OpenRouter selon le modèle (certains
  modèles diffèrent légèrement) — Context7 + test réel.
- Ne pas persister d'historique en DB (D6). Le client renvoie l'historique borné.

## 6. Changelog

<!-- À remplir en fin de phase. Modèle dans 00-plan-general.md §7. -->

_(vide — phase non encore exécutée)_
