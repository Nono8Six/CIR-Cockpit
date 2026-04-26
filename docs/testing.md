# Guide de tests

Reference QA: `docs/qa-runbook.md` (ordre strict de validation avant livraison).

## Pyramide de tests

Ordre de priorite:
1. Unitaires (services/helpers/shared schemas)
2. Hooks React (TanStack Query, logique de formulaire, orchestration UI)
3. Composants React
4. E2E Playwright

Regle projet:
1. Couvrir happy path et error path.
2. Eviter les mocks sur la logique metier.
3. Mocker uniquement les dependances externes (reseau, SDK, API).

## Commandes par couche

Depuis la racine:

```bash
pnpm run qa:fast
pnpm run qa
```

Frontend (`frontend/`):

```bash
pnpm run typecheck
pnpm run lint -- --max-warnings=0
pnpm run test:run
pnpm run test:coverage
pnpm run check:error-compliance
pnpm run build
```

Backend (racine):

```bash
deno lint backend/functions/api
deno check --config backend/deno.json backend/functions/api/index.ts
deno test --allow-env --no-check --config backend/deno.json backend/functions/api
```

E2E (frontend):

```bash
pnpm run test:e2e
```

## Conventions de nommage

1. Frontend unit/component tests: `frontend/src/**/__tests__/*.test.ts(x)`
2. Backend tests: `backend/functions/api/**/*_test.ts`
3. E2E: `frontend/e2e/*.spec.ts`
4. Utiliser des noms de tests descriptifs (verbe + resultat attendu).

## Politique de mocks

Autorise:
1. Mocks des appels externes (Supabase client, HTTP, horloge, random, APIs tierces).
2. Stubs d'environnement (`process.env`, sessions E2E) quand necessaire.

Interdit:
1. Mocker la logique metier interne pour "faire passer" un test.
2. Remplacer un service metier complet par une valeur hardcodee.
3. Introduire des donnees fake en production pour simplifier les tests.

## Setup E2E

Pre-requis:
1. Installer les dependances frontend: `pnpm --dir frontend install`
2. Installer Playwright: `cd frontend && npx playwright install`
3. Configurer `frontend/.env.e2e` (non versionne):
   - `E2E_USER_EMAIL`
   - `E2E_USER_PASSWORD`
   - `E2E_ADMIN_EMAIL`
   - `E2E_ADMIN_PASSWORD`
   - `PLAYWRIGHT_BASE_URL` (optionnel, sinon `http://localhost:3000`)

Comportement config:
1. `frontend/playwright.config.ts` lit `.env.e2e` si present.
2. Si `PLAYWRIGHT_BASE_URL` est absent, Playwright demarre `pnpm run dev`.

## Coverage thresholds et verification

Source de verite: `frontend/vitest.config.ts`.

Seuils globaux et scopes principaux:
1. Seuil global minimal: `55/50/50/58` sur statements/branches/functions/lines.
2. Domaines critiques `src/services/admin/**`, `src/services/agency/**`, `src/services/api/**`, `src/services/auth/**`, `src/services/entities/**`, `src/services/errors/**`: `80/70/80/80`.
3. Thresholds specifiques definis pour des groupes de hooks, composants UI et utilitaires cibles.
4. Inclusion coverage definie via `coverage.include` et exclusions via `coverage.exclude`.

Verification:
1. Executer `pnpm --dir frontend run test:coverage`.
2. Lire le resume terminal (echec bloquant si seuil non respecte).
3. Consulter `frontend/coverage/` (HTML + lcov) pour les details.

## CI/CD et execution locale

Le workflow GitHub Actions `.github/workflows/qa.yml` est actif sur pull request et `workflow_dispatch`.
Il installe pnpm, Node, Deno, prepare `backend/.env` depuis l'exemple si necessaire, puis lance `pnpm run qa`.
La validation locale reste bloquante via `pnpm run qa` et `docs/qa-runbook.md`; un check CI vert ne remplace pas le rapport QA manuel demande par le runbook.
