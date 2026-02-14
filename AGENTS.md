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

- Toujours verifier `typecheck` + `lint` + `tests` avant de considerer une tache terminee
- Zero donnees mockees, hardcodees, ou commentaires TODO non resolus dans le code livre
- Ne pas creer de fichiers non demandes (README, CHANGELOG, docs, fichiers vides)
- Preferer modifier un fichier existant plutot que d'en creer un nouveau
- Ne pas ajouter de fonctionnalites, refactoring, ou documentation au-dela de ce qui est demande
- Executer les commandes de verification depuis `frontend/` pour le front et depuis la racine pour le backend

## Checklist pre-commit

Avant de considerer le travail termine :

- [ ] `npm run typecheck` passe sans erreur
- [ ] `npm run lint` passe avec `--max-warnings=0`
- [ ] `npm run test` — les tests impactes passent
- [ ] Zero `any`, `@ts-ignore`, `@ts-expect-error` non documentes
- [ ] Zero `console.error` direct (utiliser `reportError`)
- [ ] Zero `toast.error()` direct (utiliser `notifyError`)
- [ ] Erreurs gerees via `createAppError()` / mappers (pas de `throw new Error()`)
- [ ] Messages d'erreur en francais
- [ ] Fichiers ~150 lignes max
- [ ] Imports corrects (path alias `@/*`, ordre respecte, zero circulaire)
- [ ] En prod, `POST /functions/v1/api/data/*` ne retourne plus aucun 404
- [ ] En prod, preflight `OPTIONS` des routes impactees retourne 200 avec headers CORS
- [ ] En prod, `list_edge_functions` confirme `api` deploye avec le bon entrypoint/import_map et `verify_jwt` attendu
