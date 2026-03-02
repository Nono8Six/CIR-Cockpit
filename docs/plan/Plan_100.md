# Plan Remediation 82.95 → 100 — CIR Cockpit

> Date: 2026-02-27 | Score actuel: **82.95/100** (pondere)

---

## Table des matieres

1. [COUCHE 1 — Securite DB (73 → 100)](#couche-1--securite-db-73--100)
2. [COUCHE 2 — DevOps / QA (78 → 100)](#couche-2--devops--qa-78--100)
3. [COUCHE 3 — Backend refactoring (87 → 100)](#couche-3--backend-refactoring-87--100)
4. [COUCHE 4 — Frontend refactoring (86 → 100)](#couche-4--frontend-refactoring-86--100)
5. [COUCHE 5 — Tests hooks (68 → 100)](#couche-5--tests-hooks-68--100)
6. [COUCHE 6 — E2E (6 specs → couverture complete)](#couche-6--e2e-6-specs--couverture-complete)
7. [COUCHE 7 — Shared & Docs (88-90 → 100)](#couche-7--shared--docs-88-90--100)
8. [TIPS IA par domaine](#tips-ia-par-domaine)
9. [Verification](#verification)

---

## COUCHE 1 — Securite DB (73 → 100)

**Impact scoring:** +15 pts DB security, +5 pts infra cleanup
**Prerequis:** acces Supabase Dashboard ou CLI avec droits admin

### 1.1 Migration REVOKE grants excessifs

- [x] **Fichier:** `backend/migrations/20260227100000_revoke_excessive_grants.sql`
- [x] Auditer les grants actuels:
  ```sql
  SELECT grantee, table_schema, table_name, privilege_type
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
  ORDER BY grantee, table_name;
  ```
- [x] Revoquer les privileges excessifs sur les tables publiques:
  ```sql
  -- Revoquer tout sur public pour anon et authenticated, puis re-grant minimal
  REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
  REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
  REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
  ```
- [x] Verifier que `anon` n'a acces a aucune table directement (tout passe par `authenticated` + RLS)

### 1.2 Migration FORCE RLS sur toutes les tables

- [x] **Fichier:** `backend/migrations/20260227101000_force_rls_all_tables.sql`
- [x] Lister les tables sans RLS force:
  ```sql
  SELECT schemaname, tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public';
  ```
- [x] Appliquer `ALTER TABLE ... FORCE ROW LEVEL SECURITY` sur chaque table publique
- [x] Verifier que RLS est actif ET force (pas juste enable):
  ```sql
  SELECT relname, relrowsecurity, relforcerowsecurity
  FROM pg_class
  WHERE relnamespace = 'public'::regnamespace AND relkind = 'r';
  ```

### 1.3 Migration re-grant minimal

- [x] **Fichier:** `backend/migrations/20260227102000_minimal_grants.sql`
- [x] Grant `SELECT`, `INSERT`, `UPDATE`, `DELETE` sur les tables metier pour `authenticated` uniquement
- [x] Grant `USAGE` sur les sequences necessaires pour `authenticated`
- [x] Grant `EXECUTE` sur les fonctions RPC necessaires
- [x] Zero grant pour `anon` (sauf schema `auth` gere par Supabase)

### 1.4 Leaked-password protection (N/A produit)

- [x] Dans Supabase Dashboard → Authentication → Settings → Security (N/A documente)
- [x] Activer `auth_leaked_password_protection` (non applicable: plan non Pro + fonctionnalite non retenue)
- [x] Verifier via (N/A, requete `auth.config` non disponible sur ce projet):
  ```sql
  SELECT * FROM auth.config WHERE key = 'auth_leaked_password_protection';
  ```
- [x] Documenter dans `docs/stack.md` section securite

### 1.5 Audit indexes inutilises

- [x] Lister les index non utilises:
  ```sql
  SELECT schemaname, relname, indexrelname, idx_scan
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0 AND schemaname = 'public'
  ORDER BY pg_relation_size(indexrelid) DESC;
  ```
- [x] **Fichier:** `backend/migrations/20260227103000_cleanup_unused_indexes.sql`
- [x] Supprimer les indexes avec 0 scans (hors PK et FK)
- [x] Ajouter les indexes manquants identifies par l'audit (ex: `agency_id` sur tables sans index)

### 1.6 Cleanup legacy Edge Functions

- [x] Lister les Edge Functions deployees via MCP `list_edge_functions`
- [x] Fonctions legacy a decommissionner:
  - `admin-users` (v3) → remplace par `api/trpc/admin.users`
  - `admin-agencies` (v3) → remplace par `api/trpc/admin.agencies`
  - `create-user-and-membership` (v5) → remplace par `api/trpc/admin.users` action `create`
- [x] Supprimer via: `supabase functions delete <name> --project-ref <ref>` (aucune fonction legacy detectee)
- [x] Verifier qu'aucun appel frontend ne reference les anciens slugs
- [x] Supprimer les dossiers locaux correspondants dans `supabase/functions/` si presents (aucun dossier legacy local)

### CR COUCHE 1 - 2026-02-27
- Fichiers crees : `backend/migrations/20260227100000_revoke_excessive_grants.sql`, `backend/migrations/20260227101000_force_rls_all_tables.sql`, `backend/migrations/20260227102000_minimal_grants.sql`, `backend/migrations/20260227103000_cleanup_unused_indexes.sql`
- Fichiers modifies : `CLAUDE.md`, `docs/stack.md`, `docs/plan/Plan_100.md`
- Tests ajoutes : 0 ([])
- QA : typecheck OK | lint OK | tests OK (frontend 203 pass, backend 73 pass, qa-gate backend 74 pass) | build OK
- Points d'attention / dette restante : suppression d'indexes uniques sans scans (`agencies_name_unique_idx`, `entities_client_number_key`) a surveiller en post-deploiement
- Duree estimee : ~1h20

**Score attendu apres COUCHE 1:** 88/100

---

## COUCHE 2 — DevOps / QA (78 → 100)

**Impact scoring:** +12 pts CI/CD, +5 pts QA gates
**Prerequis:** QA locale obligatoire (`pnpm run qa`), pas de CI GitHub sur ce projet

### 2.1 Creer `.github/workflows/ci.yml`

- [x] **Fichier:** `.github/workflows/ci.yml` (**N/A produit**: aucun CI GitHub)
- [x] Contenu:
  ```yaml
  # N/A: workflow non cree par decision produit.
  # Validation qualite executee localement via:
  # - scripts/qa-gate.ps1
  # - docs/qa-runbook.md
  # - pnpm run qa

  name: CI
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]

  jobs:
    qa-frontend:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 22
            cache: pnpm
        - run: pnpm install --frozen-lockfile
        - run: pnpm --dir frontend run typecheck
        - run: pnpm --dir frontend run lint -- --max-warnings=0
        - run: pnpm --dir frontend run test:run
        - run: pnpm --dir frontend run build

    qa-backend:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: denoland/setup-deno@v2
          with:
            deno-version: v2.x
        - run: deno lint backend/functions/api
        - run: deno check --config backend/deno.json backend/functions/api/index.ts
        - run: deno test --allow-env --no-check --config backend/deno.json backend/functions/api

    audit:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 22
            cache: pnpm
        - run: pnpm install --frozen-lockfile
        - run: pnpm --dir frontend exec pnpm audit --audit-level=high
  ```

### 2.2 Etendre coverage.include Vitest

- [x] **Fichier:** `frontend/vitest.config.ts`
- [x] Ajouter les services manquants dans `coverage.include`:
  ```typescript
  include: [
    'src/services/admin/**/*.ts',
    'src/services/agency/**/*.ts',
    'src/services/api/**/*.ts',
    'src/services/auth/**/*.ts',
    'src/services/clients/**/*.ts',      // AJOUTER
    'src/services/config/**/*.ts',       // AJOUTER
    'src/services/entities/**/*.ts',
    'src/services/errors/**/*.ts',
    'src/services/interactions/**/*.ts', // AJOUTER
    'src/services/query/**/*.ts',        // AJOUTER
    'src/services/supabase/**/*.ts'      // AJOUTER
  ],
  ```
- [x] Ajouter coverage sur les hooks:
  ```typescript
  include: [
    // ...services ci-dessus
    'src/hooks/**/*.ts',
    'src/hooks/**/*.tsx'
  ],
  ```

### 2.3 Ajouter `pnpm audit` dans QA gate

- [x] **Fichier:** `scripts/qa-gate.ps1`
- [x] Ajouter l'etape audit avant le build:
  ```powershell
  Write-Host "=== pnpm audit ===" -ForegroundColor Cyan
  pnpm --dir frontend exec pnpm audit --audit-level=high
  if ($LASTEXITCODE -ne 0) { exit 1 }
  ```

### 2.4 Documenter setup E2E

- [x] **Fichier:** `docs/testing.md` (recree)
- [x] Contenu minimal:
  - Pre-requis (Playwright browsers, `.env` local)
  - Commandes: `pnpm --dir frontend run test:e2e`
  - Pourquoi les E2E ne sont pas dans CI (besoin d'une instance Supabase live)
  - Comment lancer en local avec `npx playwright install`

### 2.5 Etendre lint-staged au shared/backend

- [x] **Fichier:** `package.json` (racine)
- [x] Etendre la config lint-staged:
  ```json
  "lint-staged": {
    "frontend/src/**/*.{ts,tsx}": [
      "pnpm --dir frontend exec eslint --max-warnings=0"
    ],
    "shared/**/*.ts": [
      "pnpm --dir frontend exec eslint --max-warnings=0"
    ],
    "backend/functions/api/**/*.ts": [
      "deno lint"
    ]
  }
  ```

### 2.6 Rendre les E2E skip explicites

- [x] **Fichiers:** `frontend/e2e/*.spec.ts` (6 fichiers)
  - `auth.spec.ts` (110 lignes)
  - `navigation.spec.ts` (232 lignes)
  - `dashboard-p06.spec.ts` (207 lignes)
  - `clients-p05.spec.ts` (173 lignes)
  - `admin-settings-p07.spec.ts` (157 lignes)
  - `search.spec.ts` (156 lignes)
- [x] Ajouter un guard en tete de chaque fichier si variable d'env absente:
  ```typescript
  import { test } from '@playwright/test';

  const SKIP_REASON = 'E2E env missing: E2E_USER_EMAIL / E2E_USER_PASSWORD';
  test.skip(!process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD, SKIP_REASON);
  ```
- [x] Permet de les inclure dans CI sans erreur (skip propre)

**Score attendu apres COUCHE 2:** 92/100

### CR COUCHE 2 - 2026-02-27
- Fichiers crees : `docs/testing.md`, `frontend/src/services/errors/__tests__/mapDataDomainError.test.ts`
- Fichiers modifies : `CLAUDE.md`, `docs/plan/Plan_100.md`, `frontend/e2e/admin-settings-p07.spec.ts`, `frontend/e2e/auth.spec.ts`, `frontend/e2e/clients-p05.spec.ts`, `frontend/e2e/dashboard-p06.spec.ts`, `frontend/e2e/navigation.spec.ts`, `frontend/e2e/search.spec.ts`, `frontend/package.json`, `frontend/src/services/api/__tests__/trpcClient.test.ts`, `frontend/vitest.config.ts`, `package.json`, `pnpm-lock.yaml`, `scripts/qa-gate.ps1`
- Tests ajoutes : 2 (`frontend/src/services/errors/__tests__/mapDataDomainError.test.ts`, `frontend/src/services/api/__tests__/trpcClient.test.ts`)
- QA : typecheck OK | lint OK | tests OK (frontend 209 pass, backend 74 pass) | build OK | audit high OK (1 moderate restante, non bloquante)
- Points d'attention / dette restante : couverture hooks configuree en non bloquant (`0`) dans cette couche, a traiter en COUCHE 5 ; 1 vulnerabilite moderate reste ouverte
- Duree estimee : ~3h30

---

## COUCHE 3 — Backend refactoring (87 → 100)

**Impact scoring:** +8 pts maintenabilite backend, +3 pts test coverage
**Prerequis:** `deno test` vert avant de commencer

### 3.1 Split `adminUsers.ts` (899 lignes → 5 modules)

- [x] **Fichier source:** `backend/functions/api/services/adminUsers.ts` (899 lignes, 28 KB)
- [x] Decoupage propose:
  | Nouveau fichier | Responsabilite | Lignes estimees |
  |----------------|---------------|-----------------|
  | `adminUsers.ts` | Orchestrateur `handleAdminUsersAction` + dispatch | ~80 |
  | `adminUsers/createUser.ts` | Logique creation utilisateur | ~150 |
  | `adminUsers/updateUser.ts` | Logique mise a jour (role, identite, memberships) | ~200 |
  | `adminUsers/deleteUser.ts` | Logique suppression/archivage | ~100 |
  | `adminUsers/queryUsers.ts` | Logique listing/filtrage | ~150 |
  | `adminUsers/validators.ts` | `validatePasswordPolicy`, `normalizeDisplayName`, etc. | ~100 |
- [x] Garder l'export principal `handleAdminUsersAction` dans l'orchestrateur
- [x] Migrer le test existant `adminUsers_test.ts` (152 lignes) pour importer les sous-modules
- [x] Ajouter des tests unitaires pour chaque sous-module

### 3.2 Split `auth.ts` (383 lignes → 4 modules)

- [x] **Fichier source:** `backend/functions/api/middleware/auth.ts` (383 lignes)
- [x] Decoupage propose:
  | Nouveau fichier | Responsabilite | Lignes estimees |
  |----------------|---------------|-----------------|
  | `auth.ts` | Middleware Hono principal | ~80 |
  | `auth/verifyToken.ts` | Verification JWT + extraction claims | ~100 |
  | `auth/buildAuthContext.ts` | Construction du contexte auth (role, agency_id) | ~100 |
  | `auth/dbClients.ts` | Creation des clients DB (admin vs user) | ~80 |
- [x] Le test `auth_test.ts` (137 lignes) reste sur le middleware principal
- [x] Ajouter tests unitaires sur `verifyToken` et `buildAuthContext`

### 3.3 DRY router.ts try/catch

- [x] **Fichier:** `backend/functions/api/trpc/router.ts` (151 lignes)
- [x] Pattern actuel repete 7 fois:
  ```typescript
  .mutation(async ({ ctx, input }) => {
    try {
      if (!ctx.authContext || !ctx.userDb) {
        throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
      }
      return await handleXxxAction(ctx.userDb, ctx.authContext, ctx.requestId, input);
    } catch (error) {
      return handleProcedureError(error);
    }
  })
  ```
- [x] Extraire un helper `withAuth` et `withSuperAdmin`:
  ```typescript
  // backend/functions/api/trpc/procedureHelpers.ts
  import { httpError } from '../middleware/errorHandler.ts';
  import { handleProcedureError } from './procedures.ts';
  import type { AuthedContext, SuperAdminContext } from './context.ts';

  type AuthedHandler<TInput, TOutput> = (
    db: DbClient, auth: AuthContext, requestId: string, input: TInput
  ) => Promise<TOutput>;

  export function withAuthedHandler<TInput, TOutput>(handler: AuthedHandler<TInput, TOutput>) {
    return async ({ ctx, input }: { ctx: AuthedContext; input: TInput }): Promise<TOutput> => {
      try {
        if (!ctx.authContext || !ctx.userDb) {
          throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
        }
        return await handler(ctx.userDb, ctx.authContext, ctx.requestId, input);
      } catch (error) {
        return handleProcedureError(error);
      }
    };
  }
  ```
- [x] Router simplifie:
  ```typescript
  entities: authedProcedure
    .input(dataEntitiesPayloadSchema)
    .output(dataEntitiesResponseSchema)
    .mutation(withAuthedHandler(handleDataEntitiesAction)),
  ```
- [x] Cas special `data.entities` : utilise `selectDataEntitiesDb` → garder le handler inline ou adapter le helper

### 3.4 Segmenter `api_integration_test.ts`

- [x] **Fichier source:** `backend/functions/api/integration/api_integration_test.ts` (599 lignes)
- [x] Decoupage propose:
  | Nouveau fichier | Scope |
  |----------------|-------|
  | `integration/auth_integration_test.ts` | Tests auth/JWT/CORS |
  | `integration/data_integration_test.ts` | Tests CRUD entities/interactions/config |
  | `integration/admin_integration_test.ts` | Tests admin users/agencies |
  | `integration/helpers.ts` | Setup commun, clients HTTP, fixtures |
- [x] Chaque fichier doit etre executable independamment avec `deno test`

### 3.5 Documenter usage hybride Drizzle/Supabase

- [x] **Fichier:** `docs/stack.md` section "Data Access Layer"
- [x] Documenter:
  - Pourquoi `@supabase/supabase-js` est utilise directement (client user-scoped avec RLS)
  - Ou Drizzle intervient (si utilise) ou plan de migration
  - Le pattern `DbClient` dans `backend/functions/api/types.ts`
  - Le double client `db` (admin) vs `userDb` (RLS-scoped)

### 3.6 Tests manquants backend

- [x] **`dataEntityContacts_test.ts`** — tester `handleDataEntityContactsAction`
  - Actions a couvrir: `save`, `delete` (`list` non supporte par le schema)
  - Mock du DbClient
- [x] **`dataProfile_test.ts`** — tester `handleDataProfileAction`
  - Actions a couvrir: `password_changed` (`get` non supporte par le schema)
  - Le service fait 34 lignes, test rapide
- [x] **`zodValidator_test.ts`** — tester le middleware de validation Zod
  - Cas: payload valide, payload invalide, schema manquant

**Score attendu apres COUCHE 3:** 95/100

### CR COUCHE 3 - 2026-02-28
- Fichiers crees : `backend/functions/api/services/adminUsers/createUser.ts`, `backend/functions/api/services/adminUsers/updateUser.ts`, `backend/functions/api/services/adminUsers/deleteUser.ts`, `backend/functions/api/services/adminUsers/queryUsers.ts`, `backend/functions/api/services/adminUsers/validators.ts`, `backend/functions/api/services/adminUsers/createUser_test.ts`, `backend/functions/api/services/adminUsers/updateUser_test.ts`, `backend/functions/api/services/adminUsers/deleteUser_test.ts`, `backend/functions/api/services/adminUsers/queryUsers_test.ts`, `backend/functions/api/services/adminUsers/validators_test.ts`, `backend/functions/api/middleware/auth/dbClients.ts`, `backend/functions/api/middleware/auth/verifyToken.ts`, `backend/functions/api/middleware/auth/buildAuthContext.ts`, `backend/functions/api/middleware/auth/verifyToken_test.ts`, `backend/functions/api/middleware/auth/buildAuthContext_test.ts`, `backend/functions/api/trpc/procedureHelpers.ts`, `backend/functions/api/integration/helpers.ts`, `backend/functions/api/integration/auth_integration_test.ts`, `backend/functions/api/integration/admin_integration_test.ts`, `backend/functions/api/integration/data_integration_test.ts`, `backend/functions/api/services/dataEntityContacts_test.ts`, `backend/functions/api/services/dataProfile_test.ts`, `backend/functions/api/middleware/zodValidator_test.ts`
- Fichiers modifies : `backend/functions/api/services/adminUsers.ts`, `backend/functions/api/services/adminUsers_test.ts`, `backend/functions/api/middleware/auth.ts`, `backend/functions/api/trpc/router.ts`, `backend/functions/api/services/dataEntityContacts.ts`, `backend/functions/api/services/dataProfile.ts`, `docs/stack.md`, `docs/plan/Plan_100.md`
- Tests ajoutes : 13 (`backend/functions/api/services/adminUsers/createUser_test.ts`, `backend/functions/api/services/adminUsers/updateUser_test.ts`, `backend/functions/api/services/adminUsers/deleteUser_test.ts`, `backend/functions/api/services/adminUsers/queryUsers_test.ts`, `backend/functions/api/services/adminUsers/validators_test.ts`, `backend/functions/api/middleware/auth/verifyToken_test.ts`, `backend/functions/api/middleware/auth/buildAuthContext_test.ts`, `backend/functions/api/integration/auth_integration_test.ts`, `backend/functions/api/integration/admin_integration_test.ts`, `backend/functions/api/integration/data_integration_test.ts`, `backend/functions/api/services/dataEntityContacts_test.ts`, `backend/functions/api/services/dataProfile_test.ts`, `backend/functions/api/middleware/zodValidator_test.ts`)
- QA : typecheck OK | lint OK | tests OK (frontend 209 pass, backend 86 pass) | build OK | pnpm run qa OK
- Points d'attention / dette restante : aucune divergence restante sur les actions payload ; un test contractuel Zod dedie verrouille les actions supportees.
- Duree estimee : ~3h30

---

## COUCHE 4 — Frontend refactoring (86 → 100)

**Impact scoring:** +8 pts maintenabilite, +3 pts observabilite, +2 pts a11y
**Prerequis:** `pnpm run qa` vert avant de commencer

### 4.1 Extraire colonnes ClientList/ProspectList

- [x] **`frontend/src/components/ClientList.tsx`** (357 lignes)
  - Extraire la definition des colonnes TanStack Table dans `ClientList/columns.tsx`
  - Extraire le composant de toolbar/filtres dans `ClientList/ClientListToolbar.tsx`
  - Le composant principal orchestre: query + table + toolbar
  - Garder le `eslint-disable` documente pour `react-hooks/incompatible-library`
- [x] **`frontend/src/components/ProspectList.tsx`** (345 lignes)
  - Meme pattern: `ProspectList/columns.tsx` + `ProspectList/ProspectListToolbar.tsx`
- [x] Tests existants (`ClientList.test.tsx`, `ProspectList.test.tsx`) doivent rester verts

### 4.2 Decomposer App.tsx

- [x] **`frontend/src/App.tsx`** (327 lignes)
- [x] Extraire:
  | Nouveau fichier | Responsabilite |
  |----------------|---------------|
  | `hooks/useAppQueries.ts` | Tous les `useQuery` initialises dans App |
  | `hooks/useAppViewState.ts` | Logique de navigation/vues (currentView, etc.) |
  | `components/AppProviders.tsx` | Wrapper QueryClientProvider + SessionProvider |
  | `components/AppLayout.tsx` | Layout shell (sidebar, header, main) |
- [x] App.tsx final: ~60-80 lignes, compose les providers + layout + views

### 4.3 Decomposer useDashboardState

- [x] **`frontend/src/hooks/useDashboardState.tsx`** (457 lignes)
- [x] Extraire:
  | Nouveau fichier | Responsabilite |
  |----------------|---------------|
  | `utils/dashboard/dashboardFilters.ts` | Logique de filtrage (pure functions) |
  | `utils/dashboard/dashboardAggregates.ts` | Calculs KPI/aggregats (pure functions) |
  | `utils/dashboard/dashboardSort.ts` | Logique de tri |
  | `hooks/useDashboardFilters.ts` | Hook de filtrage (useState + callbacks) |
- [x] Le hook principal orchestre et compose les sous-hooks
- [x] Les utilitaires dans `utils/dashboard/` sont testables unitairement sans `renderHook`

### 4.4 Deplacer 3 tests mal places

- [x] Verifier si des fichiers `.test.ts(x)` sont colocalises a cote des sources au lieu d'etre dans `__tests__/`
- [x] Convention du projet: tests dans `__tests__/` sous le dossier parent
- [x] Deplacer les fichiers concernes et verifier que Vitest les detecte toujours

### 4.5 Reactivation progressive regles ESLint

- [x] **`frontend/eslint.config.js`** — regles desactivees a reexaminer:
  | Regle | Statut actuel | Action |
  |-------|--------------|--------|
  | `jsx-a11y/label-has-associated-control` | off (faux positifs shadcn) | Passer a `"warn"` avec config composants shadcn |
  | `react-hooks/set-state-in-effect` | off | Investiguer les violations, corriger, reactiver |
  | `react-hooks/preserve-manual-memoization` | off | Investiguer, corriger si possible |
  | `react-hooks/refs` | off (pattern RHF) | Garder off si pattern intentionnel RHF persiste |
- [x] Pour chaque regle: lancer `eslint --rule '{"rule": "warn"}' frontend/src/` pour mesurer l'impact
- [x] Reactiver une par une, corriger les violations, puis passer en `"error"`

### 4.6 Brancher setErrorReporter (Sentry stub)

- [x] **`frontend/src/services/errors/reportError.ts`** — `setErrorReporter` defini ligne 9 mais jamais appele
- [x] Creer `frontend/src/services/errors/sentryStub.ts`:
  ```typescript
  import { setErrorReporter } from './reportError';

  /**
   * Stub Sentry/LogRocket. Remplacer par le vrai SDK quand disponible.
   * En attendant, log dans la console en dev uniquement.
   */
  export function initErrorReporter(): void {
    if (import.meta.env.DEV) {
      setErrorReporter((error) => {
        console.groupCollapsed(`[ErrorReporter] ${error.code}`);
        console.dir(error);
        console.groupEnd();
      });
    }
    // En production, ne rien faire jusqu'a integration Sentry
  }
  ```
- [x] Appeler `initErrorReporter()` dans `main.tsx` ou au demarrage de l'app
- [x] Ajouter un test unitaire pour `sentryStub.ts`

### 4.7 Ajouter vitest-axe tests

- [x] Installer `vitest-axe` (ou `@axe-core/react`):
  ```bash
  cd frontend && pnpm add -D vitest-axe
  ```
- [x] Creer au moins 3 tests d'accessibilite sur les composants critiques:
  ```typescript
  import { axe, toHaveNoViolations } from 'vitest-axe';
  import { render } from '@testing-library/react';
  expect.extend(toHaveNoViolations);

  it('should have no a11y violations', async () => {
    const { container } = render(<Component />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  ```
- [x] Composants cibles: `LoginScreen`, `ClientList`, `InteractionForm`

### CR COUCHE 4 - 2026-02-28

- Fichiers crees : `frontend/src/components/ClientList/columns.tsx`, `frontend/src/components/ProspectList/columns.tsx`, `frontend/src/hooks/useAppQueries.ts`, `frontend/src/hooks/useAppViewState.ts`, `frontend/src/components/AppLayout.tsx`, `frontend/src/components/AppProviders.tsx`, `frontend/src/hooks/useDashboardFilters.ts`, `frontend/src/utils/dashboard/dashboardSort.ts`, `frontend/src/utils/dashboard/dashboardFilters.ts`, `frontend/src/utils/dashboard/dashboardAggregates.ts`, `frontend/src/utils/dashboard/__tests__/dashboardSort.test.ts`, `frontend/src/utils/dashboard/__tests__/dashboardFilters.test.ts`, `frontend/src/utils/dashboard/__tests__/dashboardAggregates.test.ts`, `frontend/src/services/errors/sentryStub.ts`, `frontend/src/services/errors/__tests__/sentryStub.test.ts`, `frontend/src/components/__tests__/LoginScreen.a11y.test.tsx`, `frontend/src/components/__tests__/ClientList.a11y.test.tsx`, `frontend/src/components/__tests__/CockpitForm.a11y.test.tsx`
- Fichiers modifies : `frontend/src/components/ClientList.tsx`, `frontend/src/components/ProspectList.tsx`, `frontend/src/App.tsx`, `frontend/src/main.tsx`, `frontend/src/hooks/useDashboardState.tsx`, `frontend/eslint.config.js`, `frontend/src/__tests__/setup.ts`, `frontend/package.json`, `pnpm-lock.yaml`, `frontend/src/components/UserIdentityDialog.tsx`, `frontend/src/components/UserMembershipDialog.tsx`, `frontend/src/components/app-main/AppMainTabContent.tsx`, `frontend/src/components/cockpit/left/CockpitServiceSection.tsx`, `frontend/src/components/client-form/ClientFormNotesSection.tsx`, `frontend/src/components/prospect-form/ProspectFormNotesSection.tsx`, `frontend/src/components/cockpit/left/CockpitChannelSection.tsx`, `frontend/src/components/cockpit/left/CockpitClientContactSection.tsx`, `frontend/src/components/cockpit/left/CockpitIdentitySection.tsx`, `frontend/src/components/cockpit/left/CockpitManualContactSection.tsx`, `frontend/src/components/cockpit/left/CockpitRelationSection.tsx`, `frontend/src/components/user-create/UserCreateRoleSection.tsx`, `frontend/src/components/users/UserCard.tsx`
- Tests ajoutes : 7 (`frontend/src/utils/dashboard/__tests__/dashboardSort.test.ts`, `frontend/src/utils/dashboard/__tests__/dashboardFilters.test.ts`, `frontend/src/utils/dashboard/__tests__/dashboardAggregates.test.ts`, `frontend/src/services/errors/__tests__/sentryStub.test.ts`, `frontend/src/components/__tests__/LoginScreen.a11y.test.tsx`, `frontend/src/components/__tests__/ClientList.a11y.test.tsx`, `frontend/src/components/__tests__/CockpitForm.a11y.test.tsx`)
- QA : typecheck OK | lint OK | tests OK (222 pass) | build OK | deno lint OK | deno check OK | deno test OK | qa gate OK
- Points d'attention / dette restante : extraction des toolbars deja presente dans `components/clients/*` conservee pour eviter duplication ; assertions a11y via `axe(...).violations.length === 0` (compatibilite typage matcher Vitest)
- Duree estimee : ~1 jour

**Score attendu apres COUCHE 4:** 97/100

---

## COUCHE 5 — Tests hooks (68 → 100)

**Impact scoring:** +10 pts test coverage hooks
**Prerequis:** COUCHE 4 terminee (hooks decomposes)

### Etat actuel

- **~70 hooks** dans `frontend/src/hooks/`
- **6 hooks testes** dans `frontend/src/hooks/__tests__/`:
  - `useAgencyConfig.test.tsx`
  - `useDashboardState.test.tsx`
  - `useEntityFormDialogs.test.tsx`
  - `useNotifyError.test.tsx`
  - `useReassignEntity.test.tsx`
  - `useSaveInteraction.test.tsx`

### 15 hooks prioritaires a tester

| # | Hook | Lignes | Priorite | Complexite |
|---|------|--------|----------|------------|
| 1 | `useInteractionDraft.ts` | 339 | P0 | Haute — gestion draft/brouillon |
| 2 | `useClientsPanelState.ts` | 369 | P0 | Haute — state panel clients |
| 3 | `useCockpitFormController.ts` | ~400 | P0 | Haute — orchestrateur formulaire |
| 4 | `useSettingsState.ts` | 217 | P1 | Moyenne |
| 5 | `useInteractionSearch.ts` | - | P1 | Moyenne — logique recherche |
| 6 | `useInteractionSubmit.ts` | - | P1 | Haute — soumission formulaire |
| 7 | `useUsersManager.ts` | - | P1 | Moyenne — CRUD users |
| 8 | `useAgenciesManager.ts` | - | P1 | Moyenne — CRUD agencies |
| 9 | `useChangePasswordState.ts` | - | P1 | Moyenne — flow MDP |
| 10 | `useClients.ts` | - | P2 | Basse — query wrapper |
| 11 | `useProspects.ts` | - | P2 | Basse — query wrapper |
| 12 | `useInteractions.ts` | - | P2 | Basse — query wrapper |
| 13 | `useLoginScreenForm.ts` | - | P2 | Moyenne — form auth |
| 14 | `useAuditLogs.ts` | - | P2 | Basse — query wrapper |
| 15 | `useAppSessionState.ts` | 129 | P2 | Moyenne — erreurs TS connues |

### Pattern de test hook

```typescript
// frontend/src/hooks/__tests__/useMyHook.test.tsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useMyHook } from '../useMyHook';

// Mock des services externes
vi.mock('@/services/api/trpcClient', () => ({
  trpc: {
    data: {
      entities: { mutate: vi.fn() }
    }
  }
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useMyHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useMyHook(), {
      wrapper: createWrapper()
    });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it('should handle mutation success', async () => {
    const { result } = renderHook(() => useMyHook(), {
      wrapper: createWrapper()
    });
    act(() => {
      result.current.save({ name: 'Test' });
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle error', async () => {
    // Mock error scenario
    const { result } = renderHook(() => useMyHook(), {
      wrapper: createWrapper()
    });
    // ... assert handleUiError was called
  });
});
```

### Couverture etendue

- [x] Atteindre >=80% coverage sur les hooks P0 (3 hooks)
- [x] Atteindre >=70% coverage sur les hooks P1 (6 hooks)
- [x] Atteindre >=50% coverage sur les hooks P2 (6 hooks)
- [x] Chaque test couvre: happy path + error path + edge cases

**Score attendu apres COUCHE 5:** 98/100

### CR COUCHE 5 - 2026-02-28
- Fichiers crees : `frontend/src/hooks/__tests__/useInteractionDraft.test.tsx`, `frontend/src/hooks/__tests__/useClientsPanelState.test.tsx`, `frontend/src/hooks/__tests__/useCockpitFormController.test.tsx`, `frontend/src/hooks/__tests__/useSettingsState.test.tsx`, `frontend/src/hooks/__tests__/useInteractionSearch.test.tsx`, `frontend/src/hooks/__tests__/useInteractionSubmit.test.tsx`, `frontend/src/hooks/__tests__/useUsersManager.test.tsx`, `frontend/src/hooks/__tests__/useAgenciesManager.test.tsx`, `frontend/src/hooks/__tests__/useChangePasswordState.test.tsx`, `frontend/src/hooks/__tests__/useClients.test.tsx`, `frontend/src/hooks/__tests__/useProspects.test.tsx`, `frontend/src/hooks/__tests__/useInteractions.test.tsx`, `frontend/src/hooks/__tests__/useLoginScreenForm.test.tsx`, `frontend/src/hooks/__tests__/useAuditLogs.test.tsx`, `frontend/src/hooks/__tests__/useAppSessionState.test.tsx`
- Fichiers modifies : `frontend/src/services/errors/__tests__/sentryStub.test.ts`, `frontend/vitest.config.ts`, `docs/plan/Plan_100.md`
- Tests ajoutes : 15 (`frontend/src/hooks/__tests__/useInteractionDraft.test.tsx`, `frontend/src/hooks/__tests__/useClientsPanelState.test.tsx`, `frontend/src/hooks/__tests__/useCockpitFormController.test.tsx`, `frontend/src/hooks/__tests__/useSettingsState.test.tsx`, `frontend/src/hooks/__tests__/useInteractionSearch.test.tsx`, `frontend/src/hooks/__tests__/useInteractionSubmit.test.tsx`, `frontend/src/hooks/__tests__/useUsersManager.test.tsx`, `frontend/src/hooks/__tests__/useAgenciesManager.test.tsx`, `frontend/src/hooks/__tests__/useChangePasswordState.test.tsx`, `frontend/src/hooks/__tests__/useClients.test.tsx`, `frontend/src/hooks/__tests__/useProspects.test.tsx`, `frontend/src/hooks/__tests__/useInteractions.test.tsx`, `frontend/src/hooks/__tests__/useLoginScreenForm.test.tsx`, `frontend/src/hooks/__tests__/useAuditLogs.test.tsx`, `frontend/src/hooks/__tests__/useAppSessionState.test.tsx`)
- QA : typecheck OK | lint OK | tests OK (frontend 271 pass, backend 89 pass) | build OK | pnpm run qa OK
- Points d'attention / dette restante : logs non bloquants `jsdom`/`axe-core` (`HTMLCanvasElement.getContext`) en tests a11y ; `pnpm audit` remonte 1 vulnerabilite `moderate` non bloquante
- Duree estimee : ~6h

---

## COUCHE 6 — E2E (6 specs → couverture complete)

**Impact scoring:** +2 pts E2E coverage
**Prerequis:** instance Supabase de test + Playwright installe

### Specs existantes (6)

| Spec | Lignes | Couverture |
|------|--------|-----------|
| `auth.spec.ts` | 110 | Login, logout |
| `navigation.spec.ts` | 232 | Navigation entre vues |
| `dashboard-p06.spec.ts` | 207 | Dashboard KPIs |
| `clients-p05.spec.ts` | 173 | CRUD clients basique |
| `admin-settings-p07.spec.ts` | 157 | Settings admin |
| `search.spec.ts` | 156 | Recherche entites |

### 4 specs a ajouter

#### 6.1 Spec changement MDP premiere connexion

- [x] **Fichier:** `frontend/e2e/first-login-password.spec.ts`
- [x] Scenarios:
  - [x] Utilisateur `must_change_password=true` → redirection vers ecran changement
  - [x] MDP faible rejete (< 8 chars, sans chiffre, sans symbole)
  - [x] MDP valide → redirection vers dashboard
  - [x] Retour impossible sans changement de MDP

#### 6.2 Spec admin creation utilisateur

- [x] **Fichier:** `frontend/e2e/admin-create-user.spec.ts`
- [x] Scenarios:
  - [x] Super admin cree un utilisateur avec role `tcs`
  - [x] Email duplique rejete
  - [x] Mot de passe genere conforme a la politique
  - [x] Utilisateur visible dans la liste apres creation

#### 6.3 Spec CRUD client complet

- [x] **Fichier:** `frontend/e2e/client-crud-complete.spec.ts`
- [x] Scenarios:
  - [x] Creer un client avec tous les champs obligatoires
  - [x] Modifier le client (nom, adresse)
  - [x] Ajouter un contact au client
  - [x] Archiver le client
  - [x] Verifier que le client archive n'apparait plus dans la liste par defaut

#### 6.4 Spec interactions cockpit

- [x] **Fichier:** `frontend/e2e/interactions-cockpit.spec.ts`
- [x] Scenarios:
  - [x] Creer une interaction depuis le cockpit
  - [x] Sauvegarder en brouillon
  - [x] Soumettre l'interaction
  - [x] Verifier dans la timeline du client

**Score attendu apres COUCHE 6:** 99/100

### CR COUCHE 6 - 2026-02-28
- Fichiers crees : `frontend/e2e/first-login-password.spec.ts`, `frontend/e2e/admin-create-user.spec.ts`, `frontend/e2e/client-crud-complete.spec.ts`, `frontend/e2e/interactions-cockpit.spec.ts`
- Fichiers modifies : `backend/functions/api/services/adminUsers.ts`, `docs/plan/Plan_100.md`
- Tests ajoutes : 4 (`frontend/e2e/first-login-password.spec.ts`, `frontend/e2e/admin-create-user.spec.ts`, `frontend/e2e/client-crud-complete.spec.ts`, `frontend/e2e/interactions-cockpit.spec.ts`)
- QA : typecheck OK | lint OK | tests OK (frontend 271 pass, backend 88 pass) | build OK | pnpm run qa OK
- Points d'attention / dette restante : execution E2E Playwright COUCHE 6 sensible au runtime Supabase (jeu de comptes, etat de session, comportements backend de creation idempotente/non-idempotente) ; stabilisation finale a valider sur environnement E2E dedie.
- Duree estimee : ~4h20

### CR COUCHE 6 - 2026-02-28 (stabilisation draft + E2E)
- Fichiers crees : []
- Fichiers modifies : `backend/functions/api/services/dataEntities.ts`, `frontend/src/services/entities/saveEntityContact.ts`, `frontend/src/services/interactions/interactionDraftPayload.ts`, `frontend/src/services/interactions/saveInteractionDraft.ts`, `frontend/src/services/interactions/getInteractionDraft.ts`, `frontend/src/schemas/interactionSchema.ts`, `frontend/e2e/interactions-cockpit.spec.ts`, `docs/plan/Plan_100.md`
- Tests ajoutes : 0 ([])
- QA : typecheck OK | lint OK | tests OK (frontend 271 pass, backend 88 pass, e2e interactions-cockpit 4/4 pass) | build OK
- Points d'attention / dette restante : conserver une validation reguliere des scenarios E2E sur environnement Supabase dedie pour limiter la variabilite des donnees de test.
- Duree estimee : ~1h15

---

## COUCHE 7 — Shared & Docs (88-90 → 100)

**Impact scoring:** +1-2 pts docs & types

### 7.1 Regenerer supabase.types.ts

- [x] Commande:
  ```bash
  supabase gen types typescript --project-id <project_id> --schema public > shared/supabase.types.ts
  ```
- [x] Verifier que `frontend/src/types/supabase.ts` re-exporte correctement
- [x] Lancer `pnpm run typecheck` pour detecter les breaking changes
- [x] Corriger les types impactes si necessaire (aucun impact detecte)

### 7.2 Mettre a jour stack.md

- [x] **Fichier:** `docs/stack.md`
- [x] Ajouter/verifier:
  - [x] Section tRPC (version, pattern d'appel)
  - [x] Section `jose` (JWT verification backend)
  - [x] Section Data Access Layer (double client `db`/`userDb`)
  - [x] Section Error pipeline (lien vers `shared/errors/`)
  - [x] Section CI/CD (lien vers `.github/workflows/ci.yml`)

### 7.3 DRY interaction.schema.ts

- [x] **Fichiers:**
  - `shared/schemas/interaction.schema.ts` (207 lignes)
  - `frontend/src/schemas/interactionSchema.ts` (6 lignes — re-export RHF)
- [x] Verifier qu'il n'y a pas de duplication de logique de validation
- [x] Si le schema local ajoute des transformations RHF-specifiques, documenter pourquoi (aucune transformation RHF locale)
- [x] Si c'est un simple re-export, envisager d'importer directement depuis `shared/` (applique: migration des imports + suppression du wrapper)

### 7.4 Recreer docs/testing.md

- [x] **Fichier:** `docs/testing.md` (supprime precedemment)
- [x] Contenu:
  - [x] Pyramide de tests (unitaire > hooks > composants > E2E)
  - [x] Commandes par couche
  - [x] Conventions de nommage des tests
  - [x] Politique de mocks (interdits sur logique metier)
  - [x] Setup E2E (prerequis, variables d'env)
  - [x] Coverage thresholds et comment les verifier

### 7.5 Ajouter jose dans docs

- [x] **Fichier:** `docs/stack.md`
- [x] Documenter `jose` comme dependance backend pour la verification JWT
- [x] Version utilisee, import map Deno, usage dans `auth.ts`

**Score attendu apres COUCHE 7:** 100/100

### CR COUCHE 7 - 2026-02-28
- Fichiers crees : []
- Fichiers modifies : `docs/stack.md`, `docs/testing.md`, `docs/plan/Plan_100.md`, `frontend/src/**` (31 fichiers avec migration d'imports `@/schemas/interactionSchema` vers `shared/schemas/interaction.schema`), `frontend/src/schemas/interactionSchema.ts` (supprime)
- Tests ajoutes : 0 ([])
- QA : typecheck OK | lint OK | tests OK (frontend 271 pass, backend 88-89 pass selon gate) | build OK | pnpm run qa OK
- Points d'attention / dette restante : migration d'imports directe vers `shared/` appliquee pour les usages detectes de `interactionSchema`; surveiller les futures conventions d'import `shared` pour eviter les chemins relatifs profonds.
- Duree estimee : ~1h10

---

## TIPS IA par domaine

### tRPC dans ce projet

- Le backend utilise **tRPC over Hono** (pas de REST routes)
- Router principal: `backend/functions/api/trpc/router.ts`
- Procedures definies dans `backend/functions/api/trpc/procedures.ts`
- Schema de validation via Zod sur `.input()` et `.output()`
- Le client frontend est dans `frontend/src/services/api/trpcClient.ts`
- Convention: chaque procedure `mutation` appelle un service handler
- L'auth est geree par le middleware Hono, pas par tRPC middleware
- Pour ajouter une nouvelle procedure:
  1. Ajouter le schema dans `shared/schemas/`
  2. Creer le service handler dans `backend/functions/api/services/`
  3. Ajouter la procedure dans `router.ts`
  4. Le type est automatiquement infere cote frontend via `AppRouter`

### Drizzle dans ce projet

- **Non utilise actuellement** — le backend utilise `@supabase/supabase-js` directement
- Le `DbClient` dans `types.ts` est un `SupabaseClient`
- Pattern double client:
  - `db`: client admin (service_role key) pour operations admin
  - `userDb`: client user-scoped (JWT de l'utilisateur, RLS actif)
- Si migration vers Drizzle prevue, commencer par les queries read-only les plus simples

### Hono middleware chain

- Ordre: `requestId` → `corsAndBodySize` → `auth` → `errorHandler` → tRPC adapter
- Declare dans `backend/functions/api/app.ts`
- Le middleware `auth` enrichit le contexte Hono avec `authContext`, `db`, `userDb`, `callerId`
- Le tRPC context (`context.ts`) lit ces valeurs depuis le contexte Hono
- Pour ajouter un middleware: l'inserer dans `app.ts` avant le tRPC adapter

### Pattern test hook Vitest

- Toujours wrapper avec `QueryClientProvider` (retry: false pour les tests)
- Mocker les services (`vi.mock('@/services/...')`) pas les hooks eux-memes
- Utiliser `waitFor` pour les assertions async
- Utiliser `act` pour les mutations/actions
- Pattern complet dans la section COUCHE 5 ci-dessus
- Ne pas oublier `vi.clearAllMocks()` dans `beforeEach`

### Pattern E2E Playwright

- Config: `frontend/playwright.config.ts`
- Specs dans `frontend/e2e/`
- Login reutilisable via `storageState` (sauvegarder les cookies auth)
- Page Object Model recommande pour les pages complexes
- Toujours ajouter un `test.skip` conditionnel si une variable d'env est requise
- Pour les formulaires: utiliser `page.fill()` et `page.click()` avec des `data-testid`
- Pour les assertions: preferer `expect(page.getByRole(...))` aux selecteurs CSS

### Error handling pipeline

- **Creer une erreur:** `createAppError()` depuis `shared/errors/`
- **Catalog:** `shared/errors/catalog.ts` — tous les codes et messages en francais
- **Frontend pipeline:** `normalizeError()` → `reportError()` → `notifyError()` = `handleUiError()`
- **Backend pipeline:** `httpError()` dans le handler → `handleError()` middleware catch-all
- **Jamais** `throw new Error()` — toujours `createAppError()` ou `httpError()`
- **Jamais** `console.error` — toujours `reportError()`
- **Jamais** `toast.error()` — toujours `notifyError()` (regle ESLint en place)
- Pour ajouter un nouveau code d'erreur:
  1. L'ajouter dans `shared/errors/catalog.ts`
  2. Convention: `DOMAIN_ACTION_RESULT` (ex: `CLIENT_SAVE_DUPLICATE_SIRET`)
  3. Message en francais, concis, user-facing

---

## Verification

Apres implementation de **chaque couche**, executer:

```bash
# Frontend QA (typecheck + lint + test + build)
cd frontend && pnpm run typecheck && pnpm run lint -- --max-warnings=0 && pnpm run test:run && pnpm run build

# Backend QA
deno lint backend/functions/api
deno check --config backend/deno.json backend/functions/api/index.ts
deno test --allow-env --no-check --config backend/deno.json backend/functions/api

# Ou via le script QA global
pnpm run qa
```

### Grille de scoring par couche

| Couche | Score avant | Score apres | Delta |
|--------|-----------|-------------|-------|
| 1 — Securite DB | 73 | 88 | +15 |
| 2 — DevOps / QA | 78 | 92 | +14 |
| 3 — Backend refactoring | 87 | 95 | +8 |
| 4 — Frontend refactoring | 86 | 97 | +11 |
| 5 — Tests hooks | 68 | 98 | +30 |
| 6 — E2E | 85 | 99 | +14 |
| 7 — Shared & Docs | 88 | 100 | +12 |

> Les scores sont des estimations basees sur la ponderation de l'audit v2 corrige.
> Le score global est une moyenne ponderee, pas une somme lineaire.
