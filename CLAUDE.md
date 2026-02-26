# CLAUDE.md

Guide pour Claude Code. Ce fichier est la source unique des regles du projet.

## Commandes

Frontend (depuis `frontend/`) :

```bash
pnpm install                # Installer les dependances
pnpm run dev                # Serveur de dev (port 3000)
pnpm run build              # Build production dans dist/
pnpm run lint               # ESLint (strict: --max-warnings=0)
pnpm run typecheck          # TypeScript (noEmit)
pnpm run test               # Vitest (run)
pnpm run test:coverage      # Vitest avec couverture
pnpm run test:e2e           # Playwright (local uniquement)
```

Backend (depuis la racine) :

```bash
deno test --allow-env --no-check --config backend/deno.json backend/functions/api
```

## Structure projet

```
frontend/src/
  components/          # Composants React (PascalCase.tsx), sous-dossiers pour decomposition
    ui/                # Primitives shadcn/ui (ne pas modifier manuellement)
  hooks/               # Custom hooks (useFeature.ts)
  services/            # Acces donnees (1 fonction exportee par fichier)
    errors/            # Pipeline erreurs (normalizeError, mappers, handleUiError, notify, reportError)
    auth/              # Authentification Supabase
    admin/             # Admin Edge Function calls
    agency/            # Agence active, profils
    clients/           # CRUD clients
    entities/          # Prospects, contacts, conversion
    interactions/      # CRUD interactions, drafts, timeline
    query/             # queryClient, queryKeys
    api/               # Client Edge Function (Hono RPC)
    supabase/          # Client Supabase, memoryStorage
    config/            # Configuration agence
  stores/              # State global (errorStore.ts via Zustand)
  schemas/             # Schemas Zod locaux (interactionSchema.ts)
  types/               # supabase.ts (re-export) + types.ts (overrides)
  lib/                 # Utilitaires (utils.ts pour cn(), result.ts pour Result<T>)
  utils/               # Helpers purs (date/, interactions/, clients/, audit/)
  constants/           # Constantes metier (statusCategories.ts, relations.ts)

shared/
  errors/              # AppError, catalog, fingerprint, types
  schemas/             # Schemas Zod partages front/back (client, prospect, contact, interaction, user, agency, auth)
  supabase.types.ts    # Types Supabase generes (source unique)

backend/
  functions/api/       # Edge Function unique Hono
    routes/            # adminUsers.ts, adminAgencies.ts
    services/          # Logique metier + tests (_test.ts)
    middleware/        # auth, requestId, errorHandler
    app.ts             # Config Hono
    index.ts           # Entrypoint Deno.serve
    types.ts           # Types backend
  migrations/          # SQL versionne

docs/                  # plan.md, stack.md, testing.md, CR/, prompt.md
```

## Stack technique

Voir `docs/stack.md` pour les versions exactes et la matrice de compatibilite.

Resume : React 19 + Vite 7 + TypeScript 5.9 + TanStack Query v5 + React Hook Form v7 + Zod v4 + Tailwind CSS 4 + shadcn/ui + Supabase (Auth + Realtime + Edge Functions Hono/Deno) + Sonner + date-fns + Lucide React.

## TypeScript strict

- `strict: true` + `noUnusedLocals` + `noUnusedParameters` dans tsconfig.json
- Zero `any` : utiliser `unknown` puis narrowing avec type guard
- Types explicites sur les exports publics (signatures de fonctions exportees)
- `interface` pour les props de composants, `type` pour les unions et utilitaires
- Zero `as` casting sauf apres un type guard verifie
- Zero `@ts-ignore` / `@ts-expect-error` sauf cas documente en commentaire inline
- Zero `!` (non-null assertion) : preferer optional chaining + early return

## ESLint

- `--max-warnings=0` : zero tolerance, zero warning
- Lancer `pnpm run lint` avant tout commit
- Ne jamais desactiver une regle avec `eslint-disable` sauf cas documente en commentaire justificatif

## Conventions de nommage

