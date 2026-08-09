# AGENTS.md

Guide operationnel court pour CIR Cockpit. Les documents canoniques et les preuves actuelles priment sur toute mémoire ou skill.

## Source et routage

- Lire d'abord les fichiers directement concernés et `cir-cockpit-agent-router`; ne pas explorer tout le dépôt si le périmètre est clair.
- Ne pas lire `CLAUDE.md` par défaut : c'est l'adaptateur Claude Code de ces règles.
- Lire la structure puis seulement les sections utiles des documents lourds.
- Lire `docs/architecture-cible-cir-cockpit.md` avant toute décision non triviale de produit, métier, architecture, données, IA, Tiers/Activités, pilotage, catalogue, import ou tarification. Respecter `VERROUILLÉ` et ne jamais trancher silencieusement `A VALIDER`.
- Lire `docs/CONFIGURATEURS/plan-execution.md` et `cir-cockpit-configurateurs` avant tout travail Configurateurs. Une tranche suivante exige une décision de sortie explicite ; cases, preuve et changelog ne sont mis à jour qu'après checkpoint prouvé.
- Lire `docs/ASSISTANT_IA/plan-mistral-assistant-transversal.md` avant toute modification de l'assistant, provider, broker, outils IA, couche sémantique ou évaluations. Respecter l'ordre des phases et exiger une preuve runtime.
- Lire `docs/qa-runbook.md` pour livraison finale, PR/merge/déploiement, modification de QA ou vérification complète ; `docs/testing.md` pour tests/E2E/Playwright ; `docs/stack.md` pour versions, dépendances, runtime, CI ou outillage.
- Pour la tarification métier, partir de `docs/LOGIQUE_REMISE_CIR/cahier-des-charges/00-sommaire.md`, avec l'architecture cible prioritaire sur les anciennes hypothèses.
- `.mcp.json` est local et ignoré par Git : vérifier les MCP réellement exposés avant de s'y fier.

## Règles de travail

- Préserver le worktree sale ; ne jamais revert, stash, reset, nettoyer, stage, commit, push, déployer, migrer ou publier hors autorisation courante.
- Modifier le minimum utile, préférer un fichier existant et ne pas ajouter fonctionnalité, refactor, documentation ou fichier non demandé.
- Zéro donnée mockée ou hardcodée, TODO non résolu ou texte décoratif dans le code livré.
- Zod : source unique dans `shared/schemas`, payloads API stricts, `safeParse` aux frontières externes et détails de validation en français.
- Erreurs : utiliser `createAppError()` / mappers / `reportError()` / `notifyError()` ; pas de `throw new Error()`, `console.error()` ou `toast.error()` directs hors exceptions documentées.
- Frontend : imports via `@/*`, pas d'import circulaire.
- Ne jamais exposer, copier, journaliser ou persister secrets, tokens, clés, mots de passe ou valeurs sensibles d'environnement.

## Routage des skills

Charger seulement les skills nécessaires à la tâche : une disponibilité ne justifie pas une invocation.

- Toute implémentation non triviale : `cir-cockpit-agent-router`; choisir la validation avec `cir-cockpit-qa-validation` avant la livraison.
- Prompt pour exécuter/reprendre un plan ou ouvrir une nouvelle tâche : `cir-cockpit-handoff-prompt`; référencer les sources sans les recopier, préserver résultat/limites/preuves, puis recommander modèle, effort et même/nouvelle tâche.
- tRPC, Zod partagé, services RPC ou routes backend : `cir-cockpit-api-contracts`. Ajouter `trpc-type-safety` uniquement pour une mécanique propre à la librairie tRPC ou une migration de version.
- DB, migration, RLS, index, requête ou Edge Function accédant à Postgres : `cir-cockpit-runtime-proof`, skill Supabase, MCP Supabase et `supabase-postgres-best-practices`. Ajouter `drizzle-orm` uniquement si le code Drizzle est réellement modifié.
- Erreurs : `cir-error-handling`. Bug, test en échec ou comportement inattendu : `systematic-debugging` avant correction.
- UI visible : `cir-cockpit-design` d'abord. `vercel-react-best-practices` seulement pour performance ou comportement React non trivial ; `vercel-composition-patterns` pour architecture/refactor de composants ; `web-design-guidelines` pour audit UI/accessibilité ; `impeccable` ou `design-taste-frontend` pour une décision visuelle. Utiliser `layers-intro` puis le seul `layers-*` pertinent pour une décision produit/UX profonde.
- Tests frontend : `vitest` seulement lors de création ou modification de tests Vitest. Parcours automatisé : `playwright-cli` seulement si l'E2E est demandé ou confirmé.
- `pnpm` seulement pour workspace, dépendances, lockfile ou comportement du gestionnaire ; pas pour exécuter un script existant.
- `find-skills` seulement si la compétence manque réellement.

