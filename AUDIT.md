# AUDIT TECHNIQUE CIR Cockpit - Stack Definitive 2026

Date : 2026-02-19
Perimetre : `frontend/` + `backend/` + `shared/` + projet Supabase `CIR_Cockpit` (`rbjtrcorlezvocayluok`)

---

## 1. Contraintes & Metriques

### 1.1 Contraintes fermes

| # | Contrainte | Impact |
|---|-----------|--------|
| C1 | **Rester sur Supabase** (Postgres, Auth, Edge Functions, Realtime, Storage) | Exclut toute migration vers Neon, PlanetScale, Firebase, self-hosted Postgres |
| C2 | **Pas de CI GitHub** (QA locale uniquement) | La quality gate est un script local + pre-commit hook, pas un pipeline distant |
| C3 | **Zero compromis sur la stack cible** | On ne "differe" rien. Chaque couche recoit sa technologie optimale, meme si le refactoring est lourd |

### 1.2 Metriques projet actuelles

| Metrique | Valeur |
|----------|--------|
| Fichiers `.tsx` (frontend/src) | 233 (hors tests) |
| Fichiers `.ts` (frontend/src) | 214 (hors tests) |
| Tests frontend (Vitest) | 37 fichiers |
| Tests backend (Deno) | 11 fichiers |
| Migrations SQL | 57 fichiers |
| Tables publiques | 14 |
| Fonctions publiques | 23 |
| Triggers | 30 objets |
| Schemas partages (shared/schemas) | 12 fichiers |
| Routes backend (Hono) | 7 fichiers |
| Services backend | 10 fichiers |
| Onglets/pages applicatifs | 5 (cockpit, dashboard, settings, clients, admin) |
| Routeur URL | **Aucun** (navigation par `useState<AppTab>` dans App.tsx) |
| Package manager | npm (frontend) + pnpm workspaces (racine) |
| Bundle splitting | Manuel (tanstack, supabase, forms, icons, react, vendor) |

---

## 2. Stack Actuelle vs Stack Cible (vue synthetique)

| # | Couche | Actuel | Note /10 | Cible | Decision |
|---|--------|--------|----------|-------|----------|
| 1 | Framework Frontend | React 19 | 9 | React 19 | GARDER |
| 2 | Build Tool | Vite 7 | 9 | Vite 7 | GARDER |
| 3 | Routing | `useState<AppTab>` | 2 | **TanStack Router** | CHANGER |
| 4 | Styling | Tailwind CSS 4 | 9 | Tailwind CSS 4 | GARDER |
| 5 | UI Components | shadcn/ui + Radix | 9 | shadcn/ui + Radix | GARDER |
| 6 | State Management | TanStack Query v5 + Zustand | 8 | TanStack Query v5 + Zustand | GARDER |
| 7 | Forms | React Hook Form v7 | 8 | React Hook Form v7 | GARDER |
| 8 | Validation | Zod v4 | 9 | Zod v4 | GARDER |
| 9 | API Layer | Fetch manuel + types manuels | 3 | **tRPC + Hono adapter** | CHANGER |
| 10 | Backend Framework | Hono | 8 | Hono | GARDER |
| 11 | Runtime Backend | Deno | 7 | Deno | GARDER (impose par Supabase) |
| 12 | Database ORM | Supabase Client brut | 4 | **Drizzle ORM** (backend) | CHANGER |
| 13 | Database | Supabase PostgreSQL 17 | 8 | Supabase PostgreSQL 17 | GARDER |
| 14 | Auth | Supabase Auth | 7 | Supabase Auth + hardening | AMELIORER |
| 15 | Testing | Vitest + Deno test | 7 | Vitest + Deno test + Playwright | GARDER |
| 16 | Package Manager | npm (frontend) | 5 | **pnpm** | CHANGER |
| 17 | Monorepo | pnpm-workspace partiel | 4 | **pnpm workspaces complet** | CHANGER |
| 18 | QA Gate | Runbook manuel | 3 | **Script local + Husky pre-commit** | CHANGER |

---

## 3. Evaluation detaillee couche par couche

---

### Couche 1 : Framework Frontend - React 19

**Note actuelle : 9/10**

**Problemes identifies :** Aucun bloquant. React 19 apporte les Server Components, le compilateur React, `use()`, Actions. Le projet n'utilise pas encore le compilateur React mais ca n'est pas bloquant.

**Comparatif :**

| Framework | Bundle (gzip) | Perf (TTI) | DX | Ecosysteme | Fit Supabase |
|-----------|---------------|------------|-----|-----------|-------------|
| **React 19** | ~45 kB | Excellent | Mature, hooks, JSX natif | Immense | Parfait (SDK officiel) |
| Solid.js | ~7 kB | Superieur | Signaux, JSX different | Moyen | SDK communautaire |
| Svelte 5 | ~2 kB | Superieur | Runes, fichiers `.svelte` | Moyen | SDK communautaire |
| Vue 3.5 | ~33 kB | Tres bon | Composition API, SFC | Grand | SDK communautaire |

**Verdict : GARDER React 19.**

Raisons :
- SDK Supabase officiel (`@supabase/supabase-js`) cible React en priorite
- shadcn/ui + Radix sont natifs React
- TanStack Query, React Hook Form, Zustand : tous React-first
- Equipe existante formee React
- React 19 corrige les pain points historiques (pas de memo, compilateur, Actions)
- Migrer vers Solid/Svelte/Vue impliquerait reecrire 233 composants + tous les hooks pour zero gain mesurable sur ce projet

---

### Couche 2 : Build Tool - Vite 7

**Note actuelle : 9/10**

**Problemes identifies :** Aucun. Le HMR est instantane, le build production est rapide, le chunk splitting est deja configure manuellement.

**Comparatif :**

| Outil | Build speed | HMR | Config | Ecosysteme | Fit React |
|-------|------------|-----|--------|-----------|----------|
| **Vite 7** | Rapide (Rolldown) | Instantane | Minimal | Enorme | Natif |
| Turbopack | Rapide | Instantane | Next.js only | Next.js | Next.js only |
| Rspack | Tres rapide | Rapide | Webpack-compat | Croissant | Plugin |
| esbuild | Ultra rapide | Non natif | Programmatique | Limite | Manuel |

**Verdict : GARDER Vite 7.**

Raisons :
- Vite 7 utilise Rolldown (Rust) en interne : performances build au niveau Rspack
- Plugin React officiel (`@vitejs/plugin-react`)
- TanStack Router a un plugin Vite natif pour le code-gen des routes
- Le chunk splitting manuel fonctionne bien
- Zero raison de migrer

---

### Couche 3 : Routing - AUCUN -> TanStack Router

**Note actuelle : 2/10**