| Element | Convention | Exemple |
|---------|-----------|---------|
| Dossiers | kebab-case | `client-form/`, `interaction-search/` |
| Composants React | PascalCase.tsx | `ClientList.tsx`, `InteractionCard.tsx` |
| Hooks | useFeature.ts | `useClients.ts`, `useSaveClient.ts` |
| Services | camelCase.ts | `getClients.ts`, `saveInteraction.ts` |
| Types / Interfaces | PascalCase | `InteractionRow`, `ClientFormProps` |
| Constantes | SCREAMING_SNAKE_CASE | `STATUS_CATEGORIES`, `RELATION_TYPES` |
| Schemas Zod | feature.schema.ts | `client.schema.ts`, `auth.schema.ts` |
| Tests frontend | `__tests__/nom.test.ts(x)` | `__tests__/mapPostgrestError.test.ts` |
| Tests backend | nom_test.ts | `rateLimit_test.ts`, `adminUsers_test.ts` |
| Migrations SQL | YYYYMMDDHHMMSS_desc.sql | `20250601120000_add_agencies.sql` |
| Codes erreur | DOMAIN_ACTION_RESULT | `AUTH_LOGIN_INVALID_CREDENTIALS` |

## Fichiers et imports

- 1 fichier = 1 responsabilite unique
- Viser ~150 lignes max par fichier ; decomposer au-dela en sous-fichiers ou sous-dossier
- Pas de barrel exports (index.ts) sauf ceux existants (`services/config`, `services/interactions`, `services/supabase`, `shared/errors`, `shared/schemas`)
- Path alias `@/*` pour tout import depuis `src/`
- Ordre des imports : 1) React et libs externes 2) `shared/` 3) `@/` internes 4) relatifs (`./`)
- Zero imports circulaires
- Import direct vers le fichier source, pas via un re-export intermediaire

## Politique de decoupage pragmatique (LLM-friendly)

Objectif: garder un code lisible par humains ET par LLM, sans sur-fragmentation.

- Le seuil de taille est un garde-fou, pas une religion.
- Cible recommandee:
  - normal: <= 4-6 KB pour un composant metier
  - tres bien: <= 3 KB quand cela reste naturel
  - alerte: > 6 KB (revoir la responsabilite)
- On decoupe uniquement si au moins un signal est present:
  - plusieurs responsabilites metier dans le meme fichier
  - JSX difficile a parcourir (beaucoup de branches/conditions)
  - logique de mapping de props volumineuse
  - duplication visible de patterns UI/erreurs/champs
- On ne decoupe pas si:
  - le fichier est coherent et simple a lire de bout en bout
  - l'extraction cree uniquement du "plumbing" (fichier pass-through inutile)
  - l'extraction degrade la navigation (trop de micro-fichiers)
- Pattern prefere:
  - 1 orchestrateur clair
  - 2 a 5 sous-composants stables maximum par feature
  - types partages dans `*.types.ts` quand ils sont volumineux ou reutilises
- Anti-pattern a eviter:
  - "un fichier par bloc JSX" sans gain metier
  - extractions purement cosmetiques qui n'ameliorent ni testabilite ni lisibilite
- Regle de validation avant merge:
  - `typecheck` vert
  - comportement identique
  - complexite percue en baisse (moins de branches/props inline dans le parent)

## Composants React

- Fonctions uniquement (zero class components)
- Props typees via `interface` en haut du fichier (pas de `React.FC`)
- Decomposer les composants >150 lignes en sous-composants dans un sous-dossier du meme nom
- Pas de prop spreading (`{...props}`) sauf sur les primitives shadcn/ui
- Event handlers : arrow inline si une ligne, fonction nommee si >2 lignes
- Zero logique metier dans les composants : extraire dans des hooks ou services
- shadcn/ui pour tous les primitives UI (Button, Dialog, Input, Select, etc.)
- Tailwind CSS pour le styling (zero CSS custom sauf `index.css`)

## Hooks

