# Plan général — Assistant IA CIR Cockpit

> Rédigé le 2026-07-08. Ce document est la source de vérité du chantier "Assistant IA".
> Chaque phase possède son propre fichier `phase-N-*.md` avec spécification, checkpoints,
> prompt d'exécution autonome et changelog. Les phases se font strictement dans l'ordre.

## 1. Objectif produit

Donner aux utilisateurs un assistant IA conversationnel capable de répondre en français
à des questions sur les données réelles du cockpit, en commençant par les référentiels
tarifaires (`/remises/referentiels`). Questions cibles validées par le PO :

- « Quelles sont les familles chez ROCKWELL qui ont augmenté par rapport au dernier fichier tarif ? »
- « Quelles sont les familles de produit dont les remises ont baissé ? »
- « Tu peux me dire les changements par rapport au dernier fichier tarif ? »
- « Aide-moi à corriger les anomalies sur le fichier Segment… »

Un second horizon (hors périmètre de ce plan, voir §9) : un assistant généraliste sur le CRM
(« Quels clients font le plus de CA en automatisme ? », ciblage clients via rapports de visite).

## 2. Principe d'architecture retenu

**Tool calling borné, pas de RAG.** Les questions cibles sont des questions d'agrégation sur
données structurées (50 000 lignes par fichier tarif). Un RAG (embeddings + top-k retrieval)
ne peut pas garantir une réponse exhaustive sur ce type de question et coûterait cher à
maintenir. À l'inverse, le moteur de diff du repo calcule déjà des agrégats exacts.

Le LLM ne voit jamais les données brutes ni la base : il appelle un petit registre d'outils
en lecture seule, wrappers directs des services backend existants, qui retournent des
agrégats/pages plafonnés. Anti-patterns explicitement interdits :

- pas de SQL généré par le LLM ;
- pas de clé API côté navigateur (les clés restent chiffrées en DB, déchiffrées serveur) ;
- pas d'indexation vectorielle des lignes tarifaires.

## 3. État des lieux de l'existant (vérifié le 2026-07-08)