**Problemes identifies :**
- Navigation geree par `useState<AppTab>` dans `App.tsx` ligne 27
- Zero URL : impossible de partager un lien vers un client ou un dashboard filtre
- Pas de deep linking : refresh = retour a l'onglet cockpit
- Pas de code splitting : tous les onglets charges simultanement
- Pas de back/forward browser fonctionnel
- Pas de state URL (filtres dashboard, recherche, pagination)
- Le composant `App.tsx` concentre trop de responsabilites (routing + state global + handlers)

**Comparatif :**

| Router | Type-safety | Bundle (gzip) | Code splitting | URL state | Search params | Loader/Action | Fit Vite |
|--------|------------|---------------|---------------|-----------|-------------|---------------|---------|
| **TanStack Router** | Natif (inferred) | ~12 kB | Natif (lazy) | Natif | Schema Zod | Natif | Plugin Vite |
| React Router v7 | Partiel (generics) | ~14 kB | Lazy routes | Partiel | Manuel | Natif | Manuel |
| Wouter | Zero | ~1.5 kB | Non | Non | Non | Non | N/A |
| Next.js App Router | Partiel | N/A (full fw) | Natif | Natif | Partiel | Server Components | Non applicable |

**Verdict : TanStack Router. Non negociable.**

Ce que ca change :
- Chaque vue metier a une URL typee (`/clients/:clientId`, `/dashboard?from=2026-01-01&to=2026-02-19`)
- Les search params sont valides par Zod schemas (meme stack que le reste du projet)
- Code splitting automatique : chaque route = lazy import
- `App.tsx` passe de ~250 lignes a un simple `<RouterProvider>`
- Back/forward/refresh fonctionnent nativement
- Les loaders TanStack Router s'integrent avec TanStack Query (prefetch sur hover)
- Le plugin Vite genere les types de routes automatiquement

Migration estimee : la plus impactante du projet car touche `App.tsx`, tous les composants qui recoivent `activeTab`/`setActiveTab`, et la structure des dossiers.

---

### Couche 4 : Styling - Tailwind CSS 4

**Note actuelle : 9/10**

**Problemes identifies :** Aucun. Tailwind CSS 4 est deja en place avec le plugin Vite natif.

**Comparatif :**

| Solution | Perf runtime | DX | Bundle | Ecosysteme |
|----------|-------------|-----|--------|-----------|
| **Tailwind CSS 4** | Zero runtime | Excellent | Arbre secoue | Immense |
| CSS Modules | Zero runtime | Correct | Scoped | Standard |
| Panda CSS | Build-time | Bon | Arbre secoue | Croissant |
| StyleX (Meta) | Build-time | Bon | Atomique | Naissant |

**Verdict : GARDER Tailwind CSS 4.**

Raisons :
- Tailwind CSS 4 = nouvelle engine Rust, scan automatique, zero config PostCSS
- shadcn/ui est construit sur Tailwind
- `tailwind-merge` + `class-variance-authority` deja en place
- Aucune alternative ne justifie une migration

---

### Couche 5 : UI Components - shadcn/ui + Radix

**Note actuelle : 9/10**

**Problemes identifies :** Aucun. Les primitives Radix sont accessibles (WAI-ARIA), les composants shadcn/ui sont copy-paste et modifiables.

**Comparatif :**

| Librairie | Accessibilite | Personnalisation | Bundle | Maintenance |
|-----------|-------------|----------------|--------|------------|
| **shadcn/ui + Radix** | WAI-ARIA natif | Totale (code source) | Arbre secoue | Active |
| Headless UI | WAI-ARIA | Totale | Leger | Tailwind Labs |
| Mantine | Partiel | Theme + overrides | Plus lourd | Active |
| Ant Design | Partiel | Theme | Lourd | Active |
| Ark UI | WAI-ARIA | Totale | Leger | Active |

**Verdict : GARDER shadcn/ui + Radix.**

Raisons :
- Le code source des composants est dans le projet (`components/ui/`), pas une dependance
- WAI-ARIA complet via Radix primitives
- Integre nativement avec Tailwind CSS
- Aucune raison de migrer

---

### Couche 6 : State Management - TanStack Query v5 + Zustand

**Note actuelle : 8/10**

**Problemes identifies :**
- Quelques query keys non centralisees (la majorite sont dans `queryKeys.ts`)
- Certaines invalidations pourraient etre plus granulaires

**Comparatif :**

| Solution | Server state | Client state | Bundle | DX |
|----------|-------------|-------------|--------|-----|
| **TanStack Query + Zustand** | Excellent | Minimal, cible | ~35 kB + ~2 kB | Excellent |
| TanStack Query + Jotai | Excellent | Atomique | ~35 kB + ~3 kB | Bon |
| SWR + Zustand | Bon | Minimal | ~10 kB + ~2 kB | Simple |
| Redux Toolkit + RTK Query | Bon | Complet mais verbose | ~40 kB | Moyen |

**Verdict : GARDER TanStack Query v5 + Zustand.**

Raisons :
- TanStack Query v5 est le standard pour le server state React
- Zustand est utilise uniquement pour l'error store (scope minimal, correct)
- Les query keys sont deja largement centralisees dans `queryKeys.ts`
- L'integration TanStack Query + TanStack Router (loaders, prefetch) sera un bonus majeur

Amelioration a faire : centraliser les dernieres query keys restantes et ajouter des prefetch dans les loaders TanStack Router.

---

### Couche 7 : Forms - React Hook Form v7

**Note actuelle : 8/10**

**Problemes identifies :** Aucun bloquant. RHF v7 est performant (zero re-render par champ) et integre avec Zod via `@hookform/resolvers`.

**Comparatif :**

| Solution | Perf (re-renders) | Bundle | Validation | DX |
|----------|-------------------|--------|-----------|-----|
| **React Hook Form v7** | Excellent (uncontrolled) | ~9 kB | Zod natif | Mature |
| TanStack Form | Bon | ~10 kB | Zod natif | Nouveau |
| Formik | Moyen (controlled) | ~13 kB | Yup/Zod | Mature |
| Conform | Bon | ~5 kB | Zod natif | Server-first |

**Verdict : GARDER React Hook Form v7.**

Raisons :
- RHF + Zod est le standard etabli pour les formulaires React type-safe
- TanStack Form est plus recent et moins stable (v0)
- Les schemas Zod partages (`shared/schemas/`) s'integrent directement avec `@hookform/resolvers`
- Aucun gain mesurable a migrer

---

### Couche 8 : Validation - Zod v4

**Note actuelle : 9/10**

**Problemes identifies :** Aucun. Zod v4 est deja en place frontend + backend avec import map Deno correct.

**Comparatif :**

| Solution | Bundle (gzip) | Perf | DX | Ecosysteme |
|----------|---------------|------|-----|-----------|
| **Zod v4** | ~13 kB | Bon | Excellent | Immense |
| Valibot | ~1 kB (tree-shake) | Superieur | Bon | Croissant |
| ArkType | ~5 kB | Excellent | Tres bon | Naissant |
| TypeBox | ~10 kB | Tres bon | Moyen | Niche |

