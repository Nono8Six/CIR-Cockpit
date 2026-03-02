# Stack Technique - CIR Cockpit

> Document de reference pour la stack technique du projet.
> Derniere mise a jour: 28/02/2026 (versions du repo)

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
├─────────────────────────────────────────────────────────┤
│  Framework:      React 19.2.4 + Vite 7.3.1               │
│  Styling:        Tailwind CSS 4.1.18                      │
│  UI Components:  shadcn/ui (Radix + Tailwind)          │
│  Icones:         Lucide React                           │
│  Data fetching:  TanStack Query v5.90.21                │
│  Formulaires:    React Hook Form v7.71.1 + Zod v4.3.6   │
│  Notifications:  Sonner v2.0.7                          │
│  Dates:          date-fns v4.1.0 (locale FR)            │
│  State global:   React Context + Zustand (erreurs)       │
│  Realtime:       Supabase Realtime                      │
├─────────────────────────────────────────────────────────┤
│                      BACKEND                            │
├─────────────────────────────────────────────────────────┤
│  BaaS:           Supabase                               │
│  Database:       PostgreSQL 15+ + RLS multi-tenant       │
│  Auth:           Supabase Auth (JWT natif)              │
│  API:            Supabase JS SDK v2.95.3 + Edge Functions (Hono RPC) │
│  Realtime:       Supabase Realtime (WebSocket)          │
└─────────────────────────────────────────────────────────┘
```

## Frontend

### Core

| Technologie | Version | Role |
|-------------|---------|------|
| **React** | 19.2.4 | Framework UI |
| **Vite** | 7.3.1 | Build tool, dev server |
| **TypeScript** | 5.9.3 | Typage statique |
| **Tailwind CSS** | 4.1.18 | Utility-first CSS |

### Matrice de compatibilite (versions du repo)

| Librairie cible | Version | Peer deps / contraintes |
|-----------------|---------|--------------------------|
| **React** | 19.2.4 | Aucun peer dep declare |
| **React DOM** | 19.2.4 | `react ^19.2.4` |
| **Vite** | 7.3.1 | Node `^20.19.0 || >=22.12.0`; peer deps optionnels: `@types/node`, `lightningcss`, `sass`, `sass-embedded`, `less`, `stylus`, `terser`, `yaml`, `sugarss`, `jiti`, `tsx` |
| **Tailwind CSS** | 4.1.18 | Aucun peer dep declare |
| **TanStack Query (React)** | 5.90.21 | `react ^18 || ^19` |
| **React Hook Form** | 7.71.1 | `react ^16.8.0 || ^17 || ^18 || ^19` |
| **Zod** | 4.3.6 | Aucun peer dep declare |
| **date-fns** | 4.1.0 | Aucun peer dep declare |
| **Sonner** | 2.0.7 | `react ^18 || ^19` + `react-dom ^18 || ^19` |
| **Lucide React** | 0.564.0 | `react ^16.5.1 || ^17 || ^18 || ^19` |
| **Supabase JS** | 2.95.3 | Aucun peer dep declare |

### UI & Composants

| Technologie | Role | Remplace |
|-------------|------|----------|
| **shadcn/ui (CLI v3.x)** | Composants accessibles (Select, Dialog, Command, Form...) | Composants custom, `<select>` natif |
| **Lucide React (0.x)** | Icones SVG | - |

**Composants shadcn utilises:**
- `AlertDialog` - confirmations critiques
- `Badge` - badges statut
- `Button` - boutons standardises
- `Command` - recherche / palette
- `Dialog` - modales
- `Input` - champs de saisie
- `Select` - dropdowns accessibles
- `Sheet` - panneaux coulissants
- `Table` - tableaux structures
- `Tabs` - navigation onglets
- `Tooltip` - infobulles

### Data & State

| Technologie | Role | Remplace |
|-------------|------|----------|
| **TanStack Query v5** | Data fetching, cache, mutations | useState + useEffect manuels |
| **React Context** | State global simple (agence active, user) | Props drilling |
| **Zustand** | Error store (erreurs globales) | Context custom |
| **Supabase Realtime** | Sync live entre utilisateurs | Polling / refresh manuel |

**Pourquoi TanStack Query:**
- Cache automatique entre navigations
- Loading/error states geres
- Invalidation automatique apres mutation
- Retry automatique
- Devtools pour debug

**Pourquoi PAS Redux:**
- Pas de state global complexe
- TanStack Query gere le server state
- React Context suffit pour le reste
- Zustand est limite a l'error store

**Strategie data fetching (etat actuel):**
- Services `frontend/src/services/*` encapsulent les appels Supabase/Edge.
- TanStack Query v5 pour cache, invalidations et retry centralise.
- Pas de persistance locale pour les donnees metier (conformite AGENTS.md).

### Formulaires & Validation

| Technologie | Role |
|-------------|------|
| **React Hook Form v7.71.1** | Gestion formulaires performante |
| **Zod v4.3.6** | Validation de schemas TypeScript-first (schemas partages dans `shared/`) |
| **@hookform/resolvers v5.2.2** | Bridge RHF + Zod |

**Avantages:**
- Validation declarative et typee
- Pas de re-render a chaque keystroke
- Schemas reutilisables frontend/backend
- Erreurs par champ automatiques

### UX & Utilities

| Technologie | Role | Remplace |
|-------------|------|----------|
| **Sonner v2.0.7** | Toast notifications | Erreurs inline, alerts |
| **date-fns v4.1.0** | Manipulation dates | `new Date()` manuel |

**Pourquoi date-fns:**
- Modulaire (tree-shakable)
- Locale FR native
- Fonctions immutables
- Bien type

## Backend (Supabase)

### Base de donnees

| Aspect | Implementation |
|--------|----------------|
| **SGBD** | PostgreSQL 15+ (gere par Supabase) |
| **Multi-tenant** | RLS filtre par `agency_id` |
| **Migrations** | SQL versionne dans `backend/migrations/` |

### Authentification

| Aspect | Implementation |
|--------|----------------|
| **Provider** | Supabase Auth (GoTrue) |
| **Methode** | Email + Password |
| **Tokens** | JWT (access + refresh) |
| **Signature JWT** | ES256 (ECC P-256) |
| **Roles** | `super_admin`, `agency_admin`, `tcs` |

**Flux:**
1. Login via `supabase.auth.signInWithPassword()`
2. JWT stocke automatiquement
3. RLS utilise `auth.uid()` pour filtrer
4. Refresh token automatique

**Note securite (decision produit):**
1. `auth_leaked_password_protection` n'est pas active sur ce projet.
2. Motif: plan Supabase non Pro + fonctionnalite non retenue pour cette application.
3. Controles compensatoires conserves: creation de compte admin-only, mot de passe fort minimal, changement obligatoire au premier login, RLS multi-tenant strict.

**Politique JWT backend (Edge Function `api`):**
1. Verification JWT explicite via JWKS (`/auth/v1/.well-known/jwks.json`).
2. Algorithme autorise par defaut: `ES256` (`SUPABASE_JWT_ALLOWED_ALGS=ES256`).
3. Regle d'exploitation: la cle `Current key` Supabase doit rester en **ECC P-256** pour eviter les `401 AUTH_REQUIRED` dus a un mismatch algo.

### tRPC (Hono RPC)

| Aspect | Implementation |
|--------|----------------|
| **Version** | `@trpc/server` `11.10.0` (Deno import map) + `@trpc/client` `^11.10.0` (frontend) |
| **Transport** | tRPC over HTTP via `httpBatchLink` |
| **Backend** | Router principal `backend/functions/api/trpc/router.ts` |
| **Frontend** | Client `frontend/src/services/api/trpcClient.ts` vers `/functions/v1/api/trpc` |

Pattern d'appel:
1. Frontend: mutation/query tRPC via `callTrpcMutation(...)` sur le client configure avec `httpBatchLink`.
2. Backend: validation Zod sur `.input()` et `.output()` dans les procedures.
3. Contexte auth: fourni par middleware Hono (pas de fallback custom hors header `Authorization`).

### jose (verification JWT backend)

| Aspect | Implementation |
|--------|----------------|
| **Dependance** | `jose@5.9.6` |
| **Import map Deno** | `deno.json` (`"jose": "npm:jose@5.9.6"`) |
| **Usage** | `backend/functions/api/middleware/auth/verifyToken.ts` (orchestre depuis `backend/functions/api/middleware/auth.ts`) |

Utilisation actuelle:
1. `createRemoteJWKSet(...)` pour resoudre la JWKS Supabase.
2. `decodeProtectedHeader(...)` pour controler `alg` et `kid`.
3. `jwtVerify(...)` pour verifier signature, issuer et audience.

### Data Access Layer

Le backend `api` utilise un mode hybride pour conserver la securite RLS et le typage des operations SQL:

1. **`@supabase/supabase-js` (user-scoped auth context)**:
   - verification JWT et chargement du profil/membership (`middleware/auth`),
   - operations Auth Admin (`createUser`, `updateUserById`, `deleteUser`) via `getSupabaseAdmin()`.
2. **Drizzle ORM (queries metier PostgreSQL)**:
   - source des requetes metier dans `backend/functions/api/services/**`,
   - type de reference `DbClient` dans `backend/functions/api/types.ts`.

Pattern de client:
1. `db`: client de service (operations admin/globales).
2. `userDb`: client scope utilisateur (RLS applique selon `authContext`).

Dans le code actuel, `db` et `userDb` pointent sur le meme client Drizzle (`getDbClient()`), mais la separation de contrat est volontaire pour maintenir la distinction d'intention (admin vs user-scoped) et preparer une evolution future sans casser les handlers.

### Error pipeline (shared/front/back)

Source de verite partagee: `shared/errors/` (`types.ts`, `catalog.ts`, `fingerprint.ts`).

Pipeline:
1. Frontend: `normalizeError()` -> `reportError()` -> `notifyError()` via `handleUiError()`.
2. Backend: `httpError()` -> middleware `handleError()` avec mapping sur `shared/errors/catalog.ts`.
3. Contrat: messages utilisateur en francais et codes d'erreur centralises.

### Edge Functions

| Fonction | Role |
|----------|------|
| `api` | API Hono unique (admin users/agencies) |

**Caracteristiques:**
- Runtime Deno
- Rate limiting integre
- Idempotence (retry-safe)
- Validation payload (Zod partage)
- Erreurs standardisees avec `request_id`

### Realtime

| Aspect | Implementation |
|--------|----------------|
| **Protocole** | WebSocket (Phoenix) |
| **Scope** | Table `interactions` |
| **Securite** | RLS applique aux subscriptions |

**Cas d'usage:**
- Sync liste interactions entre TCS
- Detection conflits d'edition
- Timeline live

### CI/CD et QA

1. Le projet n'utilise pas de CI GitHub Actions en production.
2. Le chemin de workflow standard `.github/workflows/ci.yml` est **N/A** (fichier non present par decision produit).
3. Le gate qualite est local et obligatoire via:
   - `scripts/qa-gate.ps1`
   - `docs/qa-runbook.md`
   - `pnpm run qa`

## Ce qu'on n'utilise PAS

| Technologie | Raison du refus |
|-------------|-----------------|
| **Redux** | Overkill, TanStack Query + Context suffisent |
| **TypeORM / Prisma** | Supabase SDK avec types generes suffit |
| **JWT custom** | Supabase Auth l'inclut nativement |
| **Next.js** | Migration lourde, Vite suffit pour SPA |
| **Chakra UI / MUI** | Deja Tailwind, shadcn mieux integre |
| **Socket.io** | Supabase Realtime natif |
| **Axios** | Supabase Client SDK suffit |
| **Moment.js** | Lourd, date-fns est modulaire |
| **Lenis / smooth scroll** | App metier, pas site vitrine |
| **Framer Motion** | Animations pas prioritaires |

## Architecture fichiers

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── CockpitForm.tsx
│   │   ├── Dashboard.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useInteractions.ts   # TanStack Query
│   │   ├── useAgencyConfig.ts
│   │   └── ...
│   ├── schemas/
│   │   ├── ...                    # schemas strictement frontend si necessaire
│   │   └── ...
│   ├── services/
│   │   ├── auth/
│   │   ├── supabase/
│   │   └── ...
│   ├── types/
│   │   ├── supabase.ts      # Types generes
│   │   └── app-session.ts   # Types contexte session
│   └── lib/
│       ├── utils.ts         # cn() pour shadcn
│       └── result.ts        # Result / safeAsync helpers
├── components.json          # Config shadcn
└── tailwind.config.cjs

shared/
├── errors/                  # AppError + catalog + fingerprint
├── schemas/                 # Zod partages (front/back) - ex: interaction.schema.ts
└── supabase.types.ts         # Types Supabase

backend/
├── migrations/              # SQL versionne
├── functions/               # Edge Functions
└── tests/                   # Tests RLS
```

## Dependances principales

```json
{
  "dependencies": {
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "@supabase/supabase-js": "2.95.3",
    "@tanstack/react-query": "5.90.21",
    "react-hook-form": "7.71.1",
    "zod": "4.3.6",
    "@hookform/resolvers": "5.2.2",
    "sonner": "2.0.7",
    "date-fns": "4.1.0",
    "lucide-react": "0.564.0",
    "clsx": "2.1.1",
    "tailwind-merge": "3.4.0"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "vite": "7.3.1",
    "@vitejs/plugin-react": "5.1.2",
    "tailwindcss": "4.1.18",
    "@tailwindcss/vite": "4.1.18",
    "@tailwindcss/postcss": "4.1.18",
    "postcss": "8.5.6",
    "autoprefixer": "10.4.23",
    "@types/node": "25.0.10",
    "eslint": "9.39.2",
    "@eslint/js": "9.39.2",
    "eslint-plugin-react": "7.37.5",
    "eslint-plugin-react-hooks": "7.0.1",
    "globals": "17.0.0",
    "typescript-eslint": "8.53.1"
  }
}
```

## Bundle size estimatif

| Librairie | Taille (gzip) |
|-----------|---------------|
| React + React DOM | ~45kb |
| Supabase Client | ~30kb |
| TanStack Query | ~12kb |
| React Hook Form | ~9kb |
| Zod | ~13kb |
| date-fns (tree-shaken) | ~5kb |
| Sonner | ~5kb |
| shadcn/ui (composants utilises) | ~15kb |
| Lucide (icones utilisees) | ~5kb |
| **Total estime** | **~140kb** |

## Ressources

- [Supabase Docs](https://supabase.com/docs)
- [TanStack Query Docs](https://tanstack.com/query)
- [React Hook Form Docs](https://react-hook-form.com)
- [Zod Docs](https://zod.dev)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [date-fns Docs](https://date-fns.org)
- [Sonner Docs](https://sonner.emilkowal.ski)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)


