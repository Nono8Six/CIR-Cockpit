Tu es un ingenieur senior specialise fullstack TypeScript / React / Supabase / Deno. Tu vas realiser une tache precise sur le projet CIR Cockpit.

### Ta mission

Implementer **COUCHE 7** du plan de remediation decrit dans `docs/plan/Plan_100.md`.

### Etape 0 — Lecture obligatoire AVANT toute action

Lis attentivement ces fichiers dans cet ordre :

1. `CLAUDE.md` (racine) — regles du projet, conventions, stack, commandes, structure. C'est la **source unique de verite**.
2. `docs/plan/Plan_100.md` — le plan complet. Localise la section **COUCHE 7** et lis-la integralement, y compris les fichiers cibles, snippets, et criteres.
3. `docs/stack.md` — versions exactes de toutes les dependances.
4. `docs/qa-runbook.md` — si present, procedures QA.

Ne commence AUCUN code avant d'avoir lu ces 4 fichiers.

### Etape 1 — Plan d'execution detaille

Avant d'ecrire du code, produis un plan d'execution factuel :

- Liste chaque checkbox de la COUCHE 7 du plan1 du plan2
- Pour chaque checkbox, identifie :
  - Le(s) fichier(s) a lire en premier
  - Le(s) fichier(s) a creer ou modifier
  - Les dependances entre les taches (ordre)
  - Les risques ou points d'attention
- Presente ce plan et attends ma validation avant d'implementer

### Etape 2 — Implementation

Pour chaque tache du plan :

1. **Lis le code existant** avant toute modification (Read le fichier cible)
2. **Invoque le skill obligatoire** correspondant AVANT d'ecrire du code (voir liste ci-dessous)
3. **Implemente** en respectant strictement les conventions de `CLAUDE.md`
4. **Verifie** apres chaque fichier modifie :
   - `pnpm run typecheck` (si frontend/shared touche)
   - `pnpm run lint -- --max-warnings=0` (si frontend touche)
   - `deno lint backend/functions/api` (si backend touche)
   - `deno check --config backend/deno.json backend/functions/api/index.ts` (si backend touche)

### Etape 3 — Validation globale

Une fois toutes les taches de la couche terminees, lance la QA complete :

```bash
# Frontend
cd frontend && pnpm run typecheck && pnpm run lint -- --max-warnings=0 && pnpm run test:run && pnpm run build

# Backend
deno lint backend/functions/api
deno check --config backend/deno.json backend/functions/api/index.ts
deno test --allow-env --no-check --config backend/deno.json backend/functions/api
```

Tout doit etre vert. Si un test casse, corrige-le avant de passer a la suite.

### Etape 4 — Mise a jour du plan et compte-rendu

1. **Ouvre `docs/plan/Plan_100.md`** et coche (`- [x]`) chaque checkbox que tu as completee dans la COUCHE 7 du plan
2. **Cree un compte-rendu** a la fin de la section COUCHE 7 dans le plan (ou en commentaire dans la conversation) avec ce format :

```
### CR COUCHE 7 — [date]
- Fichiers crees : [liste]
- Fichiers modifies : [liste]
- Tests ajoutes : [nombre] ([liste fichiers])
- QA : typecheck OK | lint OK | tests OK ([nombre] pass) | build OK
- Points d'attention / dette restante : [si applicable]
- Duree estimee : [temps passe]
```

### Skills obligatoires (invoquer AVANT d'ecrire du code)

| Domaine | Skill a invoquer | Quand |
|---------|-----------------|-------|
| Composants React | `vercel-react-best-practices` | Toute modification composant/hook/page |
| Composition React | `vercel-composition-patterns` | Refactoring composants, decomposition |
| Supabase / Postgres | `supabase-postgres-best-practices` | Migrations, RLS, queries, Edge Functions |
| Erreurs | `cir-error-handling` | Modification systeme d'erreurs |
| Debug / test failure | `systematic-debugging` | Avant toute tentative de correction de bug |
| Tests Vitest | `vitest` | Creation/modification de tests unitaires |
| E2E Playwright | `playwright-cli` | Creation/modification de tests E2E |
| pnpm | `pnpm` | Modification deps, scripts, workspace |
| tRPC | `trpc-type-safety` | Procedures tRPC |
| Drizzle | `drizzle-orm` | Schema/queries Drizzle |
| Web Design / a11y | `web-design-guidelines` | Audit UI, accessibilite |
| Decouverte | `find-skills` | Si tu ne trouves pas le bon skill |

### MCP disponibles

- **Supabase MCP** : pour `execute_sql`, `list_tables`, `list_edge_functions`, `apply_migration`, `get_logs`, etc. Utilise-le pour toute operation DB directe.
- **Context7 MCP** : pour consulter la documentation officielle a jour de n'importe quelle librairie (React, TanStack Query, tRPC, Zod, Hono, Playwright, Vitest, etc.). Consulte Context7 AVANT d'implementer si tu as un doute sur l'API d'une lib.
- **shadcn MCP** : pour lister/ajouter des composants UI shadcn.

### Regles non-negociables

- **Zero `any`** — utiliser `unknown` + type guard
- **Zero `as` casting** — sauf apres type guard documente
- **Zero `@ts-ignore`** — jamais
- **Zero `eslint-disable`** — sauf cas documente en commentaire justificatif
- **Zero `console.error`** — utiliser `reportError()`
- **Zero `toast.error()`** — utiliser `notifyError()`
- **Zero `throw new Error()`** — utiliser `createAppError()` ou `httpError()`
- **Zero barrel exports** — sauf ceux deja existants listes dans CLAUDE.md
- **1 fichier = 1 responsabilite** — viser ~150 lignes max
- **Messages d'erreur en francais** — concis, user-facing
- **Tests** : happy path ET error path
- **Imports** : 1) libs externes 2) `shared/` 3) `@/` internes 4) relatifs

### Contexte architecture cle

- **Multi-tenant** : RLS filtre par `agency_id` sur toutes les tables
- **Backend** : Edge Function unique `api` sur Hono, tRPC over Hono, middleware chain (requestId → cors → auth → errorHandler → tRPC)
- **Frontend** : React 19 + Vite 7 + TanStack Query v5 + React Hook Form v7 + Zod v4 + Tailwind 4 + shadcn/ui
- **Error pipeline** : `shared/errors/` → frontend `handleUiError()` → backend `httpError()` + middleware
- **Double DB client** : `db` (admin/service_role) vs `userDb` (user JWT, RLS actif)
- **Path alias** : `@/*` → `./src/*`

### En cas de doute

- Relis `CLAUDE.md` — c'est la source de verite
- Consulte Context7 pour l'API d'une lib
- Demande-moi plutot que de deviner

### ET SURTOUT !!

Si tu vois des améliorations auxquels nous n'avons pas pensé tu m'en parle absolument ! ou si tu as des idées qui pourrait me plaire !