- 1 hook = 1 responsabilite
- Nommage : `useFeature` (queries) ou `useFeatureAction` (mutations)
- TanStack Query v5 pour tout server state (`useQuery`, `useMutation`)
- `useNotifyError(query.error, fallbackMessage, source)` pour notifier les erreurs de queries
- `handleUiError(error, fallbackMessage)` dans `onError` des mutations
- Zero `useState` pour du server state : toujours TanStack Query
- Zero `useEffect` pour du data fetching : toujours `useQuery`

## Services

- 1 fonction exportee par fichier (helpers prives autorises dans le meme fichier)
- Pure functions (pas de side effects sauf appels API Supabase/Edge)
- 4 patterns d'erreur : A (throw AppError), B (Result<T, AppError>), C (Edge Function httpError), D (safeSupabaseCall)
- Zero `throw new Error()` : toujours `createAppError()` ou mappers dedies
- Messages d'erreur en francais, concis, user-facing
- Zero donnees mockees ou hardcodees

## State management

- **TanStack Query v5** : server state (cache, mutations, retry, invalidation)
- **React Context** : session (user courant, agence active)
- **Zustand** : error store uniquement (`stores/errorStore.ts`)
- Zero `localStorage` pour les donnees metier (tout passe par Supabase)
- Zero Redux, MobX, ou autre state manager

## Validation

- **Zod v4** pour toute validation (frontend + backend)
- Schemas partages dans `shared/schemas/` (client, prospect, contact, interaction, user, agency, auth)
- Schemas locaux dans `frontend/src/schemas/` (interactionSchema pour RHF)
- React Hook Form + `@hookform/resolvers` pour les formulaires
- Validation cote client ET cote serveur avec les memes schemas

## Gestion des erreurs

Voir skill `cir-error-handling` pour le guide complet.

- **AppError** (`shared/errors/`) : type unique avec `_tag: 'AppError'`, domain, severity, fingerprint
- **Catalog** (`shared/errors/catalog.ts`) : source unique des codes et messages en francais
- **Frontend** : `normalizeError()` -> `reportError()` -> `notifyError()` (pipeline `handleUiError`)
- **Backend** : `httpError()` + middleware `handleError()` avec catalog lookup
- Zero `console.error` direct : utiliser `reportError()`
- Zero `toast.error()` direct : utiliser `notifyError()` (Sonner)
- `ErrorBoundary` global pour les erreurs non capturees
- Error journal exportable (`ErrorJournalExport`)
- Observabilite : `setErrorReporter()` pour brancher Sentry/LogRocket

## Securite et authentification

