# Stack Technique - CIR Cockpit

> Reference documentaire de la stack du projet.
> Derniere mise a jour: 2026-08-16
> Etat verifie contre les manifests et configs du repo.

Cette page decrit la stack **actuellement en place**, pas la cible. Le backend
actif est Node.js 24 + Hono + tRPC + AI SDK 7 (`generateText` + `Output.object`).
DBOS reste la prochaine etape : voir
[`IA_AGENTIQUE/stack-cible-agentique-et-comparatif-existant.md`](./IA_AGENTIQUE/stack-cible-agentique-et-comparatif-existant.md).

## Resume executif

- Frontend: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 4, shadcn/ui + Radix UI, TanStack Router, TanStack Query, React Hook Form + Zod, TanStack Table, Motion, Sonner, Supabase JS.
- Backend: Node 24, Hono + tRPC, Drizzle ORM + `postgres`, Supabase (Postgres + Auth + Realtime), `jose` pour la verification JWT, AI SDK 7 (`ai@7.0.66`, `@ai-sdk/mistral@4.0.29`).
- Qualite: `pnpm` workspace, ESLint 9, Vitest 4, Playwright, Husky, lint-staged, gates locales par impact (`qa:docs`, `qa:front`, `qa:back`, `qa:fast`, `qa`), gate CI dediee `qa:ci`, workflow GitHub Actions `qa.yml`.

## Sources de verite

Cette page doit suivre en priorite:

1. `package.json`
2. `frontend/package.json`
3. `backend/package.json`
4. `pnpm-lock.yaml`
5. `supabase/config.toml`
7. `frontend/vite.config.ts`
8. `frontend/vitest.config.ts`
9. `frontend/playwright.config.ts`
10. `.github/workflows/qa.yml`

## Workspace et outillage racine

| Element | Version / etat | Source |
|---------|-----------------|--------|
| Node.js local + CI | `24.14.0` | runtime local, `.github/workflows/qa.yml` |
| Package manager | `pnpm@10.33.0` | `package.json` |
| Workspace | `frontend`, `shared`, `backend` | `pnpm-workspace.yaml` |
| Git hooks | Husky `9.1.7` | `package.json` |
| Pre-commit cible | lint-staged `17.3.0` | `package.json` |
| Gate docs/config | `pnpm run qa:docs` | `package.json` |
| Gate frontend | `pnpm run qa:front` | `package.json` |
| Gate backend | `pnpm run qa:back` | `package.json` |
| Gate intermediaire large | `pnpm run qa:fast` | `package.json` |
| Gate final complet | `pnpm run qa` | `package.json` |
| Gate CI sans Supabase CLI lie | `pnpm run qa:ci` | `package.json`, `.github/workflows/qa.yml` |
| Audit deps reseau | `pnpm run qa:audit` | `package.json` |
| CLI Supabase locale | `2.98.1` | `supabase --version` |
| Overrides securite pnpm | `ajv@6.14.0`, `rollup@4.59.0`, `flatted@3.4.2`, `picomatch@2.3.2/4.0.4`, `yaml@2.9.0`, `ws@8.21.0`, `minimatch@3.1.4/9.0.7`, `lodash-es@4.18.1` | `package.json` |
| Transitives securite resolues | `seroval@1.6.2`, `brace-expansion@1.1.18/5.0.9`, `postcss@8.5.25`, `form-data@4.0.6`, `js-yaml@4.3.1` | `pnpm-lock.yaml` |

## Frontend

### Core runtime

| Technologie | Version | Role |
|-------------|---------|------|
| React | `19.2.8` | UI runtime |
| React DOM | `19.2.8` | rendu DOM |
| Vite | `7.3.6` | dev server + build |
| TypeScript | `5.9.3` | typage strict |
| Tailwind CSS | `4.3.3` | styling utilitaire |
| `@tailwindcss/vite` | `4.3.3` | integration Vite |

### Navigation, state et data fetching

| Technologie | Version | Role |
|-------------|---------|------|
| TanStack Router | `1.170.29` | routing SPA |
| TanStack Query | `5.101.4` | cache, queries, mutations |
| Zustand | `5.0.15` | store d'erreurs |
| Supabase JS frontend | `2.112.3` épinglé | auth, realtime, acces donnees et API |

### Formulaires et validation

| Technologie | Version | Role |
|-------------|---------|------|
| React Hook Form | `7.85.0` | formulaires |
| `@hookform/resolvers` | `5.9.0` | bridge RHF + Zod |
| Zod | `4.4.3` | validation partagee front/back |