**Verdict : GARDER Zod v4.**

Raisons :
- 12 schemas partages front/back dans `shared/schemas/`
- Integration native avec React Hook Form (`@hookform/resolvers`)
- Integration native avec TanStack Router (search params validation)
- Integration native avec tRPC (input/output validation)
- Zod est le denominateur commun de toute la stack cible
- Valibot a un meilleur tree-shaking mais l'ecosysteme d'integration est moins mature
- Le bundle Zod (~13 kB) est acceptable pour un SPA metier

---

### Couche 9 : API Layer - Manuel -> tRPC + Hono

**Note actuelle : 3/10**

**Problemes identifies :**
- Les appels Edge Function sont faits via `fetch` manuel ou `supabase.functions.invoke()`
- Les types de requete/reponse sont maintenus manuellement des deux cotes
- Un changement d'API backend peut casser le frontend silencieusement (aucune erreur au compile-time)
- Le contrat API n'est verifie qu'au runtime
- Il existe deja un client Hono RPC partiel (`services/api/`) mais il ne couvre pas toutes les routes
- 10 services frontend font encore des mutations directes via Supabase Client au lieu de passer par l'Edge Function

**Comparatif :**

| Solution | Type-safety E2E | Bundle client | Perf | Backend fit | Validation |
|----------|----------------|---------------|------|-----------|-----------|
| **tRPC + Hono adapter** | Compile-time, infere | ~8 kB | Excellent | Natif (@trpc/server/adapters/hono) | Zod natif |
| Hono RPC client | Compile-time, infere | Inclus dans hono/client | Excellent | Natif | Manuel |
| GraphQL (Relay/urql) | Schema-first + codegen | ~30-50 kB | Bon (cache normalise) | Separate | Schema SDL |
| OpenAPI + codegen | Schema-first + codegen | ~5 kB genere | Bon | Separate | JSON Schema |
| REST + types manuels | Zero | Zero | Bon | N/A | Manuel |

**Verdict : tRPC + Hono adapter. Non negociable.**

Pourquoi tRPC plutot que Hono RPC client (deja partiellement en place) :

| Critere | Hono RPC | tRPC |
|---------|----------|------|
| Validation input | Manuelle (middleware) | Zod schema sur chaque procedure |
| Validation output | Aucune | Zod schema sur chaque procedure |
| Middleware typees | Non | Oui (context inferee) |
| Subscription (Realtime) | Non | Natif (via WebSocket adapter) |
| Batching requetes | Non | Natif |
| TanStack Query integration | Manuelle | `@trpc/react-query` (hooks generes) |
| Communaute / docs | Limitee | Mature, large communaute |

Ce que ca change :
- Chaque route backend est une procedure tRPC avec input/output Zod
- Le frontend importe les types directement depuis le router tRPC (zero duplication)
- Erreur compile-time si le contrat API change
- Les hooks TanStack Query sont generes automatiquement (`trpc.data.entities.useQuery()`)
- Le batching reduit le nombre de requetes HTTP
- Hono reste le framework HTTP, tRPC s'y monte via `@trpc/server/adapters/hono`

---

### Couche 10 : Backend Framework - Hono

**Note actuelle : 8/10**

**Problemes identifies :** Aucun bloquant. Hono est leger, rapide, et concu pour les edge runtimes.

**Comparatif :**

| Framework | Bundle | Perf | Middleware | Deno support | Edge support |
|-----------|--------|------|-----------|-------------|-------------|
| **Hono** | ~14 kB | Ultra rapide | Chain natif | Natif | Natif |
| Express | ~200 kB | Bon | Immense ecosysteme | Via npm compat | Non |
| Fastify | ~100 kB | Excellent | Plugin system | Via npm compat | Non |
| Elysia | ~20 kB | Ultra rapide | Natif | Non (Bun only) | Bun |
| oak (Deno) | ~30 kB | Bon | Middleware chain | Natif | Non |

**Verdict : GARDER Hono.**

Raisons :
- Concu pour Deno et les edge runtimes (Supabase Edge Functions)
- Adapter tRPC natif (`@trpc/server/adapters/hono`)
- Middleware chain propre (requestId, auth, errorHandler deja en place)
- Ultra leger pour le cold start des Edge Functions

---

### Couche 11 : Runtime Backend - Deno

**Note actuelle : 7/10**

**Problemes identifies :**
- Impose par Supabase Edge Functions (pas de choix)
- Necessite `--no-check` pour les tests a cause des imports URL Hono
- L'import map (`deno.json`) doit etre maintenue manuellement

**Verdict : GARDER Deno (impose par Supabase).**

Pas de comparatif : Supabase Edge Functions ne supportent que Deno. C'est une contrainte ferme.

Amelioration : garder l'import map `deno.json` a jour, utiliser les imports JSR quand disponibles (deja en place pour `@hono/hono` et `@supabase/functions-js`).

---

### Couche 12 : Database ORM - Raw Supabase Client -> Drizzle ORM

**Note actuelle : 4/10**

**Problemes identifies :**
- Les queries backend utilisent `supabase.from('table').select(...)` : les colonnes sont des strings, pas typees au compile-time
- Renommer une colonne en base casse le backend silencieusement (erreur runtime uniquement)
- Les jointures complexes necessitent du SQL brut (`supabase.rpc()`)
- Pas de schema-as-code : le schema DB est defini dans les migrations SQL, mais le code TypeScript ne le refleteque via les types generes Supabase (lecture seule, pas de query building)
- Les types `supabase.types.ts` generes couvrent le typage des resultats mais pas la construction des queries

**Comparatif :**

| ORM | Type-safety queries | Migrations | Bundle | Perf | Deno support | Supabase Postgres |
|-----|-------------------|-----------|--------|------|-------------|------------------|
| **Drizzle ORM** | Compile-time, infere | Drizzle Kit | ~30 kB | Proche du SQL brut | Natif (postgres.js) | Oui (direct connect) |
| Prisma | Codegen (prisma generate) | Prisma Migrate | ~800 kB engine | Bon | Experimental | Oui |
| Kysely | Compile-time, infere | Externe | ~15 kB | Proche du SQL brut | Oui | Oui |
| TypeORM | Decorators, partial | Natif | ~200 kB | Moyen | Non | Oui |
| Supabase Client | Types generes (lecture) | N/A (SQL) | Inclus | Bon | Oui | Natif |

**Verdict : Drizzle ORM (backend uniquement). Non negociable.**

Pourquoi Drizzle et pas Kysely :

| Critere | Drizzle | Kysely |
|---------|---------|--------|
| Schema-as-code | Oui (TypeScript) | Non (types manuels ou introspection) |
| Migrations | Drizzle Kit (auto-generate) | Externe |
| Query builder | SQL-like, infere | SQL-like, infere |
| Relations/jointures | Drizzle Relations API | Jointures manuelles |
| Ecosysteme | Plus large, croissance rapide | Mature, stable |
| Supabase docs | Mentionne dans docs officielles | Non mentionne |