- Zero `localStorage` pour les donnees metier : tout via Supabase
- Zero donnees mockees ou hardcodees en production
- Creation de compte par admin uniquement (pas d'inscription publique, pas de verification email)
- Mot de passe : min 8 caracteres, au moins 1 chiffre et 1 symbole
- Premiere connexion : changement de mot de passe obligatoire (app bloquee sinon)
- Multi-tenant : RLS filtre par `agency_id` sur toutes les tables
- Roles : `super_admin`, `agency_admin`, `tcs`
- Logs d'audit consultables par `super_admin` et `agency_admin`

## Tests

Voir `docs/testing.md` pour le detail complet.

- 1 feature = tests associes (unitaire + hook/composant si UI change)
- Pyramide : unitaires > hooks/composants > E2E
- Happy path ET error path testes
- Mocks interdits sur la logique metier (uniquement sur les appels externes)
- Tests rapides et deterministes
- DoD : compile + lint + tests passent + test regressif pour chaque bug corrige

## Types Supabase

- Source unique : `shared/supabase.types.ts`
- Frontend re-export : `frontend/src/types/supabase.ts`
- Regeneration obligatoire apres toute modification du schema (migrations, RPC, MCP)
- Commande : `supabase gen types typescript --project-id <id> --schema public > shared/supabase.types.ts`

## Edge Functions (production)

- Source de verite API : `backend/functions/api/`
- Convention Supabase CLI : l'entree doit exister sous `supabase/functions/api/index.ts`
- Maintenir un wrapper minimal dans `supabase/functions/api/index.ts` :
  - `import '../../../backend/functions/api/index.ts';`
- Maintenir `supabase/config.toml` avec `[functions.api] verify_jwt = false` (auth geree dans le code backend)
- Maintenir `deno.json` a la racine avec import map explicite pour Zod :
  - `"zod": "npm:zod@4.3.6"`
  - `"zod/v4": "npm:zod@4.3.6/v4"`
  - `"zod/": "npm:zod@4.3.6/"`
- Ne pas deployer le code via l'editeur Dashboard (risque de divergence/stub). Deploy uniquement depuis le repo avec la CLI.
- Commande de reference :
  - `supabase functions deploy api --project-ref <project_ref> --use-api --import-map deno.json --no-verify-jwt`
- Preuve runtime minimale apres deploy :
  - verifier `api` via MCP `list_edge_functions` (version/hash/entrypoint/import_map/verify_jwt)
  - verifier `POST /functions/v1/api/trpc/data.entities`
  - verifier `POST /functions/v1/api/trpc/data.entity-contacts`
  - verifier `POST /functions/v1/api/trpc/data.interactions`
  - verifier preflight `OPTIONS` sur les memes routes avec `Origin` frontend
  - attendu : plus aucun `404` sur `/functions/v1/api/trpc/*`

## Regle Zod backend

- `z.discriminatedUnion()` impose une valeur de discriminateur unique par variante.
- Si plusieurs variantes partagent la meme action (ex: plusieurs payloads `action: "save"`), utiliser `z.union()` au lieu de `z.discriminatedUnion()` pour eviter les erreurs runtime.

## Skills obligatoires

Invoquer le skill correspondant AVANT d'ecrire du code :

- **React** : `vercel-react-best-practices` — avant toute modification de composants, hooks, ou pages React
- **Composition React** : `vercel-composition-patterns` — pour refactoring composants, compound components, render props
- **Web Design** : `web-design-guidelines` — pour audit UI, accessibilite, UX
- **Supabase / Postgres** : `supabase-postgres-best-practices` — avant toute modification DB (migrations, queries, RLS, indexes, Edge Functions accedant a la DB)
- **Erreurs** : `cir-error-handling` — avant toute modification du systeme d'erreurs (catalog, mappers, AppError, normalizeError, handleUiError, codes d'erreur)
- **Debug / test failure** : `systematic-debugging` — obligatoire avant toute tentative de correction
- **Tests unitaires/integration front** : `vitest` — pour creer/mettre a jour les tests
- **E2E / parcours UI** : `playwright-cli` — pour verification de parcours navigateur
- **Package manager / workspace** : `pnpm` — pour toute modification deps, scripts, workspace
- **API contract type-safe** : `trpc-type-safety` — pour toute creation/migration de procedure tRPC
- **ORM type-safe** : `drizzle-orm` — pour toute creation/migration de schema/queries Drizzle
- **Decouverte de capabilities** : `find-skills` — quand une competence manque ou une action est inconnue

## Usage MCP / Context7

- Pour toute decision technique sur une librairie/framework (React, TanStack Router/Query, tRPC, Drizzle, Vitest, Playwright), consulter Context7 avant implementation.
- Prioriser les sources officielles et snippets compatibles avec les versions du repo.
- Si la doc du repo et Context7 divergent, signaler la divergence et choisir explicitement l'arbitrage.

## Architecture cle

- **Multi-tenant** : toutes les tables filtrees par `agency_id` via RLS
- **Roles** : `super_admin` (global), `agency_admin` (agence), `tcs` (operateur)
- **Path alias** : `@/*` mappe vers `./src/*`
- **Types** : `frontend/src/types/supabase.ts` (generes) + `frontend/src/types.ts` (overrides metier)
- **Backend** : Edge Function Hono unique, middleware chain (requestId -> auth -> errorHandler), service layer avec pure functions testables

## Workflow

1. Mettre a jour `docs/plan.md` avant chaque etape majeure
2. Implementer cote backend (migrations + RLS) si necessaire
3. Brancher le frontend
4. Tester l'acces multi-agence
5. Regenerer les types Supabase si le schema a change

## Environnements

- `frontend/.env` : variables Vite (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- `backend/.env` (si besoin) : secrets serveur uniquement