Le repo possède déjà un socle de gouvernance IA complet, construit pour la feature
`pricing.references.diagnose` (diagnostic one-shot du rapport de santé d'un import).
**Ce socle est réutilisé tel quel par ce plan — il n'est pas à refaire.**

### 3.1 Base de données (tables déjà en place, voir `backend/drizzle/schema.ts`)

| Table | Rôle | Réutilisée |
| --- | --- | --- |
| `ai_provider_configs` | Fournisseur (OpenRouter), clé API chiffrée, statut test | Oui, telle quelle |
| `ai_model_configs` | Modèles autorisés, prix/M tokens, max_output_tokens, température, défaut | Oui, telle quelle |
| `ai_prompt_templates` + `ai_prompt_versions` | Prompts système versionnés (draft/publish/restore) par feature | Oui, telle quelle |
| `ai_quota_policies` | Quotas scope global/agency/user, par feature, limites appels/tokens/coût jour+mois | Oui, telle quelle |
| `ai_usage_events` | Journal d'audit : tokens, coût, statut, latence, user, feature | Oui, telle quelle |
| `ai_response_cache` | Cache de réponses avec TTL | Non utilisée par l'assistant v1 (réponses conversationnelles non déterministes) |

### 3.2 Backend (`backend/functions/api/services/ai/aiGovernance.ts`, ~1200 lignes)

- CRUD settings/modèles/quotas/prompts, `testAiProvider`, `getAiUsageSummary`, `listAiUsageEvents`.
- `enforceAiQuota(db, authContext, featureKey)` : application des quotas avant appel provider.
- `recordUsage` / `recordBlockedUsage` / `recordErrorUsage` : journalisation systématique.
- `computeCost` : coût réel OpenRouter (`usage.cost`) avec repli sur le barème du modèle.
- `callProvider` (ligne ~1049) : appel chat completions OpenAI-compatible vers OpenRouter,
  single-turn, `response_format: json_object`, **sans support `tools`** → à étendre en phase 1.
- Chiffrement clé API : `encryptSecret`/`decryptSecret` dans ce même fichier.
- `runPricingReferenceDiagnosis` : exemple complet du pipeline quota → cache → provider → usage.

### 3.3 Contrats et routes

- Schémas : `shared/schemas/ai.schema.ts` (`aiFeatureSchema` = 3 features diagnose,
  `aiProviderSchema` = `['openrouter']`).
- tRPC : `ai.settings.*`, `ai.prompts.*`, `ai.usage.*` (superAdmin) et
  `data.pricing.references.diagnose` (authed) dans `backend/functions/api/trpc/router.ts`.
- **Piège connu** : `shared/api/trpc.ts` est un miroir manuel des types du routeur — toute
  nouvelle procédure doit y être répercutée.

### 3.4 Frontend

- `frontend/src/components/admin-ai/AdminAiPanel.tsx` (955 lignes, monté dans
  `AdminPanel.tsx`, onglet IA de `/admin`) : 3 sous-onglets (Configuration & Clés,
  Limites & Quotas, Usages & Audits).
- `frontend/src/services/ai.ts` : services RPC front (settings, prompts, usage) — les
  services prompts existent mais **aucune UI ne les utilise**.

### 3.5 Réponse à la question « l'admin > IA actuel ne sert à rien ? »

Le **backend** de cette page est précieux et entièrement réutilisé (clés chiffrées, quotas,
usage, prompts versionnés). L'**UI**, elle, est effectivement à refondre : hardcodée
OpenRouter + DeepSeek V4 Pro, pas de gestion multi-modèles réelle, pas de création de
politique de quota, user_id bruts non résolus en noms, pas de gestion d'accès par membre,
onglet prompts absent. La refonte est la phase 5 ; rien n'est jeté côté données/API.

### 3.6 Moteur de diff et anomalies (la matière première de l'assistant)

- `backend/functions/api/services/pricing/references/referenceDiffs.ts` :
  `getPricingReferenceDiffSummary` (total, counts_by_type, counts_by_object_type,
  changed_columns, financial_changes_count, deviation_alerts), `listPricingReferenceDiffs`
  (filtres marques/diff_types/object_types/changed_columns/severities, pagination).
- `referenceImports.ts` : liste/détail des imports, health report.
- Anomalies : summary avec facettes (sévérité/type/marque) et `action_label` par type —
  base directe du cas « aide-moi à corriger les anomalies ».
- Manque identifié : **aucun agrégat par famille/segment avec direction du changement**
  (hausse/baisse). C'est le seul vrai chantier data du plan → phase 2.

## 4. Décisions d'architecture verrouillées

| # | Décision | Justification |
| --- | --- | --- |
| D1 | OpenRouter reste l'unique passerelle provider | Déjà câblé (clé chiffrée, coût réel via `usage.cost`), donne accès à Mistral/Claude/DeepSeek par simple changement de `model_id` |
| D2 | Nouvelle feature `assistant.referentiels` dans `aiFeatureSchema` | S'insère dans quotas/usage/prompts existants ; extensible plus tard (`assistant.cockpit`) |
| D3 | Boucle tool calling bornée : max 6 tours d'outils, max 50 lignes par résultat d'outil, timeout global 60 s, outils lecture seule uniquement | Coût et sécurité maîtrisés |
| D4 | v1 en mutation tRPC non-streaming (`ai.assistant.ask`) | Contrats Zod stricts conservés, pas de nouveau transport ; SSE seulement si latence jugée insupportable (réévalué phase 6) |
| D5 | Modèle par défaut assistant : à trancher en phase 1 par test réel entre `mistralai/mistral-small-*` et `anthropic/claude-haiku-4.5` (IDs OpenRouter à vérifier au moment de l'implémentation) ; le tool calling multi-tours fiable est le critère n°1 | Le DeepSeek configuré n'a pas été validé pour le tool calling multi-tours |
| D6 | Conversations stateless côté serveur : le client renvoie l'historique borné (12 derniers messages) ; pas de persistance DB v1 | Simplicité, pas de rétention à gérer d'emblée |
| D7 | Accès par membre : table `ai_feature_grants` (+ ligne défaut) appliquée dans le broker ; UI d'administration dédiée | Demande PO explicite : autorisations par membre |
| D8 | Le front injecte le contexte de page (import_id, run_id, onglet actif) avec chaque question | Résout « le fichier Segment… » sans ambiguïté ni tour de LLM |
| D9 | Nouvel agrégat `diffs.aggregate` (GROUP BY dimension + direction) exposé en tRPC, utilisé par l'assistant et réutilisable par l'UI Changements | Réponses exhaustives et exactes aux questions « quelles familles ont baissé » |
| D10 | UI chat en Dialog centré (décision PO : pas de Sheet latérale), bouton d'entrée sur la page Référentiels | Cohérence avec le pattern Ctrl+K existant |

## 5. Architecture cible

```
Frontend (PricingReferencesPage)
  └─ Bouton "Assistant IA" → Dialog centré (chat)
       │  question + historique borné + contexte de page (import_id, run_id, onglet)
       ▼
Edge Function api (Hono + tRPC) — ai.assistant.ask (authedProcedure)
  └─ assistantBroker
       1. contrôle accès membre (ai_feature_grants, phase 4)
       2. enforceAiQuota('assistant.referentiels')            [existant]
       3. prompt système versionné (ai_prompt_versions)       [existant]
       4. boucle LLM ↔ outils (max 6 tours)
            outils lecture seule → services existants :
            list_imports · get_import_details · get_diff_summary · aggregate_diffs (phase 2)
            list_diffs · get_anomalies_summary · list_anomalies · get_health_report
       5. recordUsage (tokens, coût, latence, tool_trace)     [existant]
       ▼
OpenRouter (modèle configuré dans ai_model_configs, tool calling)
```

## 6. Découpage en phases

| Phase | Fichier | Contenu | Périmètre | Gate QA |
| --- | --- | --- | --- | --- |
| 1 | [phase-1-socle-assistant-backend.md](phase-1-socle-assistant-backend.md) | Broker + boucle tool calling + 3 premiers outils + procédures `ai.assistant.ask/status` + prompt seedé + choix du modèle | Backend + shared | `pnpm run qa:back` |
| 2 | [phase-2-outils-referentiels.md](phase-2-outils-referentiels.md) | Agrégat `diffs.aggregate` (familles/segments/direction) + registre d'outils complet + qualité des réponses | Backend + shared | `pnpm run qa:back` |
| 3 | [phase-3-chat-referentiels-ui.md](phase-3-chat-referentiels-ui.md) | Dialog chat sur `/remises/referentiels`, contexte de page, états d'erreur/quota | Frontend | `pnpm run qa:front` |
| 4 | [phase-4-acces-membres.md](phase-4-acces-membres.md) | Table `ai_feature_grants`, enforcement broker, procédures admin accès + conso par membre | Backend + shared + migration | `pnpm run qa:back` |
| 5 | [phase-5-refonte-admin-ia.md](phase-5-refonte-admin-ia.md) | Refonte complète Admin > IA : vue d'ensemble, modèles, accès membres, prompts, usage | Frontend | `pnpm run qa:front` |
| 6 | [phase-6-durcissement-livraison.md](phase-6-durcissement-livraison.md) | Rate limit, rétention/purge, alertes budget, docs QA, `pnpm run qa` complet, déploiement | Transverse | `pnpm run qa` + runbook |

Dépendances : 1 → 2 → 3 ; 4 dépend de 1 ; 5 dépend de 4 ; 6 dépend de tout.
(3 et 4 peuvent techniquement être menées en parallèle, mais l'ordre nominal reste 1→6.)

## 7. Protocole d'exécution d'une phase

Chaque fichier de phase contient une section « Prompt d'exécution » à coller telle quelle
dans une **nouvelle conversation sans contexte**. Le prompt impose à l'agent de :

1. Lire `AGENTS.md` et invoquer le skill `cir-cockpit-agent-router`.
2. Lire ce plan général, son fichier de phase, et les **changelogs de toutes les phases
   précédentes** (source de vérité de ce qui a réellement été fait, écarts inclus).
3. Vérifier `git status --short` et ne jamais toucher aux modifications qui ne sont pas les siennes.
4. Lire le code réel avant d'éditer : ce plan décrit l'état au 2026-07-08 ; en cas d'écart,
   le code fait foi et l'écart est consigné au changelog.
5. Implémenter la spécification de la phase, valider chaque checkpoint, lancer la gate QA.
6. En fin de phase : cocher les checkpoints dans le fichier de phase, remplir son changelog
   (voir modèle ci-dessous), mettre à jour le tableau §8 de ce fichier.
7. Ne pas committer, ne pas déployer sans demande explicite de l'utilisateur.

### Modèle de changelog (en bas de chaque fichier de phase)

```markdown
### [AAAA-MM-JJ] — Phase exécutée
- **Fait** : …
- **Fichiers créés** : …
- **Fichiers modifiés** : …
- **Décisions prises en cours de route** : …
- **Écarts vs spécification (et pourquoi)** : …
- **Points ouverts / à surveiller pour les phases suivantes** : …
- **QA** : commandes lancées + résultats
```

## 8. Suivi des phases (à mettre à jour en fin de chaque phase)

| Phase | Statut | Date | Note |
| --- | --- | --- | --- |
| 1 — Socle assistant backend | À FAIRE | — | — |
| 2 — Outils référentiels complets | À FAIRE | — | — |
| 3 — Chat UI référentiels | À FAIRE | — | — |
| 4 — Accès membres | À FAIRE | — | — |
| 5 — Refonte Admin > IA | À FAIRE | — | — |
| 6 — Durcissement & livraison | À FAIRE | — | — |

## 9. Hors périmètre de ce plan (v2+)

- Assistant généraliste CRM (CA par client, ciblage commercial via rapports de visite) :
  nécessitera des outils analytiques dédiés + éventuellement du retrieval (pgvector + FTS)
  sur les notes d'interaction **uniquement** — jamais sur les données tarifaires. À planifier
  quand le module CRM/CA sera assez riche (voir cahier des charges IA-8).
- Outils d'écriture (corriger une anomalie via l'assistant) : envisageable après la v1,
  avec confirmation utilisateur obligatoire dans l'UI avant toute mutation.
- Persistance des conversations en DB, partage de conversations.
- Streaming SSE (réévalué en phase 6 selon la latence réelle).

## 10. Références

- Cahier des charges IA : `docs/LOGIQUE_REMISE_CIR/cahier-des-charges/METIER/08-intelligence-artificielle.md`
  (ce plan implémente IA-7 en version conversationnelle et pose le socle d'IA-4/IA-8 ;
  les quotas/fallback/dashboard du §8.4 sont couverts par le socle existant + phases 4-6).
- Plan socle référentiels : `docs/LOGIQUE_REMISE_CIR/plan-socle-referentiels-cir.md`.
- Diff/versioning : `docs/PLAN/versioning-diff-activation-referentiels.md`.
- QA : `docs/qa-runbook.md`, `docs/testing.md`.