Ce que ca change :
- Le schema DB est defini en TypeScript (`drizzle/schema.ts`), single source of truth
- Les queries sont type-safe au compile-time : `db.select().from(clients).where(eq(clients.agencyId, agencyId))`
- Renommer une colonne = erreur TypeScript immediate partout
- Drizzle Kit genere les migrations SQL automatiquement a partir du diff schema
- Le frontend n'est PAS affecte : Drizzle est backend-only, le frontend passe par tRPC
- Le Supabase Client reste utilise pour Auth et Realtime (pas de remplacement)

**Perimetre Drizzle :**

| Utilisation | Outil |
|------------|-------|
| Queries backend (SELECT, INSERT, UPDATE, DELETE) | Drizzle ORM |
| Migrations | Drizzle Kit (genere le SQL) |
| Auth (signIn, signOut, getUser) | Supabase Client (inchange) |
| Realtime subscriptions | Supabase Client (inchange) |
| Storage (fichiers) | Supabase Client (inchange) |
| Frontend data fetching | tRPC (qui appelle Drizzle cote backend) |

---

### Couche 13 : Database - Supabase PostgreSQL 17

**Note actuelle : 8/10**

**Problemes identifies :**
- RLS activee mais certaines policies pourraient utiliser `(select auth.uid())` pour eviter la reevaluation
- Indexes "unused" signales par les advisors Supabase (a auditer avant suppression)
- `auth_leaked_password_protection` desactive (`WARN` advisor accepte hors scope produit intranet B2B, decision 2026-02-22)

**Verdict : GARDER Supabase PostgreSQL 17.**

Contrainte ferme C1. Postgres 17 est excellent. Les ameliorations sont dans la configuration et les policies, pas dans le moteur.

---

### Couche 14 : Auth - Supabase Auth

**Note actuelle : 7/10**

**Problemes identifies :**
- `auth_leaked_password_protection` desactive (hors scope produit intranet B2B, decision 2026-02-22)
- Le password policy est valide cote backend (`validatePasswordPolicy`) mais pas renforce cote Supabase Auth nativement
- Les sessions sont gerees via `memoryStorage` (correct, pas de localStorage)

**Verdict : GARDER Supabase Auth + hardening pragmatique (intranet B2B).**

Actions :
1. Documenter explicitement l'arbitrage produit: `auth_leaked_password_protection` hors scope pour ce projet intranet B2B.
2. Configurer et maintenir le password strength minimum dans les settings Auth Supabase.
3. Maintenir la verification JWT explicite dans le middleware backend.

---

### Couche 15 : Testing - Vitest + Deno test + Playwright

**Note actuelle : 7/10**

**Problemes identifies :**
- 37 fichiers de tests frontend pour 233 composants = couverture partielle
- Pas de tests E2E automatises en local (Playwright configure mais pas execute regulierement)
- Backend : 11 fichiers de tests pour 10 services = bonne couverture unitaire

**Comparatif :**

| Solution | Vitesse | DX | Ecosysteme | Fit |
|----------|---------|-----|-----------|-----|
| **Vitest** (frontend) | Ultra rapide | Excellent (Vite natif) | Large | Parfait |
| Jest | Rapide | Bon | Immense | Compatible |
| **Deno test** (backend) | Rapide | Natif Deno | Deno std | Impose |
| **Playwright** (E2E) | Bon | Excellent | Large | Parfait |

**Verdict : GARDER Vitest + Deno test + Playwright.**

Raisons :
- Vitest est natif Vite (meme config, meme transforms) : aucune raison de migrer
- Deno test est impose par l'environnement backend
- Playwright est le meilleur choix E2E pour un SPA React
- Priorite : augmenter la couverture, pas changer les outils

---

### Couche 16 : Package Manager - npm -> pnpm

**Note actuelle : 5/10**

**Problemes identifies :**
- `pnpm-workspace.yaml` existe a la racine mais le frontend utilise encore npm (`package-lock.json`)
- Incoherence : le monorepo est pnpm mais le package manager effectif est npm
- npm utilise un flat `node_modules` (phantom dependencies possibles)
- npm est plus lent que pnpm pour l'installation

**Comparatif :**

| Manager | Install speed | Disk usage | Strictness | Workspaces | Monorepo |
|---------|-------------|-----------|-----------|-----------|---------|
| **pnpm** | Rapide | Faible (content-addressable) | Strict (pas de phantom deps) | Natif | Excellent |
| npm | Moyen | Eleve (flat) | Laxiste | Natif | Correct |
| Yarn Berry (PnP) | Rapide | Faible | Strict | Natif | Bon |
| Bun | Ultra rapide | Faible | Laxiste | Natif | Bon |

**Verdict : pnpm. Aligner le frontend sur le monorepo existant.**

Ce que ca change :
- Supprimer `frontend/package-lock.json`, utiliser `pnpm-lock.yaml` a la racine
- `node_modules` en mode symlink (pas de phantom dependencies)
- Un seul lockfile pour tout le projet
- Installation plus rapide, moins d'espace disque

---

### Couche 17 : Monorepo - pnpm workspaces complet

**Note actuelle : 4/10**

**Problemes identifies :**
- `pnpm-workspace.yaml` ne liste que `frontend`
- `shared/` n'est pas un workspace : il est inclus via `tsconfig.json paths` et `vite.config.ts fs.allow`
- Le backend (Deno) ne peut pas etre un workspace npm/pnpm (runtime different)
- Pas de scripts monorepo a la racine (build all, test all, lint all)

**Comparatif :**

| Solution | Config | Multi-runtime | Scripts | Caching |
|----------|--------|-------------|---------|---------|
| **pnpm workspaces** | `pnpm-workspace.yaml` | Via scripts custom | `pnpm -r run` | Non natif |
| Turborepo | `turbo.json` | Via pipelines | `turbo run` | Natif (local + remote) |
| Nx | `nx.json` | Via plugins | `nx run` | Natif |
| Lerna | `lerna.json` | Non | `lerna run` | Via Nx |

**Verdict : pnpm workspaces (sans Turborepo/Nx).**

Raisons :
- Le projet a 2 workspaces effectifs : `frontend` et `shared` (le backend est Deno, hors npm)
- Turborepo/Nx ajoutent de la complexite pour un mono-repo de 2 packages
- pnpm workspaces suffit largement avec des scripts racine
- Si le projet grossit (3+ packages npm), reevaluer Turborepo

Ce que ca change :
- `shared/` devient un workspace pnpm avec son `package.json`
- Les imports `shared/` passent par le workspace protocol (`workspace:*`)
- Un `package.json` racine avec scripts : `pnpm run -r build`, `pnpm run -r test`, `pnpm run -r lint`

---

### Couche 18 : QA Gate - Script local + pre-commit hook

**Note actuelle : 3/10**

