# Stack Technique - CIR Cockpit

> Reference documentaire de la stack du projet.
> Derniere mise a jour: 2026-08-06
> Etat verifie contre les manifests et configs du repo.

## Resume executif

- Frontend: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 4, shadcn/ui + Radix UI, TanStack Router, TanStack Query, React Hook Form + Zod, TanStack Table, Motion, Sonner, Supabase JS.
- Backend: Supabase (Postgres + Auth + Realtime), Edge Function Deno unique `api`, Hono + tRPC, Drizzle ORM + `postgres`, `jose` pour la verification JWT.
- Qualite: `pnpm` workspace, ESLint 9, Vitest 4, Playwright, Husky, lint-staged, gates locales par impact (`qa:docs`, `qa:front`, `qa:back`, `qa:fast`, `qa`), gate CI dediee `qa:ci`, workflow GitHub Actions `qa.yml`.

## Sources de verite

Cette page doit suivre en priorite:

1. `package.json`
2. `frontend/package.json`
3. `pnpm-lock.yaml`
4. `backend/deno.json`
5. `deno.json`
6. `supabase/config.toml`
7. `frontend/vite.config.ts`
8. `frontend/vitest.config.ts`
9. `frontend/playwright.config.ts`
10. `.github/workflows/qa.yml`

## Workspace et outillage racine

| Element | Version / etat | Source |
|---------|-----------------|--------|
| Node.js local + CI | `24.14.0` | runtime local, `.github/workflows/qa.yml` |
| Deno local + CI | `2.5.6` | runtime local, `.github/workflows/qa.yml` |
| Package manager | `pnpm@10.33.0` | `package.json` |
| Workspace | `frontend`, `shared` | `pnpm-workspace.yaml` |
| Git hooks | Husky `9.1.7` | `package.json` |
| Pre-commit cible | lint-staged `15.5.2` | `package.json` |
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
| React | `19.2.4` | UI runtime |
| React DOM | `19.2.4` | rendu DOM |
| Vite | `7.3.6` | dev server + build |
| TypeScript | `5.9.3` | typage strict |
| Tailwind CSS | `4.1.18` | styling utilitaire |
| `@tailwindcss/vite` | `4.1.18` | integration Vite |

### Navigation, state et data fetching

| Technologie | Version | Role |
|-------------|---------|------|
| TanStack Router | `1.170.20` | routing SPA |
| TanStack Query | `5.90.21` | cache, queries, mutations |
| Zustand | `5.0.11` | store d'erreurs |
| Supabase JS frontend | `2.97.0` résolu (`^2.95.3` déclaré) | auth, realtime, acces donnees et API |

### Formulaires et validation

| Technologie | Version | Role |
|-------------|---------|------|
| React Hook Form | `7.71.1` | formulaires |
| `@hookform/resolvers` | `5.2.2` | bridge RHF + Zod |
| Zod | `4.3.6` | validation partagee front/back |

### UI, composants et UX

| Technologie | Version | Role |
|-------------|---------|------|
| shadcn/ui | config repo | primitives UI |
| Radix UI | packages `@radix-ui/react-*` | accessibilite / primitives headless |
| TanStack Table | `8.21.3` | tables riches |
| Motion | `12.35.2` | animations UI |
| Sonner | `2.0.7` | notifications |
| Lucide React | `0.564.0` | icones |
| `react-error-boundary` | `6.1.1` résolu | error boundary |
| `react-day-picker` | `9.13.2` résolu | calendrier |
| `cmdk` | `1.1.1` | command palette / recherche |
| `class-variance-authority` | `0.7.1` | variants Tailwind |
| `clsx` | `2.1.1` | composition de classes |
| `tailwind-merge` | `3.4.0` | merge de classes Tailwind |
| `@stepperize/react` | `6.1.0` | stepper UI |

### Utilitaires metier

| Technologie | Version | Role |
|-------------|---------|------|
| date-fns | `4.1.0` | dates |
| neverthrow | `8.2.0` | result/error ergonomics |

### Architecture frontend actuelle

- Application SPA Vite servie en local sur le port `3000`.
- Alias actifs: `@/*` vers `frontend/src/*`, `shared/*` vers `../shared/*`.
- Le dev server proxy `/functions/v1` vers `VITE_SUPABASE_URL`.
- Tailwind CSS 4 passe par le plugin Vite `@tailwindcss/vite` et l'import CSS `@import "tailwindcss";`; il n'y a plus de configuration PostCSS dediee.
- Le build Vite segmente explicitement les chunks `react-core`, `tanstack-core`, `tanstack-query`, `supabase`, `forms`, `data-grid`, `calendar`, `ui-primitives`.

