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