## UI et outils

- Pour revue, refonte, polish, audit ou décision UI/UX, `cir-cockpit-design` route les inspirations actuelles Ramp, Stripe, Attio, Linear, Mistral et SmoothUI. Ne jamais copier marque, texte ou asset propriétaire ; signaler l'absence d'accès réseau.
- Context7 est requis pour une décision d'implémentation sur React, TanStack, tRPC, Drizzle, Vitest, Playwright, Zod ou autre librairie ; pas pour une relecture documentaire ou un changement de texte.
- Pour inspection visuelle en direct, préférer le navigateur in-app Codex. Garder Playwright pour scénarios automatisés, traces ou captures reproductibles ; ne pas lancer d'E2E sans demande ou confirmation.
- Utiliser le MCP shadcn uniquement pour rechercher, installer ou vérifier un composant UI.

## Supabase et preuves runtime

- Le MCP Supabase est requis avant toute action DB, migration, RLS, Edge Function, déploiement ou diagnostic runtime Supabase.
- Supabase distant est la vérité runtime ; `backend/migrations/` est l'historique SQL durable. Toute écriture de schéma autorisée passe par `apply_migration` du MCP, jamais par `db push`, SQL Editor ou connexion directe concurrente.
- Préparer une migration additive, RLS/ACL, preuves et rollback ; ne jamais modifier une migration appliquée. Après succès, extraire le SQL distant et prouver la parité version/nom/SQL avec le fichier local dans la même opération. Arrêter les migrations suivantes si cette parité ou la validation échoue.
- Ne pas créer de miroir par domaine, liste `remote-only` ou manifeste manuel de checksums ; la parité globale reste centralisée dans `scripts/check-repo-state.mjs`.
- Lire `cir-cockpit-runtime-proof` et `backend/migrations/README.md` pour la procédure détaillée.
- Edge Function `api` : source `backend/functions/api/`, wrapper `supabase/functions/api/index.ts`, import map `deno.json`, `[functions.api] verify_jwt = false` car l'auth est gérée dans le backend. Après déploiement, vérifier la fonction, les routes tRPC et CORS concernés via MCP/probes.

## QA proportionnée

- Audit sans édition : commandes read-only ciblées, aucune suite par réflexe.
- Docs/config agents/QA : `pnpm run qa:docs`.
- Frontend : `pnpm run qa:front` ou contrôles ciblés selon impact.
- Backend : `pnpm run qa:back` ou contrôles Deno ciblés.
- Shared/API/erreurs : contrôles front et back ciblés, ou `pnpm run qa:fast` si large.
- Livraison finale, merge, PR, déploiement ou demande explicite : lire le runbook, lancer `pnpm run qa` et les probes conditionnelles.
- `RUN_E2E=1 pnpm --dir frontend run test:e2e` seulement si un parcours UI impacté doit être vérifié et que l'E2E est demandé ou confirmé.
- `pnpm run qa:audit` seulement pour un audit de dépendances avec réseau.

## Références agents

- Issues : `docs/agents/issue-tracker.md`.
- Labels canoniques : `docs/agents/triage-labels.md`.
- Domain docs : `docs/agents/domain.md`; `AGENTS.md` et les documents canoniques CIR restent autoritaires.