### Pattern d'acces donnees frontend

Le frontend est aujourd'hui hybride:

1. `@supabase/supabase-js` est utilise directement pour l'auth, le realtime et une partie importante des services de donnees.
2. Un client tRPC existe pour les endpoints exposes par l'Edge Function `api` via `/functions/v1/api/trpc`.
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

### Runtime Edge Function

| Element | Version / etat |
|---------|-----------------|
| Runtime | Deno |
| Fonction principale | `backend/functions/api/` |
| Wrapper CLI Supabase | `supabase/functions/api/index.ts` |
| Entrypoint runtime | `backend/functions/api/index.ts` |
| `verify_jwt` dashboard/CLI | `false` dans `supabase/config.toml` |

### HTTP / API layer

| Technologie | Version | Role |
|-------------|---------|------|
| Hono | `4.12.4` en local | serveur HTTP de l'Edge Function |
| `@hono/trpc-server` | `0.4.0` | bridge Hono <-> tRPC |
| `@trpc/server` | `11.10.0` | procedures backend |
| `@trpc/client` | `11.10.0` cote frontend | client HTTP batche |

### Data access backend

| Technologie | Version | Role |
|-------------|---------|------|
| Drizzle ORM | `0.45.1` | queries SQL typees |
| `postgres` | `3.4.8` | driver SQL |
| Supabase JS backend | `2.95.3` épinglé | auth/admin clients et contexte utilisateur via import map Deno |
| Zod | `4.3.6` | validation input/output |
| `jose` | `5.9.6` | verification JWT via JWKS |

### Architecture backend actuelle

- Edge Function unique `api`.
- `backend/functions/api/index.ts` normalise les prefixes `/functions/v1/api` et `/api`, puis delegue a Hono.
- `backend/functions/api/app.ts` monte tRPC sur `/trpc/*`.
- Les erreurs passent par le middleware partage `handleError()` / `httpError()`.
- L'auth backend repose sur le header `Authorization: Bearer <token>`.
- Le backend combine:
  - client Supabase pour auth, contexte utilisateur et operations admin,
  - Drizzle ORM pour les queries metier PostgreSQL.

## Alignement runtime a maintenir

Le repo maintient la meme version Hono pour:

| Fichier | Hono |
|---------|------|
| `backend/deno.json` | `4.12.4` |
| `deno.json` | `4.12.4` |

Cet alignement est verifie par `pnpm run repo:check`.

## Shared layer

| Zone | Role |
|------|------|
| `shared/schemas/` | schemas Zod partages front/back |
| `shared/errors/` | catalog, types, fingerprint AppError |
| `shared/supabase.types.ts` | types Supabase generes |

## Tests, lint et QA

### Frontend

| Technologie | Version | Role |
|-------------|---------|------|
| Vitest | `4.1.8` | unit/integration tests |
| `@vitest/coverage-v8` | `4.1.8` | couverture |
| `@vitest/ui` | `4.1.8` | UI locale Vitest |
| Testing Library React | `16.3.2` résolu | tests composants |
| Testing Library user-event | `14.6.1` | interactions utilisateur |
| `@testing-library/jest-dom` | `6.9.1` résolu | matchers DOM |
| `vitest-axe` | `0.1.0` | assertions accessibilite |
| jsdom | `25.0.1` | environnement DOM de test |
| Playwright | `1.58.2` | E2E navigateur |

### Lint / typecheck

| Technologie | Version | Role |
|-------------|---------|------|
| ESLint | `9.39.2` | lint principal |
| `@eslint/js` | `9.39.2` | base rules |
| `typescript-eslint` | `8.53.1` | lint TypeScript |
| `eslint-plugin-react` | `7.37.5` | lint React |
| `eslint-plugin-react-hooks` | `7.0.1` | lint hooks |
| `eslint-plugin-jsx-a11y` | `6.10.2` | a11y lint |
| Deno lint | runtime Deno | lint backend |
| Deno check | runtime Deno | typecheck backend |

### Execution des gates

- Docs/config: `pnpm run qa:docs`
- Frontend: `pnpm run qa:front`
- Backend: `pnpm run qa:back`
- Intermediaire large: `pnpm run qa:fast`
- Gate final local: `pnpm run qa`
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
  functions/api/         # Edge Function Hono + tRPC
  migrations/            # SQL versionne

supabase/
  functions/api/         # wrapper CLI de deploy
```

## Regle de maintenance de cette page

Mettre a jour cette page a chaque changement de:

1. version de dependance structurelle,
2. outil de build ou de test,
3. mode d'appel front <-> back,
4. runtime Edge Function ou import map de deploiement.
