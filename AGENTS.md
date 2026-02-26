# AGENTS.md

Guide complementaire pour les agents autonomes (Codex, subagents, etc.).

## Regle de base

Lire et appliquer `CLAUDE.md` en integralite. Ce fichier ajoute des regles specifiques au travail autonome.

## Skills obligatoires

Invoquer le skill correspondant AVANT d'ecrire du code (voir liste dans CLAUDE.md section "Skills obligatoires") :

- `vercel-react-best-practices` pour tout code React
- `vercel-composition-patterns` pour tout refactoring de composants
- `web-design-guidelines` pour tout audit UI / accessibilite
- `supabase-postgres-best-practices` pour toute modification DB
- `cir-error-handling` pour toute modification du systeme d'erreurs
- `systematic-debugging` pour tout bug, echec test, ou comportement inattendu (avant correction)
- `vitest` pour creation/mise a jour des tests unitaires/integration front
- `playwright-cli` pour verification des parcours UI/E2E
- `pnpm` pour toute modification package manager/workspace/dependances
- `trpc-type-safety` pour toute creation/migration tRPC
- `drizzle-orm` pour toute creation/migration Drizzle
- `find-skills` quand une capability manque ou doit etre cherchee

## Regle Context7 (obligatoire)

- Pour toute decision d'implementation sur une librairie/framework (React, TanStack Router/Query, tRPC, Drizzle, Vitest, Playwright), consulter Context7 avant de coder.
- Prioriser les snippets/doc officielles compatibles avec les versions du repo.

## MCPs disponibles

- **Chrome DevTools** : verifier l'UI dans le navigateur apres modification
- **Supabase** : contexte DB, tables, migrations, Edge Functions, types generes
- **Context7** : documentation a jour des librairies (React, TanStack Query, Zod, etc.)
- **shadcn** : rechercher, visualiser et installer des composants UI

## Runbook Edge Function api (prod)

- Toujours diagnostiquer avec MCP Supabase avant action (`list_edge_functions`, logs, version/hash/entrypoint/import_map).
- Ne jamais considerer l'editeur Dashboard comme source de verite du code.
- Source de verite : `backend/functions/api/`.
- Entree CLI obligatoire : `supabase/functions/api/index.ts` (wrapper vers `backend/functions/api/index.ts`).
- Import map de deploy : utiliser `deno.json` racine avec mapping explicite `zod`, `zod/v4`, `zod/`.
- Commande de deploy de reference :
  - `supabase functions deploy api --project-ref <project_ref> --use-api --import-map deno.json --no-verify-jwt`
- Si une action UI Supabase est requise, demander explicitement a l'utilisateur de la faire et attendre sa confirmation.

## Regles agents

- Toujours verifier `pnpm run qa` avant de considerer une tache terminee
- Zero donnees mockees, hardcodees, ou commentaires TODO non resolus dans le code livre
- Ne pas creer de fichiers non demandes (README, CHANGELOG, docs, fichiers vides)
- Preferer modifier un fichier existant plutot que d'en creer un nouveau
- Ne pas ajouter de fonctionnalites, refactoring, ou documentation au-dela de ce qui est demande
- Utiliser `pnpm run qa` depuis la racine comme gate par defaut; n'executer des commandes ciblees que pour diagnostic local
- Zod: source unique dans `shared/schemas`, payloads API en `.strict()`, `safeParse` obligatoire sur les entrees/sorties externes, et details de validation en francais.

## Quality Gate manuel (sans CI)

- Reference obligatoire: `docs/qa-runbook.md`
- Lecture obligatoire de `docs/qa-runbook.md` avant chaque prompt de travail envoye au LLM.
- Toute livraison doit suivre ce runbook de bout en bout (ordre strict, PASS/FAIL bloquant, rapport final).
- Sans execution complete du runbook, une tache n'est pas consideree terminee.

## Checklist pre-commit

Avant de considerer le travail termine :

- [ ] `pnpm run qa` passe
- [ ] Zero `any`, `@ts-ignore`, `@ts-expect-error` non documentes
- [ ] Zero `console.error` direct (utiliser `reportError`)
- [ ] Zero `toast.error()` direct (utiliser `notifyError`)
- [ ] Erreurs gerees via `createAppError()` / mappers (pas de `throw new Error()`)
- [ ] Messages d'erreur en francais
- [ ] Fichiers ~150 lignes max
- [ ] Imports corrects (path alias `@/*`, ordre respecte, zero circulaire)
- [ ] En prod, `POST /functions/v1/api/trpc/*` ne retourne plus aucun 404
- [ ] En prod, preflight `OPTIONS` des routes impactees retourne 200 avec headers CORS
- [ ] En prod, `list_edge_functions` confirme `api` deploye avec le bon entrypoint/import_map et `verify_jwt` attendu