**Problemes identifies :**
- La CI GitHub a ete supprimee (fichier `.github/workflows/ci.yml` deleted)
- Le runbook QA est manuel : aucune garantie qu'il est execute avant chaque commit/push
- Pas de pre-commit hook : un commit peut passer sans typecheck ni lint
- Le risque de regression est entierement porte par la discipline humaine

**Comparatif :**

| Solution | Automatisation | Fiabilite | Setup | Overhead |
|----------|-------------|----------|-------|---------|
| CI GitHub Actions | Totale (serveur) | Haute | Medium | Temps pipeline |
| **Husky + lint-staged** | Pre-commit local | Haute | Simple | ~5s par commit |
| Lefthook | Pre-commit local | Haute | Simple | ~5s par commit |
| Script manuel | Zero | Basse | Zero | Discipline humaine |

**Verdict : Husky + lint-staged + script QA complet.**

Ce que ca change :
- **Pre-commit hook** (Husky) : lint-staged execute ESLint + Prettier sur les fichiers modifies
- **Pre-push hook** (Husky) : execute le script QA complet (typecheck + lint + tests + build)
- **Script `scripts/qa-gate.sh`** : enchaine toutes les verifications front + back en un seul appel
- Garantie : aucun push ne part sans QA verte

---

## 4. Stack Cible Definitive

```
Frontend
  Framework          React 19
  Build              Vite 7 (Rolldown)
  Routing            TanStack Router (file-based, type-safe)
  Styling            Tailwind CSS 4
  UI Components      shadcn/ui + Radix
  State (server)     TanStack Query v5
  State (client)     Zustand (error store)
  Forms              React Hook Form v7
  Validation         Zod v4
  API Client         tRPC (@trpc/react-query)

Backend
  Framework          Hono (Edge Function unique)
  Runtime            Deno (Supabase Edge Functions)
  API Layer          tRPC (@trpc/server/adapters/hono)
  ORM                Drizzle ORM (queries type-safe)
  Database           Supabase PostgreSQL 17
  Auth               Supabase Auth (policy locale + settings standards; leaked password hors scope)
  Validation         Zod v4 (schemas partages)

Shared
  Schemas            Zod v4 (shared/schemas/)
  Errors             AppError + catalog (shared/errors/)
  Types              Supabase types generes + overrides
  tRPC Router Type   Exporte depuis backend, importe par frontend

Tooling
  Package Manager    pnpm
  Monorepo           pnpm workspaces (frontend + shared)
  Testing            Vitest (frontend) + Deno test (backend) + Playwright (E2E)
  QA Gate            scripts/qa-gate.sh + Husky pre-commit/pre-push
  Linting            ESLint (strict, --max-warnings=0)
  TypeScript         5.9 (strict: true)
```

---

## 5. Plan de migration en 5 phases

---

### Phase 1 : Fondations (pnpm, workspaces, QA gate)

**Duree estimee : 1 jour**

#### Packages a installer

```bash
# A la racine
pnpm add -Dw husky lint-staged
```

#### Etapes

1. **Aligner sur pnpm**
   - Supprimer `frontend/package-lock.json`
   - Ajouter `shared/package.json` minimal :
     ```json
     {
       "name": "@cir/shared",
       "version": "0.0.0",
       "private": true,
       "type": "module",
       "exports": {
         "./errors": "./errors/index.ts",
         "./errors/*": "./errors/*.ts",
         "./schemas": "./schemas/index.ts",
         "./schemas/*": "./schemas/*.ts"
       }
     }
     ```
   - Mettre a jour `pnpm-workspace.yaml` :
     ```yaml
     packages:
       - 'frontend'
       - 'shared'
     ```
   - Ajouter `@cir/shared` comme dependance dans `frontend/package.json` :
     ```json
     "@cir/shared": "workspace:*"
     ```
   - Executer `pnpm install` depuis la racine
   - Verifier que tout compile et que les tests passent

2. **Scripts racine**
   - Ajouter dans `package.json` racine :
     ```json
     {
       "scripts": {
         "build": "pnpm -r run build",
         "test": "pnpm --filter frontend run test:run",
         "lint": "pnpm -r run lint",
         "typecheck": "pnpm -r run typecheck",
         "qa": "bash scripts/qa-gate.sh"
       }
     }
     ```

3. **Script QA**
   - Creer `scripts/qa-gate.sh` :
     ```bash
     #!/usr/bin/env bash
     set -euo pipefail

     echo "=== QA Gate ==="

     echo "[1/6] Frontend typecheck"
     pnpm --filter frontend run typecheck

     echo "[2/6] Frontend lint"
     pnpm --filter frontend run lint

     echo "[3/6] Frontend tests"
     pnpm --filter frontend run test:run

     echo "[4/6] Frontend build"
     pnpm --filter frontend run build

     echo "[5/6] Backend lint"
     deno lint backend/functions/api

     echo "[6/6] Backend tests"
     deno test --allow-env --no-check --config backend/deno.json backend/functions/api

     echo "=== QA Gate PASS ==="
     ```

4. **Husky + lint-staged**
   - `pnpm exec husky init`
   - Pre-commit hook (`.husky/pre-commit`) :
     ```bash
     pnpm exec lint-staged
     ```
   - Pre-push hook (`.husky/pre-push`) :
     ```bash
     bash scripts/qa-gate.sh
     ```
   - Config lint-staged dans `package.json` racine :
     ```json
     "lint-staged": {
       "frontend/src/**/*.{ts,tsx}": [
         "eslint --max-warnings=0"
       ]
     }
     ```

#### Checklist de verification

- [ ] `pnpm install` fonctionne depuis la racine
- [ ] `pnpm --filter frontend run build` produit un build valide
- [ ] `pnpm --filter frontend run test:run` passe
- [ ] `bash scripts/qa-gate.sh` passe integralement
- [ ] Un commit declenche lint-staged
- [ ] Un push declenche le script QA complet

---

### Phase 2 : TanStack Router

**Duree estimee : 2-3 jours**

#### Packages a installer

```bash
cd frontend
pnpm add @tanstack/react-router @tanstack/router-devtools
pnpm add -D @tanstack/router-plugin
```

#### Fichiers a creer

```
frontend/src/
  routes/
    __root.tsx              # Layout racine (AppHeader, ErrorBoundary, Providers)
    index.tsx               # Redirect vers /cockpit
    cockpit.tsx             # Route /cockpit
    dashboard.tsx           # Route /dashboard (search params Zod)
    clients/
      index.tsx             # Route /clients (liste)
      $clientId.tsx         # Route /clients/:clientId (detail)
    settings.tsx            # Route /settings
    admin.tsx               # Route /admin
  routeTree.gen.ts          # Auto-genere par le plugin Vite
```

#### Etapes

1. **Ajouter le plugin Vite**
   ```ts
   // vite.config.ts
   import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

   export default defineConfig({
     plugins: [
       TanStackRouterVite(),
       react(),
       tailwindcss(),
     ],
   })
   ```