### UI, composants et UX

| Technologie | Version | Role |
|-------------|---------|------|
| shadcn/ui | config repo | primitives UI |
| Radix UI | packages `@radix-ui/react-*` | accessibilite / primitives headless |
| TanStack Table | `8.21.3` | tables riches |
| Motion | `12.35.2` | animations UI |
| Sonner | `2.0.8` | notifications |
| Lucide React | `0.564.0` | icones |
| `react-error-boundary` | `6.1.2` | error boundary |
| `cmdk` | `1.1.1` | command palette / recherche |
| `class-variance-authority` | `0.7.1` | variants Tailwind |
| `clsx` | `2.1.1` | composition de classes |
| `tailwind-merge` | `3.6.0` | merge de classes Tailwind |
| `@stepperize/react` | `6.1.0` | stepper UI |

### Utilitaires metier

| Technologie | Version | Role |
|-------------|---------|------|
| date-fns | `4.4.0` | dates |
| neverthrow | `8.2.0` | result/error ergonomics |

### Architecture frontend actuelle

- Application SPA Vite servie en local sur le port `3000`.
- Alias actifs: `@/*` vers `frontend/src/*`, `shared/*` vers `../shared/*`.
- Le dev server proxy `/trpc` vers le backend Node (`VITE_API_URL`, défaut `http://127.0.0.1:8787`).
- Tailwind CSS 4 passe par le plugin Vite `@tailwindcss/vite` et l'import CSS `@import "tailwindcss";`; il n'y a plus de configuration PostCSS dediee.
- Le build Vite segmente explicitement les chunks `react-core`, `tanstack-core`, `tanstack-query`, `supabase`, `forms`, `data-grid`, `ui-primitives`.

### Pattern d'acces donnees frontend

Le frontend est aujourd'hui hybride:

1. `@supabase/supabase-js` est utilise directement pour l'auth, le realtime et une partie importante des services de donnees.
2. Un client tRPC existe pour les endpoints exposes par le backend Node via `/trpc`.
3. TanStack Query centralise cache, invalidation, retry et orchestration des appels.

Autrement dit: le frontend ne repose pas sur une couche API unique. Le repo combine acces Supabase directs et appels tRPC selon les cas d'usage.

## Backend / API / data

### BaaS et base de donnees

| Element | Stack actuelle |
|---------|----------------|
| BaaS | Supabase |
| SGBD | PostgreSQL |
| Isolation multi-tenant | RLS par `agency_id` |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Migrations | SQL versionne dans `backend/migrations/` |

### Runtime Node

| Element | Version / etat |
|---------|-----------------|
| Runtime | Node.js 24 LTS |
| Package workspace | `backend/` (`@cir-cockpit/backend`) |
| Entrypoint | `backend/src/index.ts` |
| Serveur HTTP | Hono + `@hono/node-server` |
| Tests | Vitest Node |

### HTTP / API layer

| Technologie | Version | Role |
|-------------|---------|------|
| Hono | `4.13.0` | serveur HTTP Node |
| `@hono/node-server` | adapter Node officiel | |
| `@hono/trpc-server` | `0.4.2` | bridge Hono <-> tRPC |
| `@trpc/server` | `11.18.0` | procedures backend |
| `@trpc/client` | `11.18.0` cote frontend | client HTTP batche |

### Data access backend

| Technologie | Version | Role |
|-------------|---------|------|
| Drizzle ORM | `0.45.2` | queries SQL typees |
| `postgres` | `3.4.8` | driver SQL |
| Supabase JS backend | `2.112.3` épinglé | auth/admin clients et contexte utilisateur |
| Zod | `4.4.3` | validation input/output |
| `jose` | `5.9.6` | verification JWT via JWKS |
| `ai` | `7.0.66` | generateText, Output.object, erreurs structurees |
| `@ai-sdk/mistral` | `4.0.29` | provider Mistral direct |

### Architecture backend actuelle

- Processus Node unique, package `backend/`.
- `backend/src/index.ts` sert Hono via `@hono/node-server` et arrete le serveur proprement.
- `backend/src/app.ts` monte tRPC sur `/trpc/*` et expose `/health`.
- La configuration passe par `backend/src/config.ts` (Zod), pas par `process.env` disperse.
- Les erreurs passent par le middleware partage `handleError()` / `httpError()`.
- L'auth backend repose sur le header `Authorization: Bearer <token>`.
- Le backend combine:
  - client Supabase pour auth, contexte utilisateur et operations admin,
  - Drizzle ORM pour les queries metier PostgreSQL,
  - `AgentRuntime` + provider Mistral direct pour le vertical `pricing.references.watch.summarize`.

## Alignement runtime a maintenir

Hono et Zod sont epingles dans `backend/package.json`. Zod `4.4.3` reste aligne entre frontend, backend et shared.

## Shared layer

| Zone | Role |
|------|------|
| `shared/schemas/` | schemas Zod partages front/back |
| `shared/errors/` | catalog, types, fingerprint AppError |
| `shared/supabase.types.ts` | types Supabase generes |
| `shared/api/trpc.generated.d.ts` | projection cliente generee du routeur tRPC canonique |

Le routeur runtime reste defini dans `backend/src/trpc/router.ts`. `pnpm run contract:trpc:generate` en extrait automatiquement les procedures et leurs types publics; la projection n'embarque pas les schemas Zod ni les types internes des parsers. `pnpm run contract:trpc:check`, inclus dans les controles du repo, interdit qu'un contrat genere obsolete soit livre.

Cote frontend, `frontend/src/services/api/invokeTrpc.ts` est le seam unique d'invocation: il preserve les sorties inferees du client tRPC, valide chaque reponse externe avec le schema Zod partage et centralise la conversion des echecs en `AppError`. Les services ne conservent un adaptateur local que lorsqu'une transformation metier ou une compatibilite de payload est reellement necessaire.

## Tests, lint et QA

### Frontend

| Technologie | Version | Role |
|-------------|---------|------|
| Vitest | `4.1.10` | unit/integration tests |
| `@vitest/coverage-v8` | `4.1.10` | couverture |
| `@vitest/ui` | `4.1.10` | UI locale Vitest |
| Testing Library React | `16.3.2` résolu | tests composants |
| Testing Library user-event | `14.6.4` | interactions utilisateur |
| `@testing-library/jest-dom` | `6.9.1` résolu | matchers DOM |
| `vitest-axe` | `0.1.0` | assertions accessibilite |
| jsdom | `25.0.1` | environnement DOM de test |
| Playwright | `1.62.1` | E2E navigateur |

### Lint / typecheck

| Technologie | Version | Role |
|-------------|---------|------|
| ESLint | `9.39.2` | lint principal |
| `@eslint/js` | `9.39.2` | base rules |
| `typescript-eslint` | `8.67.0` | lint TypeScript |
| `eslint-plugin-react` | `7.37.5` | lint React |
| `eslint-plugin-react-hooks` | `7.0.1` | lint hooks |
| `eslint-plugin-jsx-a11y` | `6.10.2` | a11y lint |
| TypeScript backend | `5.9.3` | controle statique des sources Node |
| Vitest backend | `4.1.10` | tests unitaires Node |

### Execution des gates

- Docs/config: `pnpm run qa:docs`
- Frontend: `pnpm run qa:front`
- Backend: `pnpm run qa:back`
- Intermediaire large: `pnpm run qa:fast`
- Gate final local: `pnpm run qa` (parite distante ; aussi pre-push si une migration change)
- Gate CI PR et push `main`: workflow GitHub Actions `qa.yml` via `pnpm run qa:ci`

## Ce que le repo n'utilise pas comme socle principal

| Technologie | Statut |
|-------------|--------|
| Next.js | non utilise |
| Redux | non utilise |
| Prisma / TypeORM | non utilises |
| Axios comme client principal | non utilise |
| `framer-motion` | non utilise; le repo utilise `motion` |
| CI GitHub Actions obligatoire | utilise sur PR et push `main` avec gate `qa:ci` sans parite distante Supabase |

## Arborescence utile

```text
frontend/
  src/
    app/                 # router et bootstrap applicatif
    components/          # composants React
    hooks/               # hooks TanStack Query / UI
    services/            # acces Supabase / API / erreurs
    stores/              # Zustand
    lib/                 # utils transverses

shared/
  schemas/               # Zod partage
  errors/                # AppError partage
  supabase.types.ts      # types generes

backend/
  src/                   # API Node Hono + tRPC
  drizzle/               # schema Drizzle
  migrations/            # SQL versionne
  tests/                 # probes SQL d invariants
```

## Regle de maintenance de cette page

Mettre a jour cette page a chaque changement de:

1. version de dependance structurelle,
2. outil de build ou de test,
3. mode d'appel front <-> back,
4. runtime backend Node ou contrat tRPC.