2. **Creer le router**
   ```ts
   // frontend/src/router.ts
   import { createRouter } from '@tanstack/react-router'
   import { routeTree } from './routeTree.gen'

   export const router = createRouter({ routeTree })

   declare module '@tanstack/react-router' {
     interface Register {
       router: typeof router
     }
   }
   ```

3. **Migrer `App.tsx`**
   - Remplacer le `useState<AppTab>` par `<RouterProvider router={router} />`
   - Deplacer la logique de gate (login, change-password) dans `__root.tsx`
   - Deplacer chaque contenu d'onglet dans sa route

4. **Migrer les search params**
   - Dashboard : filtres date, statut, type -> search params Zod
   - Clients : recherche, pagination -> search params Zod
   - Admin : onglet actif -> search params

5. **Ajouter le code splitting**
   ```ts
   // frontend/src/routes/dashboard.tsx
   import { createFileRoute } from '@tanstack/react-router'
   import { z } from 'zod/v4'

   const dashboardSearchSchema = z.object({
     from: z.string().optional(),
     to: z.string().optional(),
     status: z.string().optional(),
   })

   export const Route = createFileRoute('/dashboard')({
     validateSearch: dashboardSearchSchema,
     component: () => import('../components/Dashboard'),
   })
   ```

6. **Supprimer l'ancien routing**
   - Supprimer le type `AppTab` de `types.ts`
   - Supprimer `setActiveTab` et toutes les props de navigation state
   - Simplifier `AppHeader` pour utiliser `<Link>` TanStack Router

#### Checklist de verification

- [ ] Chaque ancienne "tab" a une URL dedie
- [ ] Back/forward navigateur fonctionne
- [ ] Refresh conserve la page et les filtres
- [ ] Le code splitting fonctionne (verifier les chunks dans `dist/assets/`)
- [ ] Les search params sont valides par Zod
- [ ] `App.tsx` est reduit a <30 lignes
- [ ] Tous les tests existants passent
- [ ] QA gate passe

---

### Phase 3 : tRPC

**Duree estimee : 2-3 jours**

#### Packages a installer

```bash
# Frontend
cd frontend
pnpm add @trpc/client @trpc/react-query @trpc/server

# Backend (deno.json imports)
# Ajouter dans backend/deno.json :
# "@trpc/server": "npm:@trpc/server@11"
# "@trpc/server/": "npm:@trpc/server@11/"
```

#### Fichiers a creer/modifier

```
backend/functions/api/
  trpc/
    context.ts              # Contexte tRPC (user, supabase client, agency_id)
    router.ts               # Router racine
    procedures.ts           # publicProcedure, protectedProcedure, adminProcedure
  routes/
    dataEntities.trpc.ts    # Procedures entities (migration depuis REST)
    dataInteractions.trpc.ts
    dataEntityContacts.trpc.ts
    dataConfig.trpc.ts
    dataProfile.trpc.ts
    adminUsers.trpc.ts
    adminAgencies.trpc.ts

frontend/src/
  services/api/
    trpc.ts                 # Client tRPC + hooks
```

#### Etapes

1. **Creer le contexte tRPC backend**
   ```ts
   // backend/functions/api/trpc/context.ts
   import type { Context } from '@hono/hono'

   export async function createContext(c: Context) {
     // Extraire user du middleware auth existant
     return {
       user: c.get('user'),
       supabase: c.get('supabase'),
       agencyId: c.get('agencyId'),
     }
   }
   ```

2. **Creer les procedures de base**
   ```ts
   // backend/functions/api/trpc/procedures.ts
   import { initTRPC, TRPCError } from '@trpc/server'
   import { z } from 'zod/v4'

   const t = initTRPC.context<Context>().create()

   export const publicProcedure = t.procedure
   export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
     if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
     return next({ ctx: { ...ctx, user: ctx.user } })
   })
   export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
     if (ctx.user.role === 'tcs') throw new TRPCError({ code: 'FORBIDDEN' })
     return next({ ctx })
   })
   ```

3. **Migrer les routes une par une**
   - Commencer par `dataEntities` (la plus utilisee)
   - Chaque route Hono REST devient une procedure tRPC avec input/output Zod
   - Les schemas partages (`shared/schemas/`) deviennent les inputs/outputs tRPC
   - Garder les routes Hono REST en parallele pendant la migration

4. **Monter tRPC sur Hono**
   ```ts
   // backend/functions/api/app.ts
   import { trpcServer } from '@trpc/server/adapters/hono'
   import { appRouter } from './trpc/router'
   import { createContext } from './trpc/context'

   app.use('/trpc/*', trpcServer({ router: appRouter, createContext }))
   ```

5. **Client tRPC frontend**
   ```ts
   // frontend/src/services/api/trpc.ts
   import { createTRPCReact } from '@trpc/react-query'
   import type { AppRouter } from '../../../backend/functions/api/trpc/router'

   export const trpc = createTRPCReact<AppRouter>()
   ```

6. **Migrer les hooks frontend**
   - Remplacer les `useQuery` manuels par `trpc.data.entities.useQuery()`
   - Remplacer les `useMutation` manuels par `trpc.data.entities.save.useMutation()`
   - Supprimer les types manuels de requete/reponse

#### Checklist de verification

- [ ] Chaque procedure tRPC a un input ET output Zod
- [ ] Le type `AppRouter` est exporte et importe par le frontend sans erreur
- [ ] Modifier un champ dans un schema backend casse le frontend au compile-time
- [ ] Les anciennes routes REST sont supprimees apres migration complete
- [ ] Les tests backend couvrent les nouvelles procedures
- [ ] QA gate passe

---

### Phase 4 : Drizzle ORM

**Duree estimee : 3-5 jours**

#### Packages a installer

```bash
# Backend (deno.json imports)
# "drizzle-orm": "npm:drizzle-orm@latest"
# "drizzle-orm/": "npm:drizzle-orm@latest/"
# "postgres": "npm:postgres@3"

# Dev (racine, pour drizzle-kit)
pnpm add -Dw drizzle-kit
```

#### Fichiers a creer

```
backend/
  drizzle/
    schema.ts               # Schema Drizzle (toutes les tables)
    relations.ts            # Relations entre tables
    index.ts                # Export db instance
    migrate.ts              # Script migration
  drizzle.config.ts         # Config Drizzle Kit
```

#### Etapes

1. **Introspection du schema existant**
   ```bash
   pnpm drizzle-kit introspect --dialect=postgresql --url=$DATABASE_URL
   ```
   Cela genere le schema Drizzle a partir de la base existante.

2. **Definir le schema TypeScript**
   ```ts
   // backend/drizzle/schema.ts
   import { pgTable, uuid, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core'

   export const agencies = pgTable('agencies', {
     id: uuid('id').primaryKey().defaultRandom(),
     name: text('name').notNull(),
     createdAt: timestamp('created_at').defaultNow(),
     // ...
   })

   export const clients = pgTable('clients', {
     id: uuid('id').primaryKey().defaultRandom(),
     agencyId: uuid('agency_id').notNull().references(() => agencies.id),
     firstName: text('first_name').notNull(),
     lastName: text('last_name').notNull(),
     // ...
   })
   // ... toutes les 14 tables
   ```

3. **Creer l'instance DB**
   ```ts
   // backend/drizzle/index.ts
   import { drizzle } from 'drizzle-orm/postgres-js'
   import postgres from 'postgres'
   import * as schema from './schema'

   export function createDb(connectionString: string) {
     const client = postgres(connectionString)
     return drizzle(client, { schema })
   }
   ```

4. **Migrer les services backend**
   - Remplacer `supabase.from('clients').select(...)` par `db.select().from(clients).where(...)`
   - Migrer service par service (commencer par `dataEntities`, puis `dataInteractions`, etc.)
   - Les procedures tRPC appellent Drizzle au lieu du Supabase Client pour les queries
   - Le Supabase Client reste pour Auth et Realtime

5. **Gerer les migrations**
   - Les futures migrations sont generees par `drizzle-kit generate`
   - Elles produisent des fichiers SQL dans `backend/migrations/` (meme format actuel)
   - Les migrations existantes (57 fichiers) restent telles quelles
   - Drizzle Kit s'appuie sur le schema TypeScript pour generer les diff

6. **Gerer la connexion DB dans Edge Functions**
   - Supabase Edge Functions ont acces a `Deno.env.get('SUPABASE_DB_URL')`
   - Utiliser `postgres` (postgres.js) pour la connexion directe
   - Alternative : utiliser le pooler Supabase (port 6543) pour le connection pooling

7. **Mode d'autorisation Drizzle (obligatoire)**
   - Drizzle ne doit jamais affaiblir la securite multi-tenant.
   - Toute procedure/backend route doit recevoir un `authContext` valide (middleware auth) avant toute query.
   - Interdire toute query Drizzle sans garde explicite (`ensureAgencyAccess`, `ensureOptionalAgencyAccess`, controle role).
   - Tant que la propagation "user-scoped SQL" n'est pas prouvee pour un parcours, conserver `userDb` (Supabase client scope utilisateur) sur ce parcours.
   - Exiger des tests de parite d'autorisation avant migration complete d'un service vers Drizzle.

#### Checklist de verification

- [ ] Le schema Drizzle couvre les 14 tables publiques
- [ ] Les queries backend sont type-safe (erreur TypeScript si colonne incorrecte)
- [ ] Les migrations existantes ne sont pas affectees
- [ ] `drizzle-kit generate` produit des migrations correctes pour les changements futurs
- [ ] Les performances des queries sont equivalentes ou meilleures
- [ ] Le Supabase Client est toujours utilise pour Auth et Realtime
- [ ] Aucune query Drizzle n'est executee sans controle `authContext`/`agency_id`
- [ ] Les parcours user-scoped gardent `userDb` tant que la parite d'autorisation n'est pas demontree
- [ ] QA gate passe

---

### Phase 5 : Securite Supabase (scope intranet B2B)

**Duree estimee : 1-2 jours**

#### Etapes

1. **Arbitrage produit: leaked password protection hors scope**
   - Decision explicite: application B2B intranet, critere non bloquant.
   - Conserver la preuve advisor `WARN` dans le journal de suivi.
   - Reevaluer uniquement en cas de changement de contexte (exposition internet / nouvelles exigences securite).

2. **Audit RLS complet**
   ```sql
   -- Verifier que toutes les tables publiques ont RLS activee
   SELECT schemaname, tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';

   -- Lister toutes les policies
   SELECT tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies
   WHERE schemaname = 'public';
   ```

3. **Optimiser les policies RLS**
   - Remplacer `auth.uid()` par `(select auth.uid())` dans les policies pour eviter la reevaluation par ligne :
     ```sql
     -- Avant (reevalue auth.uid() pour chaque ligne)
     CREATE POLICY "select_own" ON clients
       FOR SELECT USING (agency_id IN (
         SELECT agency_id FROM agency_system_users WHERE user_id = auth.uid()
       ));

     -- Apres (evalue auth.uid() une seule fois)
     CREATE POLICY "select_own" ON clients
       FOR SELECT USING (agency_id IN (
         SELECT agency_id FROM agency_system_users WHERE user_id = (select auth.uid())
       ));
     ```

4. **Auditer les indexes**
   ```sql
   -- Indexes jamais utilises
   SELECT
     schemaname, relname, indexrelname,
     idx_scan, idx_tup_read, idx_tup_fetch,
     pg_size_pretty(pg_relation_size(indexrelid)) AS size
   FROM pg_stat_user_indexes
   WHERE idx_scan = 0
   ORDER BY pg_relation_size(indexrelid) DESC;
   ```
   - Pour chaque index unused : verifier avec `EXPLAIN ANALYZE` sur les requetes critiques
   - Supprimer uniquement si aucune requete ne l'utilise

5. **Verifier les policies avec les 3 roles**
   ```sql
   -- En tant que anon (pas d'acces)
   SET ROLE anon;
   SELECT * FROM clients; -- doit etre vide ou erreur

   -- En tant que authenticated (filtre par agency_id)
   SET ROLE authenticated;
   SET request.jwt.claims = '{"sub": "user-id"}';
   SELECT * FROM clients; -- doit etre filtre

   -- En tant que service_role (acces total)
   SET ROLE service_role;
   SELECT * FROM clients; -- acces complet
   ```

6. **Service Role Key hygiene**
   - Verifier que la `service_role` key n'est jamais exposee cote frontend
   - Verifier qu'aucune variable `VITE_*` ne contient de secret serveur
   - Limiter l'usage service role au backend/Edge Functions

7. **Separation `anon` / `authenticated`**
   - Verifier qu'aucune table metier n'accorde de lecture a `anon`
   - Verifier que les endpoints publics sont strictement limites aux flux auth necessaires

#### Checklist de verification

- [x] Arbitrage scope documente: `auth_leaked_password_protection` non requis pour ce projet intranet B2B (decision 2026-02-22)
- [ ] Toutes les tables publiques ont RLS activee
- [ ] Les policies utilisent `(select auth.uid())` (pas `auth.uid()` nu)
- [ ] Les indexes unused sont documentes (gardes ou supprimes avec justification)
- [ ] Les 3 roles (anon, authenticated, service_role) sont testes sur chaque table
- [ ] La `service_role` key n'est exposee nulle part cote frontend
- [ ] Le role `anon` n'a aucun acces lecture aux tables metier

---

## 6. QA sans CI (strategie complete)

### 7.1 Script QA Gate

```bash
#!/usr/bin/env bash
# scripts/qa-gate.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

pass() { echo -e "${GREEN}PASS${NC} $1"; }
fail() { echo -e "${RED}FAIL${NC} $1"; exit 1; }

echo "=========================================="
echo "  CIR Cockpit - QA Gate"
echo "=========================================="
echo ""

echo "[1/7] Frontend typecheck..."
pnpm --filter frontend run typecheck && pass "typecheck" || fail "typecheck"

echo "[2/7] Frontend lint..."
pnpm --filter frontend run lint && pass "lint" || fail "lint"

echo "[3/7] Frontend tests..."
pnpm --filter frontend run test:run && pass "tests frontend" || fail "tests frontend"

echo "[4/7] Frontend error compliance..."
pnpm --filter frontend run check:error-compliance && pass "error compliance" || fail "error compliance"

echo "[5/7] Frontend build..."
pnpm --filter frontend run build && pass "build" || fail "build"

echo "[6/7] Backend lint..."
deno lint backend/functions/api && pass "backend lint" || fail "backend lint"

echo "[7/7] Backend tests..."
deno test --allow-env --no-check --config backend/deno.json backend/functions/api && pass "backend tests" || fail "backend tests"

echo ""
echo "=========================================="
echo -e "  ${GREEN}QA Gate PASS${NC}"
echo "=========================================="
```

### 7.2 Pre-commit Hook (Husky + lint-staged)

`.husky/pre-commit` :
```bash
pnpm exec lint-staged
```

Config `lint-staged` (dans `package.json` racine) :
```json
{
  "lint-staged": {
    "frontend/src/**/*.{ts,tsx}": [
      "eslint --max-warnings=0"
    ]
  }
}
```

Effet : chaque `git commit` lint les fichiers modifies. Rapide (~5s), non intrusif.

### 7.3 Pre-push Hook (QA complete)

`.husky/pre-push` :
```bash
bash scripts/qa-gate.sh
```

Effet : chaque `git push` execute la QA complete. Bloque le push si un check echoue.

### 7.4 Runbook Deploy Backend

Procedure obligatoire pour deployer l'Edge Function `api` :

```bash
# 1. QA gate verte
bash scripts/qa-gate.sh

# 2. Deploy
supabase functions deploy api \
  --project-ref rbjtrcorlezvocayluok \
  --use-api \
  --import-map deno.json \
  --no-verify-jwt

# 3. Verification post-deploy
# Via MCP ou curl :
# - GET /functions/v1/api/health -> 200
# - POST /functions/v1/api/data/entities -> 200 (avec token valide)
# - OPTIONS /functions/v1/api/data/entities -> CORS headers presents
# - Verifier version/hash via list_edge_functions
```

---

## 7. Fichiers critiques & checklist finale

### 8.1 Fichiers a creer (par phase)

| Phase | Fichier | Role |
|-------|---------|------|
| 1 | `shared/package.json` | Workspace package pour shared |
| 1 | `scripts/qa-gate.sh` | Script QA complet |
| 1 | `.husky/pre-commit` | Hook lint-staged |
| 1 | `.husky/pre-push` | Hook QA gate |
| 2 | `frontend/src/routes/__root.tsx` | Layout racine TanStack Router |
| 2 | `frontend/src/routes/cockpit.tsx` | Route /cockpit |
| 2 | `frontend/src/routes/dashboard.tsx` | Route /dashboard |
| 2 | `frontend/src/routes/clients/index.tsx` | Route /clients |
| 2 | `frontend/src/routes/clients/$clientId.tsx` | Route /clients/:id |
| 2 | `frontend/src/routes/settings.tsx` | Route /settings |
| 2 | `frontend/src/routes/admin.tsx` | Route /admin |
| 2 | `frontend/src/router.ts` | Config router |
| 3 | `backend/functions/api/trpc/context.ts` | Contexte tRPC |
| 3 | `backend/functions/api/trpc/router.ts` | Router tRPC racine |
| 3 | `backend/functions/api/trpc/procedures.ts` | Procedures de base |
| 3 | `frontend/src/services/api/trpc.ts` | Client tRPC |
| 4 | `backend/drizzle/schema.ts` | Schema Drizzle |
| 4 | `backend/drizzle/relations.ts` | Relations |
| 4 | `backend/drizzle/index.ts` | Instance DB |
| 4 | `backend/drizzle.config.ts` | Config Drizzle Kit |

### 8.2 Fichiers a modifier (principaux)

| Fichier | Modification |
|---------|-------------|
| `pnpm-workspace.yaml` | Ajouter `shared` |
| `package.json` (racine) | Scripts monorepo + lint-staged + devDeps |
| `frontend/package.json` | Nouvelles deps (TanStack Router, tRPC client) |
| `backend/deno.json` | Imports tRPC, Drizzle, postgres |
| `frontend/vite.config.ts` | Plugin TanStack Router |
| `frontend/src/App.tsx` | Remplacer par RouterProvider |
| `frontend/src/types.ts` | Supprimer AppTab |
| `frontend/src/components/AppHeader.tsx` | Links TanStack Router |
| `frontend/src/components/AppMainContent.tsx` | Supprimer (remplace par routes) |
| `backend/functions/api/app.ts` | Monter tRPC sur Hono |
| `backend/functions/api/services/*.ts` | Migrer vers Drizzle |

### 8.3 Fichiers a supprimer

| Fichier | Raison |
|---------|--------|
| `frontend/package-lock.json` | Remplace par pnpm-lock.yaml racine |
| `.github/workflows/ci.yml` | CI GitHub supprimee (deja deleted) |
| `frontend/src/components/AppMainContent.tsx` | Remplace par le routing TanStack Router |
| `frontend/src/app/appConstants.tsx` (partiel) | `buildNavigationTabs()` remplace par config router |

### 8.4 Checklist finale

- [ ] **Phase 1** : pnpm install fonctionne, QA gate passe, hooks Husky actifs
- [ ] **Phase 2** : chaque page a une URL, back/forward/refresh OK, code splitting OK
- [ ] **Phase 3** : type-safety end-to-end (modifier un schema backend = erreur TypeScript frontend)
- [ ] **Phase 4** : queries backend type-safe (renommer une colonne = erreur TypeScript)
- [ ] **Phase 5** : scope intranet applique, RLS auditee, indexes audites
- [ ] **Global** : QA gate passe a chaque phase, zero regression, zero `any`

---

## 8. Sources

Supabase :
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/functions/auth
- https://supabase.com/docs/guides/api/api-keys

TanStack :
- https://tanstack.com/router/latest
- https://tanstack.com/query/latest

tRPC :
- https://trpc.io/docs
- https://trpc.io/docs/server/adapters/hono

Drizzle :
- https://orm.drizzle.team/docs/overview
- https://orm.drizzle.team/docs/get-started/supabase-new

Tooling :
- https://pnpm.io/workspaces
- https://typicode.github.io/husky/
- https://github.com/lint-staged/lint-staged
