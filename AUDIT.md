# Audit Complet CIR Cockpit - Stack Technique & Recommandations

> **Date :** 16 fevrier 2026
> **Scope :** Audit exhaustif de l'architecture, des choix techniques, et recommandations pour la stack ideale.
> **Projet :** CIR Cockpit - CRM B2B multi-tenant (gestion interactions clients/prospects/contacts)

---

## Table des matieres

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Evaluation couche par couche](#2-evaluation-couche-par-couche)
   - 2.1 [Framework Frontend : React 19](#21-framework-frontend--react-19)
   - 2.2 [Build Tool / Meta-framework : Vite 7 SPA](#22-build-tool--meta-framework--vite-7-spa)
   - 2.3 [Styling : Tailwind CSS 4](#23-styling--tailwind-css-4)
   - 2.4 [Composants UI : shadcn/ui + Radix](#24-composants-ui--shadcnui--radix)
   - 2.5 [State Management : TanStack Query v5 + Context + Zustand](#25-state-management--tanstack-query-v5--context--zustand)
   - 2.6 [Formulaires : React Hook Form v7](#26-formulaires--react-hook-form-v7)
   - 2.7 [Validation : Zod v4](#27-validation--zod-v4)
   - 2.8 [Routing : Aucun](#28-routing--aucun)
   - 2.9 [Backend : Hono sur Supabase Edge Functions](#29-backend--hono-sur-supabase-edge-functions)
   - 2.10 [Runtime : Deno](#210-runtime--deno)
   - 2.11 [Database : PostgreSQL via Supabase](#211-database--postgresql-via-supabase)
   - 2.12 [ORM / Query Layer : Raw Supabase Client](#212-orm--query-layer--raw-supabase-client)
   - 2.13 [Auth : Supabase Auth](#213-auth--supabase-auth)
   - 2.14 [Testing : Vitest + Deno test + Playwright](#214-testing--vitest--deno-test--playwright)
   - 2.15 [Package Manager : npm](#215-package-manager--npm)
   - 2.16 [Monorepo : Aucun](#216-monorepo--aucun)
   - 2.17 [CI/CD : GitHub Actions](#217-cicd--github-actions)
3. [Stack ideale recommandee](#3-stack-ideale-recommandee)
4. [Classement par effort/valeur](#4-classement-par-effortvaleur)
5. [Strategie de migration detaillee](#5-strategie-de-migration-detaillee)
6. [Fichiers critiques pour l'implementation](#6-fichiers-critiques-pour-limplementation)
7. [Checklist de verification](#7-checklist-de-verification)
8. [Validation factuelle de cet audit (17/02/2026)](#8-validation-factuelle-de-cet-audit-17022026)
9. [Grand chapitre: Sortir de Supabase vers une stack PostgreSQL plus ouverte](#9-grand-chapitre-sortir-de-supabase-vers-une-stack-postgresql-plus-ouverte)
10. [Sources et references](#10-sources-et-references)

---

## 1. Vue d'ensemble du projet

### Ce qu'est CIR Cockpit

CRM B2B multi-tenant pour la gestion des interactions clients, prospects et contacts. Utilise par des agences avec 3 niveaux de roles :

- **super_admin** : acces global, gestion agences et utilisateurs
- **agency_admin** : gestion de son agence, parametrage, clients
- **tcs** : operateur terrain, creation d'interactions et consultation

### Metriques du projet

| Metrique | Valeur |
|----------|--------|
| Fichiers frontend | ~484 |
| Fichiers backend | ~32 |
| Tables PostgreSQL | 14 |
| Migrations SQL | 53 (50 appliquees) |
| Triggers | 30 |
| Functions SQL | 23 |
| Tests frontend (Vitest) | ~101 |
| Tests backend (Deno) | ~40 |
| Composants React | ~100+ .tsx |
| Custom hooks | ~76 |
| Fonctions service | ~80+ |
| Bundle estime | ~140KB gzip |

### Stack actuelle resumee

```
Frontend:         React 19.2.4 + Vite 7.3.1 + TypeScript 5.9.3
Styling:          Tailwind CSS 4.1.18 + shadcn/ui (Radix UI)
State:            TanStack Query v5.90.21 + Zustand 5.0.11 + React Context
Forms:            React Hook Form 7.71.1 + @hookform/resolvers 5.2.2 + Zod 4.3.6
Backend:          Hono (Deno) sur Supabase Edge Functions - slug unique "api"
Database:         PostgreSQL 15+ via Supabase avec RLS multi-tenant
Auth:             Supabase Auth (JWT, admin-only creation, password policies)
Testing:          Vitest (frontend) + Deno test (backend) + Playwright (E2E local)
CI:               GitHub Actions (lint + typecheck + build)
Package Manager:  npm
Monorepo:         Aucun (shared/ manuel via tsconfig paths)
Routing:          Aucun (tab-based useState)
SSR/SSG:          Aucun (SPA pure)
```

### Patterns architecturaux en place

- Single Edge Function avec Hono routing (`app.route()` sub-routers)
- Service layer avec pure functions exportees pour testabilite
- Systeme AppError avec catalog de codes + fingerprint + severity
- Result types via `neverthrow` (`ResultAsync<T, AppError>`)
- Multi-tenancy via RLS (`agency_id` sur toutes les tables)
- Rate limiting au niveau API
- Audit logging avec archivage
- Code splitting vendor (manualChunks dans vite.config.ts)
- Error pipeline : `normalizeError()` -> `reportError()` -> `notifyError()`

---

## 2. Evaluation couche par couche

---

### 2.1 Framework Frontend : React 19

**Note : 9/10 -- GARDER**

React 19 est le choix optimal pour ce projet. L'ecosysteme pour un CRM B2B est inegalable : TanStack Query, React Hook Form, Radix, shadcn/ui ciblent React en priorite. Le codebase l'utilise de maniere idiomatique : composants fonctionnels uniquement, TypeScript strict (`strict: true`, `noUnusedLocals`, `noUnusedParameters`), hooks-based architecture avec 76+ custom hooks, separation nette composants/hooks/services.

React 19 apporte :
- Hook `use()` pour lire des promesses et du contexte dans le rendu
- Suspense ameliore
- Actions et `useOptimistic` pour les mutations optimistes
- Meilleure gestion du server state

**Alternatives considerees en detail :**

| Framework | Forces | Faiblesses pour CE projet | Ecosysteme B2B |
|-----------|--------|--------------------------|----------------|
| **React 19** | Ecosysteme le plus large, shadcn/ui, TanStack, Radix, RHF, communaute massive | Virtual DOM overhead (negligeable ici) | 10/10 |
| **Solid.js 2** | Pas de virtual DOM, reactivite fine, performances brutes superieures | Ecosysteme 10x plus petit, pas de shadcn/ui, pas de Radix, pas de RHF | 4/10 |
| **Svelte 5 (Runes)** | Syntaxe elegante, bundle plus petit, reactivite compile-time | Ecosysteme B2B insuffisant, pas d'equivalent TanStack Query mature | 5/10 |
| **Vue 3.5** | Composition API solide, bon outillage | Ecosysteme CRM/admin inferieur (Radix, shadcn inexistants nativement) | 6/10 |

**Pourquoi pas Solid.js malgre les performances ?**
Le delta de performance avec Solid est negligeable pour un CRM. Le projet n'affiche pas de listes a 10K+ items dans le viewport (virtualisation via `@tanstack/react-virtual` est deja en place). Solid.js forcerait a réécrire TOUT : les 100+ composants, 76 hooks, et a trouver des alternatives pour shadcn/ui, Radix, React Hook Form, TanStack Query (qui a un adaptateur Solid mais moins mature).

**Pourquoi pas Svelte 5 ?**
Le systeme Runes est elegant mais le projet perdrait l'integration shadcn/ui (qui est la colonne vertebrale UI), TanStack Query (adapter Svelte moins teste), et React Hook Form (pas d'equivalent Svelte aussi mature). L'ecosysteme de composants accessibles pour Svelte est en retard vs Radix.

**Verdict :** React 19 est le bon choix. Le cout de migration vers un autre framework serait enorme pour un gain marginal sur ce type de projet.

---

### 2.2 Build Tool / Meta-framework : Vite 7 SPA

**Note : 6/10 -- Vite est excellent, mais l'absence de meta-framework/routeur est un probleme**

Vite 7 est le meilleur bundler pour un SPA React en 2026 :
- HMR quasi-instantane via ESM natif
- Plugin React fast refresh
- Code splitting via Rollup
- Support TypeScript natif
- Plugin Tailwind CSS integre

Le projet l'utilise bien : port 3000, filesystem whitelist pour `shared/`, chunks manuels pour les vendors (`tanstack`, `supabase`, `forms`, `icons`, `react`, `vendor`).

**Le vrai probleme :** pas de meta-framework ni de routeur. Toute la navigation repose sur `useState<AppTab>('cockpit')` dans `App.tsx` avec du rendu conditionnel.

**Comparaison meta-frameworks :**

| Option | Pour | Contre | Note /10 |
|--------|------|--------|----------|
| **Vite SPA actuel** | Simple, DX rapide, zero config | Pas de routing, pas de code splitting par route, pas d'URL state | 6/10 |
| **Vite + TanStack Router** | Routing type-safe, search params types, code splitting built-in, reste SPA, devtools | Effort de migration (~2-3 jours) | **9/10** |
| **Next.js 15 App Router** | SSR, RSC, routing fichiers, ecosysteme Vercel, image optimization | Overkill pour CRM authentifie, complexite RSC avec Supabase client SDK, vendor lock-in Vercel, overhead RSC inutile | 5/10 |
| **TanStack Start** | Full-stack type-safe, SSR optionnel, base TanStack Router + Vinxi, loaders | Encore en beta/early 2026, ecosysteme plus petit, docs en cours | 7/10 |
| **Remix / React Router v7** | Routes nestees, loaders/actions, progressive enhancement | En fusion avec React Router v7, phase transitoire, communaute fragmentee | 6/10 |

**Pourquoi PAS Next.js pour ce projet ?**

Next.js 15 est un excellent framework pour les sites publics avec SEO, les e-commerces, les dashboards avec SSR. Mais pour CIR Cockpit :

1. **100% du contenu est derriere auth** - SSR et RSC n'apportent rien. Le premier rendu utile est TOUJOURS apres le login.
2. **Complexite RSC + Supabase** - Le client Supabase utilise `localStorage` pour les sessions. RSC tourne cote serveur ou il n'y a pas de `localStorage`. Ca force a dupliquer la logique auth (server + client).
3. **Vendor lock-in** - Next.js est optimise pour Vercel. Le deployer ailleurs (Cloudflare, Fly.io) est possible mais degrade l'experience.
4. **Overhead de bundle** - Next.js ajoute ~80-100KB de runtime framework (router, hydration, RSC runtime).
5. **Le backend existe deja** - L'API Hono sur Supabase Edge est en place. Next.js API routes seraient une duplication.

**Pourquoi TanStack Router est la solution ideale :**

1. **Type-safety complete** - Params de route et search params inferes par TypeScript
2. **Code splitting natif** - `route.lazy(() => import('./pages/Clients'))` decoupe automatiquement
3. **Search params types** - `focusedClientId` devient un search param type-safe au lieu d'un useState
4. **Loaders** - Pre-chargement de donnees avant le rendu (integre avec TanStack Query)
5. **Devtools** - Visualisation de l'arbre de routes et du state
6. **Zero opinion sur le backend** - Fonctionne avec n'importe quel backend (Hono, tRPC, etc.)
7. **Meme ecosysteme** - TanStack Router + TanStack Query + TanStack Virtual = stack coherente

**Verdict :** Garder Vite 7. Ajouter TanStack Router. Ne PAS adopter Next.js.

---

### 2.3 Styling : Tailwind CSS 4

**Note : 9.5/10 -- GARDER**

Etat de l'art absolu du utility-first CSS en 2026. Tailwind CSS 4 apporte :
- **Lightning CSS engine** : compilation CSS 100x plus rapide que PostCSS
- **Config native CSS** : plus besoin de `tailwind.config.js` (le projet utilise encore le format JS mais migrable)
- **Cascade layers** : meilleure isolation des styles
- **Container queries** : responsive au niveau composant (pas seulement viewport)

Le projet l'utilise correctement :
- Zero CSS custom sauf `index.css`
- `tailwind-merge` pour la composition conditionnelle de classes
- `class-variance-authority` pour les variants (utilise par shadcn/ui)
- `clsx` pour le className conditionnel
- Design tokens via CSS variables HSL : `--primary`, `--secondary`, `--destructive`, etc.
- Couleurs custom brand : `cir-red`, `cir-dark`, `cir-gray`

**Alternatives detaillees :**

| Option | Bundle | DX | Vitesse build | Ecosysteme | Specificite |
|--------|--------|-----|--------------|-----------|------------|
| **Tailwind CSS 4** | ~10KB gzip | Excellent (autocomplete VS Code, docs massives) | Le plus rapide (Lightning CSS) | Massif (shadcn, templates, plugins) | Utility-first, classes dans le JSX |
| **UnoCSS** | Plus petit (~8KB, a la demande) | Bon, plus de config, presets | Rapide (Vite-native) | Grandissant | Utility-first, compatible Tailwind via preset |
| **Panda CSS** | Comparable (~12KB) | Type-safe design tokens, plus de setup initial | Bon | Petit, jeune | CSS-in-JS compile-time, recipe pattern |
| **vanilla-extract** | Zero-runtime | Type-safety complete, verbeux | Compile-time | Petit, stable | CSS Modules types, sprinkles API |
| **CSS Modules** | Zero overhead | Basique | Natif | Universel | Scope local, pas de tokens |

**Pourquoi UnoCSS n'est pas un upgrade suffisant :**
UnoCSS offre un bundle marginalement plus petit et un systeme de presets flexible. Mais shadcn/ui est construit pour Tailwind -- chaque composant utilise les classes Tailwind directement. Migrer vers UnoCSS necessiterait de valider chaque composant UI manuellement. Le gain (~2KB) ne justifie pas l'effort.

**Pourquoi Panda CSS est interessant mais pas pour ce projet :**
Panda CSS apporte des design tokens type-safe et un pattern "recipe" elegant pour les variants. C'est conceptuellement superieur a CVA + tailwind-merge. Mais le projet a deja 100+ composants styles avec Tailwind, et Panda est incompatible avec shadcn/ui out of the box.

**Verdict :** Tailwind CSS 4 est le meilleur choix. Aucun changement necessaire.

---

### 2.4 Composants UI : shadcn/ui + Radix

**Note : 9/10 -- GARDER**

shadcn/ui est le standard de facto pour React + Tailwind en 2025-2026. Le modele "copy-paste" (les composants sont dans `components/ui/`, pas dans `node_modules`) donne un controle total sur le styling et le comportement.

Composants utilises dans le projet :
- `button`, `input`, `select`, `dialog`, `alert-dialog`
- `card`, `table`, `tabs`, `toggle`, `toggle-group`
- `badge`, `popover`, `tooltip`, `scroll-area`
- Primitives Radix sous-jacentes : accessibilite WCAG 2.1 AA native

**Alternatives detaillees :**

| Option | Accessibilite | Personnalisation | React 19 | Framework | Approche |
|--------|--------------|-----------------|----------|-----------|---------|
| **shadcn/ui + Radix** | WCAG 2.1 AA (Radix) | Totale (on possede le code) | Oui | React only | Copy-paste, Tailwind |
| **Radix Themes** | WCAG 2.1 AA (memes primitives) | Moindre (couche theme opinionated) | Oui | React only | Package npm, theme system |
| **Ark UI (Zag.js)** | Excellent (state machines) | Bonne, framework-agnostique | Oui | React, Solid, Vue | Package npm, Tailwind/Panda |
| **Park UI** | Excellent (base Ark) | Bonne (variant Tailwind dispo) | Oui | Multi-framework | Copy-paste comme shadcn |
| **Mantine** | Bonne | Bonne mais opinionated | Oui | React only | Package npm, theme |
| **Ant Design** | Bonne | Limitee (design system fixe) | Oui | React only | Package npm, Less/CSS-in-JS |

**Pourquoi Ark UI est une alternative credible :**
Ark UI utilise Zag.js (state machines) au lieu de Radix pour les comportements accessibles. L'avantage : framework-agnostique (si migration vers Solid/Vue un jour) et state machines plus predictibles. L'inconvenient : communaute 10x plus petite que Radix, moins de composants disponibles, documentation moins fournie.

**Pourquoi rester sur shadcn/ui :**
- Communaute la plus large (100K+ stars GitHub)
- Templates et blocks pre-faits (dashboards, formulaires, tables)
- Integration parfaite avec Tailwind CSS 4
- Radix sous le capot = accessibilite garantie
- Le projet a deja tous les composants necessaires installes et fonctionnels

**Verdict :** shadcn/ui est optimal. Pas de changement.

---

### 2.5 State Management : TanStack Query v5 + Context + Zustand

**Note : 9/10 -- GARDER**

L'architecture state est exemplaire, conforme aux best practices 2026 :

| Type de state | Solution | Usage dans le projet |
|---------------|----------|---------------------|
| Server state (donnees API) | TanStack Query v5 | Toutes les queries et mutations |
| Session/auth | React Context | `AppSessionProvider` (user, agence active, role) |
| Error store | Zustand | `stores/errorStore.ts` uniquement |
| Form state | React Hook Form | Formulaires (cockpit, client, prospect, contact) |

**Ce qui est bien fait :**
- Zero `useState` pour du server state (enforce par CLAUDE.md)
- Zero `useEffect` pour du data fetching (toujours `useQuery`)
- Query keys centralises dans `services/query/queryKeys.ts` (factory pattern)
- `useNotifyError(query.error, fallbackMessage, source)` pour notifier les erreurs de queries
- `handleUiError(error, fallbackMessage)` dans `onError` des mutations
- Zustand strictement scope au error store (pas de feature creep)

**Alternatives detaillees :**

| Option | Server State | Client State | Type Safety | Bundle | DX |
|--------|-------------|-------------|-------------|--------|-----|
| **TanStack Query v5 + Zustand** | Best-in-class (cache, retry, invalidation, optimistic, infinite) | Leger, simple | Bon | ~25KB | Excellent (devtools) |
| **SWR** | Plus simple, moins de features (pas d'optimistic, pas de mutations aussi riches) | N/A | Bon | ~15KB | Bon |
| **tRPC + TanStack Query** | End-to-end type-safe (infere les types depuis le backend) | Meme | Le meilleur | ~30KB | Excellent |
| **Jotai** | Pas concu pour le server state | Atomique, composable | Bon | ~5KB | Bon |
| **Nanostores** | Pas concu pour le server state | Tiny, framework-agnostique | Decent | ~1KB | Correct |
| **Redux Toolkit + RTK Query** | Bon (RTK Query) | Complet mais verbeux | Bon | ~40KB | Moyen (boilerplate) |
| **Zustand + React Query** | Combinaison actuelle | Simple | Bon | ~25KB | Excellent |

**Pourquoi SWR n'est pas suffisant :**
SWR de Vercel est plus leger mais manque des features critiques pour un CRM : mutations structurees (`useMutation` avec `onSuccess`/`onError`/`onSettled`), invalidation granulaire (`invalidateQueries`), updates optimistes, infinite queries, query cancellation. TanStack Query v5 est strictement superieur pour un CRUD complexe.

**Pourquoi Redux est de trop :**
Redux Toolkit est un bon outil mais ajoute du boilerplate inutile quand TanStack Query gere deja le server state. Le projet n'a pas de client state complexe (juste un error store). Ajouter Redux serait de l'over-engineering.

**Evolution potentielle :**
Ajouter tRPC entre le frontend et le backend donnerait la type-safety end-to-end : le frontend "sait" au compile-time quels endpoints existent et quels types ils retournent. Ca remplace le pattern `safeInvoke` manuel actuel. Voir section 2.9 (Backend).

**Verdict :** Architecture state parfaite. Garder tel quel.

---

### 2.6 Formulaires : React Hook Form v7

**Note : 8.5/10 -- GARDER**

Le projet utilise RHF v7 avec `@hookform/resolvers` et Zod. Architecture propre :

- Schemas partages dans `shared/schemas/` (client, prospect, contact, interaction, user, agency, auth)
- Schemas locaux RHF dans `frontend/src/schemas/interactionSchema.ts`
- Hooks dedies : `useCockpitFormController`, `useCockpitRegisterFields`, `useClientFormDialog`
- `useWatch()` pour le rendu conditionnel base sur les valeurs
- Decomposition en sections (IdentitySection, AddressSection, CodesSection, NotesSection)

**Alternatives :**

| Option | Performance | DX | Maturite | Bundle | Validation |
|--------|-----------|-----|---------|--------|-----------|
| **React Hook Form v7** | Excellent (uncontrolled by default, minimal re-renders) | Mature, bien documente, communaute massive | Tres mature | ~9KB | Via resolvers (Zod, Yup, etc.) |
| **TanStack Form** | Bon (controlled) | Plus recent, API plus propre, moins de docs | En maturation | ~12KB | Adaptateurs built-in (Zod, Valibot) |
| **Conform** | Bon (progressive enhancement, form actions) | Bon pour Remix/Next | Mature | ~8KB | Zod natif |
| **Formik** | Mauvais (controlled, re-renders massifs) | Date, API vieillissante | En declin | ~15KB | Via Yup |

**Pourquoi TanStack Form n'est pas encore le choix :**
TanStack Form a une API plus elegante et s'integre mieux dans l'ecosysteme TanStack. Mais en 2026, RHF reste plus mature pour les formulaires complexes imbriques (le cockpit d'interactions a 15+ champs avec logique conditionnelle, draft auto-save, et timeline events). TanStack Form rattrape son retard mais les edge cases sont moins couverts.

**Pourquoi Conform n'est pas pertinent :**
Conform est optimise pour les form actions (Remix, Next.js). Le projet est un SPA sans server actions. Pas de valeur ajoutee.

**Verdict :** Garder React Hook Form v7. Surveiller TanStack Form pour une future migration (v2+).

---

### 2.7 Validation : Zod v4

**Note : 8/10 -- GARDER**

Zod v4 est utilise sur tout le stack :
- Frontend : schemas de formulaires, validation input
- Backend : validation des payloads Edge Function
- Partage : `shared/schemas/` (client, prospect, contact, interaction, user, agency, auth, data)

La gestion import map pour Deno est correcte (`deno.json` avec `"zod": "npm:zod@4.3.6"`, `"zod/v4"`, `"zod/"`).

**Alternatives detaillees :**

| Option | Bundle (min+gzip) | Vitesse validation | DX | Ecosysteme | Particularite |
|--------|-------------------|-------------------|-----|-----------|--------------|
| **Zod v4** | ~14KB | Bon (~1x baseline) | Excellent (methodes chainees, infer, transform) | Le meilleur (RHF, tRPC, TanStack Form, Conform) | Standard de facto |
| **ArkType** | ~5KB | Le plus rapide (revendique 100x Zod pour certains schemas) | Bon, syntaxe string-based | Grandissant | Syntaxe type-string unique |
| **Valibot** | ~1-5KB (tree-shakable) | Rapide (~5-10x Zod) | Bon, API modulaire (pas de methodes chainees) | Grandissant | Modulaire, chaque validator est importable |
| **TypeBox** | ~8KB | Rapide | JSON Schema natif | Niche (Fastify) | Genere JSON Schema + types TS |
| **Effect Schema** | ~20KB+ (avec Effect runtime) | Bon | Excellent si deja dans l'ecosysteme Effect | Niche | Partie du framework Effect |

**Pourquoi Valibot est tentant mais pas justifie :**
Valibot economiserait 9-13KB gzip grace au tree-shaking modulaire. Impressionnant. Mais le cout de migration est enorme :
1. Reecrire TOUS les schemas dans `shared/schemas/` (8+ fichiers)
2. Remplacer tous les `@hookform/resolvers/zod` par `@hookform/resolvers/valibot`
3. Mettre a jour les imports backend Deno
4. Valibot a une API differente (`pipe()` au lieu de `.refine()`)
5. L'ecosysteme d'adaptateurs est plus petit

Pour un CRM avec ~20 schemas et des formulaires complexes, le risque de regression vs le gain de 10KB ne vaut pas le coup.

**Pourquoi ArkType est fascinant mais risque :**
ArkType utilise une syntaxe string-based : `const user = type({ name: "string", age: "number > 0" })`. C'est elegamment concis mais :
1. Perte de l'autocomplete TypeScript dans les strings
2. Ecosysteme trop jeune pour un projet en production
3. Pas de resolver RHF officiel

**Verdict :** Garder Zod v4. L'ecosysteme prime sur le bundle size a cette echelle.

---

### 2.8 Routing : Aucun

**Note : 3/10 -- LACUNE CRITIQUE, PRIORITE #1**

C'est la **faiblesse architecturale majeure** du projet. Toute la navigation repose sur :

```typescript
// App.tsx
const [activeTab, setActiveTab] = useState<AppTab>('cockpit');
const [focusedClientId, setFocusedClientId] = useState<string | null>(null);
const [focusedContactId, setFocusedContactId] = useState<string | null>(null);
```

Tabs : `cockpit`, `dashboard`, `clients`, `settings`, `admin`. Sous-navigation via des `useState` supplementaires et des modales.

**Problemes concrets :**

| Probleme | Impact utilisateur | Impact technique |
|----------|-------------------|-----------------|
| **Pas d'URLs** | Impossible de bookmarker un client ou une interaction | Pas de deep linking, pas de partage de liens |
| **Pas d'historique navigateur** | Boutons retour/avance du navigateur inutiles | UX degradee, confusion utilisateur |
| **Pas de code splitting par route** | Tout le code charge d'un coup (~140KB+) | TTI (Time to Interactive) degrade |
| **Etat perdu au refresh** | F5 ramene toujours au cockpit | Perte de contexte, frustration |
| **Pas de liens partageables** | Un admin ne peut pas envoyer un lien vers un dossier a un TCS | Perte de productivite equipe |
| **Pas de pre-chargement** | Chaque onglet charge les donnees au clic | Perception de lenteur |

**Comparaison detaillee des routeurs :**

| Option | Type Safety | Code Splitting | Search Params | Devtools | Loaders | Maturite |
|--------|-----------|---------------|--------------|---------|---------|---------|
| **Aucun (actuel)** | N/A | Non | Non | Non | Non | N/A |
| **TanStack Router** | Le meilleur (params inferes, search params types) | `lazy()` built-in | Type-safe, serialisation auto | Oui (TanStack Devtools) | Oui (integres avec TanStack Query) | Mature (v1.x stable) |
| **React Router v7** | Bon (mais casting necessaire) | `lazy()` built-in | `useSearchParams` (parsing manuel) | Non officiel | Oui (loaders/actions Remix) | Tres mature |
| **Wouter** | Minimal | Non built-in | Manuel | Non | Non | Stable, minimaliste |

**Pourquoi TanStack Router est le choix evident :**

1. **Type-safety native** : Les params de route sont inferes par TypeScript. Si la route est `/clients/$clientId`, le composant recoit `{ clientId: string }` automatiquement.

2. **Search params types** : Au lieu de `useState<string | null>` pour `focusedClientId`, on declare :
   ```typescript
   // Validation Zod du search param
   const clientsSearchSchema = z.object({
     clientId: z.string().optional(),
     tab: z.enum(['info', 'contacts', 'history']).optional(),
   })
   ```
   Et TanStack Router valide + serialise automatiquement dans l'URL.

3. **Integration TanStack Query** : Les loaders de route peuvent pre-charger les queries :
   ```typescript
   loader: ({ params }) => queryClient.ensureQueryData(clientQueryOptions(params.clientId))
   ```

4. **Code splitting** : Chaque route peut etre `lazy` :
   ```typescript
   const clientsRoute = createRoute({ path: '/clients', component: lazy(() => import('./pages/Clients')) })
   ```

5. **Devtools** : Visualisation de l'arbre de routes, des search params, des pending navigations.

**Verdict :** Adopter TanStack Router. C'est l'upgrade a **plus forte valeur ajoutee** de tout l'audit.

---

### 2.9 Backend : Hono sur Supabase Edge Functions

**Note : 7.5/10 -- GARDER le framework, AMELIORER la type-safety**

L'architecture Hono est propre :
- `app.ts` : config Hono, CORS, security headers, payload limits
- Middleware chain : `requestId` -> `auth` -> `errorHandler`
- Routes : `adminUsers.ts`, `adminAgencies.ts`, `dataEntities.ts`, `dataInteractions.ts`, etc.
- Services : pure functions avec `DbClient` et `AuthContext` en parametres
- Rate limiting centralise dans `rateLimit.ts`
- Error handling via `httpError()` + middleware `handleError()`

**Contraintes Supabase Edge Functions :**

| Contrainte | Impact | Workaround |
|-----------|--------|-----------|
| Cold start (Deno Deploy) | Latence premiere requete ~200-500ms | Keep-alive cron, warm-up |
| Pas de connexions persistantes | Pas de connection pooling PostgreSQL | Supabase gere via pgBouncer |
| Pas de WebSockets sortants | Pas de push notifications depuis Edge | Supabase Realtime cote client |
| Pas de cron | Pas de taches planifiees | pg_cron via Supabase, ou service externe |
| Deploy CLI uniquement | Pas de git-push deploy | Script CI/CD |
| Pas de filesystem | Pas de fichiers temporaires | Supabase Storage |
| Timeout 150s max | Pas de taches longues | Background tasks via pg_net |

**Comparaison frameworks backend :**

| Option | Type Safety | Perf (req/s) | DX | Edge | Runtime | Ecosysteme |
|--------|-----------|-------------|-----|------|---------|-----------|
| **Hono** | Manuel (schemas Zod) | ~150K req/s | Bon (simple, leger) | Oui (multi-runtime) | Deno, Bun, Node, CF Workers | Grandissant rapidement |
| **tRPC + Hono adapter** | End-to-end (infere les types backend -> frontend) | Meme (wrapper Hono) | Excellent | Oui | Meme | Mature |
| **ElysiaJS** | Bon (Eden Treaty = type-safe client) | Le plus rapide (~300K req/s sur Bun) | Bon, API declarative | Limite | Bun uniquement | Plus petit |
| **Fastify** | Plugin-based, JSON Schema | ~100K req/s | Tres mature, excellents plugins | Non (pas edge-native) | Node.js | Tres large |
| **Nitro** | Framework-agnostique | Bon | Bon (base de Nuxt) | Oui (multi-platform) | Node, Deno, Bun, CF | Moyen |
| **Next.js API Routes** | Co-located avec frontend | Bon | Excellent (meme projet) | Oui (Vercel Edge) | Node.js (Vercel) | Massif |

**Ce que tRPC apporterait concretement :**

Actuellement, le frontend appelle le backend via `safeInvoke()` dans `services/api/client.ts` :

```typescript
// Actuel : typage manuel, pas de verification compile-time
const result = await safeInvoke<{ interaction: InteractionRow }>(
  'data/interactions',
  { action: 'save', interaction: data, agency_id: agencyId }
);
```

Avec tRPC :

```typescript
// Futur : typage automatique, erreur compile-time si le payload est faux
const result = await trpc.data.interactions.save.mutate({
  interaction: data,
  agency_id: agencyId
});
// TypeScript SAIT que result.interaction est InteractionRow
```

**Les avantages concrets de tRPC :**
1. **Zero runtime overhead** : tRPC ne genere pas de code, c'est du typage compile-time
2. **Erreurs attrapees au build** : si le backend change un type de retour, le frontend ne compile plus
3. **Autocomplete complet** : le frontend "voit" tous les endpoints du backend dans l'IDE
4. **Schemas partages** : les schemas Zod actuels dans `shared/schemas/` deviennent les input validators tRPC
5. **Adaptateur Hono** : `@trpc/server/adapters/fetch` fonctionne nativement avec Hono

**Pourquoi ElysiaJS n'est pas viable ici :**
ElysiaJS est le framework le plus rapide (Bun-native), et Eden Treaty offre une type-safety similaire a tRPC. Mais :
1. Il tourne uniquement sur Bun -- Supabase Edge utilise Deno
2. Migration = changer de runtime + framework + deploiement
3. L'ecosysteme est plus petit que Hono

**Verdict :** Garder Hono. Ajouter tRPC comme couche de type-safety. Garder Supabase Edge comme plateforme de deploiement.

---

### 2.10 Runtime : Deno

**Note : 7/10 -- Impose par Supabase Edge, adequat**

Deno n'est pas un choix ici : il est impose par Supabase Edge Functions. Le projet gere bien l'impedance mismatch Deno/Node : import maps dans `deno.json`, `--no-check` pour les imports URL Hono dans les tests.

**Comparaison runtimes :**

| Runtime | Demarrage | npm Compat | TypeScript | Securite | Edge Deploy | Outillage |
|---------|-----------|-----------|-----------|---------|------------|----------|
| **Deno 2** | Rapide (~50ms) | Bon (`npm:` prefix, `node_modules` optionnel) | Natif (zero config) | Permissions granulaires | Deno Deploy, Supabase | Bon (fmt, lint, test built-in) |
| **Bun 1.2+** | Le plus rapide (~10ms) | Excellent (drop-in Node replacement) | Natif | Standard (comme Node) | Limite (pas de platform edge majeure) | Rapide mais moins mature |
| **Node.js 22+** | Modere (~100ms) | Natif | Via tsc/tsx/ts-node | Standard | Vercel, Cloudflare (via wrangler) | Le plus mature (npm, npx, nvm) |

**Si on devait migrer hors Supabase Edge un jour :**
- **Pour rester edge** : Cloudflare Workers (Hono est compatible nativement)
- **Pour du self-hosted** : Bun avec ElysiaJS ou Hono, ou Node.js avec Fastify
- **Pour du serverless** : Vercel Functions (Node.js) ou AWS Lambda

**Verdict :** Deno est adequat tant qu'on reste sur Supabase Edge. Pas d'action requise.

---

### 2.11 Database : PostgreSQL via Supabase

**Note : 8.5/10 -- GARDER**

Supabase PostgreSQL est bien utilise :
- **14 tables** : `agencies`, `entities`, `entity_contacts`, `interactions`, `profiles`, `agency_memberships`, `agency_statuses`, `agency_services`, `agency_entities`, `agency_families`, `agency_interaction_types`, `agency_system_users`, `audit_logs`, `audit_logs_archive`
- **30 triggers** : audit logging automatique, timestamps, cascades
- **23 functions** : logique metier cote SQL
- **RLS** : toutes les tables filtrees par `agency_id` via `auth.uid()` -> `profiles` -> `agency_memberships`
- **53 migrations** : SQL versionne dans `backend/migrations/`
- **Realtime** : utilise pour les interactions (subscriptions cote client)

**Alternatives de base de donnees :**

| Option | Type | Multi-tenant | Realtime | Auth integree | Scaling | Branching | Prix |
|--------|------|-------------|----------|--------------|---------|-----------|------|
| **Supabase (Postgres)** | PostgreSQL manage | RLS natif | Oui (Realtime) | Oui (Supabase Auth) | Vertical + read replicas | Non | Free tier genereux, puis $25/mois |
| **Neon** | PostgreSQL serverless | RLS ou schema-based | Non (replication logique) | Non (externe) | Serverless auto-scaling, branching | Oui (killer feature) | Usage-based |
| **PlanetScale** | MySQL (Vitess) | App-level | Non | Non | Sharding horizontal | Oui | $39/mois+ |
| **Turso** | libSQL (SQLite fork) | Possible | Non | Non | Edge replication | Oui | Free tier, puis usage |
| **CockroachDB** | PostgreSQL-compatible | RLS | Non | Non | Horizontale (distribue) | Non | $0/mois (free) a $$$ |
| **Raw Postgres (self-hosted)** | PostgreSQL | RLS | Via LISTEN/NOTIFY | Non | Manuel | Non | Infra only |

**Pourquoi Neon est seduisant :**
Neon offre le **branching** : creer une copie instantanee de la DB pour tester des migrations ou des features. C'est un workflow de dev inegalable. Mais :
1. Pas de Realtime built-in (le projet utilise les subscriptions Supabase)
2. Pas d'Auth built-in (il faudrait ajouter Better Auth ou Clerk)
3. Pas d'Edge Functions built-in (il faudrait un hosting separe)
4. Migration = reconstruire 3 services (auth + realtime + edge functions)

**Pourquoi Turso/SQLite n'est pas pertinent :**
Turso est excellent pour les applications edge avec replication distribuee. Mais un CRM B2B necessite des transactions, des relations complexes, et des requetes analytiques que PostgreSQL gere nativement. SQLite est limite sur les jointures complexes et le multi-utilisateur concurrent.

**Verdict :** Garder Supabase PostgreSQL. L'integration auth + RLS + realtime + Edge Functions dans une seule plateforme est un avantage decisif pour ce type de projet.

---

### 2.12 ORM / Query Layer : Raw Supabase Client

**Note : 6.5/10 -- A AMELIORER (backend uniquement)**

Le projet utilise le Supabase client SDK directement pour les queries :
- Frontend : `getSupabaseClient()` pour les queries directes (drafts, preferences)
- Backend : Supabase admin client dans les services (bypass RLS)
- Wrapper : `safeSupabaseCall()` dans `frontend/src/lib/result.ts`

**Problemes :**

| Probleme | Exemple | Impact |
|----------|---------|--------|
| Pas de validation compile-time | Typo dans un nom de colonne = erreur runtime | Bugs en production |
| Types generes mais pas enforces | `supabase.from('entities').select('nme')` compile (devrait etre `name`) | Faux sentiment de securite |
| Gestion manuelle des joins | Pas de `.include()` ou `.with()` type-safe | Code verbose, erreurs de relation |
| Pas de type-check migrations | Un `ALTER TABLE` peut casser des queries sans que TypeScript le detecte | Regressions silencieuses |

**Comparaison ORM/Query builders :**

| Option | Type Safety | Migrations | Bundle | DX | Supabase compat |
|--------|-----------|-----------|--------|-----|----------------|
| **Raw Supabase client** | Types generes (post-hoc) | SQL manuel | 0KB (inclus) | Correct | Natif |
| **Drizzle ORM** | Excellent (schema = source de verite) | Built-in (SQL pur) | ~7KB | Excellent (SQL-like API) | Bon (driver pg) |
| **Prisma** | Bon (schema .prisma genere) | Built-in (Prisma Migrate) | ~500KB (query engine!) | Bon (mais lourd) | Bon |
| **Kysely** | Bon (SQL type-safe) | Externe | ~5KB | Bon (SQL builder) | Bon |

**Pourquoi Drizzle ORM est l'upgrade ideal pour le backend :**

1. **Schema = source de verite** : Le schema Drizzle definit les tables ET les types TypeScript. Pas besoin de `supabase gen types`.

2. **SQL-like API** : Drizzle genere du SQL lisible, pas un ORM opaque :
   ```typescript
   // Drizzle : SQL-like, type-safe
   const clients = await db.select()
     .from(entities)
     .where(and(
       eq(entities.agency_id, agencyId),
       eq(entities.entity_type, 'client')
     ));
   // TypeScript SAIT que clients[0].name est string, .email est string|null, etc.
   ```

3. **Zero overhead runtime** : Drizzle compile les queries en SQL, pas d'engine comme Prisma.

4. **Migrations** : `drizzle-kit generate` genere des migrations SQL a partir des changements de schema. Compatible avec les 53 migrations existantes (on peut introspect la DB actuelle).

5. **Operateur & relations** : Jointures type-safe, `with` pour l'eager loading.

**Pourquoi PAS Prisma :**
Prisma ajoute ~500KB de query engine (un binaire natif). C'est incompatible avec Supabase Edge Functions (Deno, pas de binaire natif). De plus, Prisma genere un client opaque -- Drizzle genere du SQL lisible.

**Scope recommande :**
- Backend uniquement (les services dans `backend/functions/api/services/`)
- Le frontend continue d'utiliser le Supabase client pour les 3 services directs (drafts, preferences, active agency)
- Utiliser `drizzle-kit introspect` pour generer le schema initial depuis la DB existante

**Verdict :** Ajouter Drizzle ORM pour le backend. Garder le Supabase client pour le frontend.

---

### 2.13 Auth : Supabase Auth

**Note : 8/10 -- GARDER**

Le modele d'authentification est solide et specifique au domaine :
- **Admin-only account creation** : pas d'inscription publique, pas de verification email
- **Password policies** : min 8 caracteres, au moins 1 chiffre et 1 symbole
- **First login** : changement de mot de passe obligatoire (`must_change_password` flag)
- **JWT-based** : tokens dans la session Supabase
- **Role-based access** : `super_admin`, `agency_admin`, `tcs` (stockes dans `profiles`)
- **Multi-tenant** : RLS policies qui referencent `auth.uid()` -> `agency_memberships`

**Alternatives detaillees :**

| Option | Self-hosted | MFA | Social Login | Admin API | Multi-tenant | Integration RLS |
|--------|-----------|-----|-------------|-----------|-------------|----------------|
| **Supabase Auth** | Non (manage) | Oui (TOTP, SMS) | Oui (Google, GitHub, etc.) | Oui (via admin SDK) | Manuel (RLS) | Natif (`auth.uid()`) |
| **Better Auth** | Oui (open-source, self-hosted) | Oui (plugin) | Oui (plugins) | Oui | Plugin-based | Manuel (adaptateur) |
| **Clerk** | Non (SaaS $$$) | Oui | Oui | Excellent | Built-in (organizations) | Manuel |
| **Auth.js (NextAuth)** | Oui | Limite | Le meilleur (50+ providers) | Limite | Manuel | Manuel |
| **Lucia** | Oui | Manuel | Manuel | Manuel | Manuel | Manuel |
| **Keycloak** | Oui | Oui | Oui | Complet (admin console) | Realms | Manuel |

**Pourquoi Better Auth est l'alternative la plus credible :**
Better Auth est un framework d'auth open-source TypeScript-first avec un systeme de plugins (MFA, organizations, rate limiting). Il est self-hosted et ne depend d'aucun cloud. Si le projet devait quitter Supabase un jour, Better Auth serait le remplacant naturel.

**Pourquoi ne PAS changer maintenant :**
Supabase Auth est integre au coeur du systeme :
1. Les RLS policies referencent `auth.uid()` directement en SQL
2. Le `profiles` table est liee a `auth.users` via trigger
3. Le middleware backend verifie les JWT Supabase
4. `onAuthStateChange()` est utilise pour le listener session
5. Le token refresh est integre au client Supabase

Changer d'auth = reecrire toutes les RLS policies + le middleware + le provider session + le login/logout. Cout estime : 1-2 semaines. Valeur ajoutee : quasi-nulle (Supabase Auth fonctionne bien).

**Verdict :** Garder Supabase Auth. Considerer Better Auth uniquement si migration hors Supabase.

---

### 2.14 Testing : Vitest + Deno test + Playwright

**Note : 7/10 -- GARDER, mais CORRIGER le CI**

**Frontend (Vitest) :**
- ~101 tests
- Environnement jsdom
- Setup : Testing Library, ResizeObserver mock, cleanup auto
- Coverage V8 avec seuils (70% statements/functions/lines, 60% branches)
- UI mode disponible (`vitest --ui`)

**Backend (Deno test) :**
- ~40 tests dans 10 fichiers `*_test.ts`
- Pure function testing (pas de mock DB, tests des fonctions exportees)
- `--no-check` requis pour les imports URL Hono

**E2E (Playwright) :**
- Configure mais marque "local uniquement"
- Pas dans le CI

**LACUNE CRITIQUE :**
Le CI frontend (`.github/workflows/ci.yml`) execute `lint` + `typecheck` + `build` mais **PAS les tests Vitest**. Les 101 tests frontend ne tournent pas en CI. Un bug qui casse un test passe en production sans detection.

**Alternatives :**

| Option | Vitesse | DX | Ecosysteme | Coverage |
|--------|---------|-----|-----------|----------|
| **Vitest** | Le plus rapide (Vite-natif, HMR des tests) | Excellent (API compatible Jest, UI mode) | Grandissant vite | V8/Istanbul |
| **Jest** | Lent (transformation, config) | Mature mais complexe | Le plus large | Istanbul |
| **Bun test** | Tres rapide | Minimal, basique | Tiny | Basique |
| **Playwright** | N/A (E2E) | Excellent (auto-wait, trace viewer, codegen) | Best-in-class E2E | N/A |
| **Cypress** | N/A (E2E) | Bon (time-travel debugging) | Large mais en declin | N/A |

**Verdict :** Garder Vitest + Playwright. **Ajouter `pnpm run test:run` au CI frontend** (correction 30 minutes).

---

### 2.15 Package Manager : npm

**Note : 6/10 -- CHANGER**

| Critere | npm | pnpm | bun | yarn |
|---------|-----|------|-----|------|
| **Vitesse install** | Le plus lent | 2-3x plus rapide | 5-10x plus rapide | 1.5-2x plus rapide |
| **Espace disque** | Le plus gros (flat `node_modules`, duplication deps) | Le plus petit (content-addressable store, liens symboliques) | Petit | Modere (PnP optionnel) |
| **Resolution deps** | Laxiste (phantom deps possibles) | Strict (pas de phantom deps) | Laxiste | Strict (PnP) |
| **Monorepo workspaces** | Basique | Les meilleurs (filtering, --filter, recursive) | Bon | Bon |
| **Lockfile** | `package-lock.json` (verbose) | `pnpm-lock.yaml` (compact) | `bun.lockb` (binaire) | `yarn.lock` |
| **Ecosysteme** | Universel, default Node | Excellent, adoption rapide | Grandissant | Mature, stable |
| **CI time** | Le plus long | Rapide (cache efficace) | Le plus rapide | Modere |

**Pourquoi pnpm et pas bun :**
Bun est le plus rapide mais son gestionnaire de packages a des edge cases avec certaines dependances Node (binaires natifs, postinstall scripts). pnpm est mature, stricte, et universellement supporte. C'est le choix pragmatique.

**Impact concret du switch npm -> pnpm :**
- `npm ci` en CI : ~45-60s -> `pnpm install --frozen-lockfile` : ~15-25s
- Espace `node_modules` : ~500MB+ -> ~200MB (liens symboliques vers le store)
- Phantom deps : detectees et bloquees
- Workspace support : `pnpm-workspace.yaml` + `--filter` pour cibler frontend/backend/shared

**Verdict :** Passer a pnpm. Effort : 2 heures (supprimer `package-lock.json`, `node_modules`, creer `pnpm-workspace.yaml`, `pnpm install`, maj CI).

---

### 2.16 Monorepo : Aucun

**Note : 5/10 -- A AMELIORER**

Le `shared/` est reference via :
- `tsconfig.json` : `include: ["src", "../shared"]`
- `vite.config.ts` : `server.fs.allow: ['..']`
- Backend Deno : imports relatifs avec extension `.ts`

**Problemes :**
1. Pas de graphe de dependances entre packages
2. Pas de builds incrementaux (tout recompile a chaque changement)
3. Friction Deno (`.ts` obligatoire) vs Vite (bare specifiers) pour `shared/`
4. Pas d'orchestration de scripts workspace (pas de `pnpm run -r test`)
5. Si `shared/` change, ni frontend ni backend ne sont automatiquement reverifies

**Alternatives :**

| Option | Incremental | Cache distant | DX | Setup | Quand l'utiliser |
|--------|-----------|-------------|-----|-------|-----------------|
| **Rien (actuel)** | Non | Non | Simple | Zero | Projet a 2 packages |
| **pnpm workspaces** | Non | Non | Bon (--filter, links) | Minimal (1 fichier YAML) | 2-5 packages |
| **Turborepo** | Oui (hash-based) | Oui (Vercel Remote Cache) | Excellent (zero-config tasks) | Modere (turbo.json) | 5+ packages, CI long |
| **Nx** | Oui (computation cache) | Oui (Nx Cloud) | Bon mais plus de config | Lourd (nx.json, project.json) | Enterprise, 10+ packages |
| **Moon** | Oui | Oui | Bon | Modere | Rust-based, rapide |

**Recommandation :**
1. **Maintenant** : pnpm workspaces (formalise frontend/backend/shared comme packages)
2. **Plus tard (si >5 packages)** : Ajouter Turborepo par-dessus pnpm workspaces

**Structure cible :**
```yaml
# pnpm-workspace.yaml
packages:
  - 'frontend'
  - 'backend'
  - 'shared'
```

```json
// shared/package.json
{
  "name": "@cir/shared",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./errors": "./errors/index.ts",
    "./schemas": "./schemas/index.ts",
    "./types": "./supabase.types.ts"
  }
}
```

**Verdict :** Adopter pnpm workspaces. Effort minimal, valeur significative.

---

### 2.17 CI/CD : GitHub Actions

**Note : 7/10 -- CORRIGER**

Le CI actuel (`.github/workflows/ci.yml`) execute pour le frontend :
1. `npm ci` (install)
2. `npm run lint` (ESLint --max-warnings=0)
3. `npm run typecheck` (tsc --noEmit)
4. `npm run build` (Vite build)

**Ce qui manque :**
- `npm run test:run` (les 101 tests Vitest ne tournent PAS en CI)
- E2E Playwright (compliqu mais souhaitable)
- Verification backend Deno tests en CI (potentiellement deja present)

**Correction recommandee :**
Ajouter `pnpm run test:run` entre `typecheck` et `build` dans le job frontend.

---

## 3. Stack ideale recommandee

```
Frontend:         React 19 + Vite 7                    GARDER
Router:           TanStack Router                       AJOUTER (priorite #1)
Styling:          Tailwind CSS 4                        GARDER
UI:               shadcn/ui + Radix                     GARDER
State:            TanStack Query v5 + Zustand           GARDER
Forms:            React Hook Form v7 + Zod v4           GARDER
API Layer:        tRPC + adaptateur Hono                AJOUTER (priorite #2)
Backend:          Hono sur Supabase Edge Functions      GARDER
Database:         Supabase PostgreSQL + RLS             GARDER
ORM:              Drizzle ORM (backend uniquement)      AJOUTER (priorite #3)
Auth:             Supabase Auth                         GARDER
Testing:          Vitest + Playwright                   GARDER (corriger CI)
Package Manager:  pnpm                                  CHANGER
Monorepo:         pnpm workspaces                       AJOUTER
CI:               GitHub Actions                        GARDER (corriger gap tests)
```

---

## 4. Classement par effort/valeur

### GARDER TEL QUEL (11 couches deja optimales)

| Couche | Technologie | Score | Raison |
|--------|-----------|-------|--------|
| Framework frontend | React 19 | 9/10 | Ecosysteme, shadcn/ui, TanStack, equipe |
| Styling | Tailwind CSS 4 | 9.5/10 | Best-in-class, Lightning CSS |
| UI | shadcn/ui + Radix | 9/10 | Controle total, accessibilite WCAG |
| Server state | TanStack Query v5 | 9/10 | Meilleur pour le server state |
| Client state | Zustand (error store) | 9/10 | Minimaliste, bien scope |
| Session state | React Context | 9/10 | Simple et adapte |
| Formulaires | React Hook Form v7 | 8.5/10 | Mature, performant |
| Validation | Zod v4 | 8/10 | Ecosysteme, schemas partages |
| Database | Supabase PostgreSQL | 8.5/10 | RLS multi-tenant, realtime, manage |
| Auth | Supabase Auth | 8/10 | Integration RLS native |
| Systeme d'erreurs | AppError + catalog | 9/10 | Bien concu, specifique au projet |

### QUICK WINS (3 actions, 1 jour max)

| # | Changement | Effort | Valeur | Pourquoi |
|---|-----------|--------|--------|----------|
| 1 | **pnpm au lieu de npm** | 2h | Haute | CI 2-3x plus rapide, deps strictes, workspaces, disque -60% |
| 2 | **Ajouter Vitest au CI** | 30min | Haute | 101 tests frontend ne tournent PAS en CI actuellement |
| 3 | **pnpm workspaces** | 4h | Moyenne | Formalise shared/, gestion deps propre, base pour Turborepo |

### EFFORT MOYEN (3 chantiers, 1-2 semaines)

| # | Changement | Effort | Valeur | Ce que ca change |
|---|-----------|--------|--------|-----------------|
| 1 | **TanStack Router** | 2-3 jours | **TRES HAUTE** | URLs, code splitting, historique, deep links, search params types, loaders, devtools |
| 2 | **tRPC (adaptateur Hono)** | 2-3 jours | Haute | Type-safety end-to-end, elimine `safeInvoke` manuel, autocomplete API dans l'IDE |
| 3 | **Drizzle ORM (backend)** | 3-5 jours | Moyenne-Haute | Queries type-safe, migrations generees, zero overhead, SQL lisible |

### REFACTOR MAJEUR (si necessaire un jour)

| Changement | Effort | Quand le considerer |
|-----------|--------|-------------------|
| **Self-hosted Hono sur Fly.io/Railway** | 1-2 semaines | Besoin de cron, background jobs, WebSockets backend, observabilite avancee |
| **Migration vers Bun** | 1 semaine | Quand Bun mature et Supabase n'est plus la cible de deploy |
| **Turborepo ou Nx** | 2-3 jours | Quand le projet depasse 5 packages |
| **Better Auth** | 1-2 semaines | Si migration hors Supabase (reecrire toutes les RLS policies) |
| **Neon (DB)** | 2-3 semaines | Si besoin de branching DB ou serverless scaling (mais perd realtime + auth + edge) |

---

## 5. Strategie de migration detaillee

### Phase 1 : Fondations (1 jour)

**Objectif :** Moderniser l'outillage sans toucher au code applicatif.

**Etape 1.1 : Switch npm -> pnpm (2h)**
1. Supprimer `package-lock.json` et tous les `node_modules/`
2. Installer pnpm : `npm install -g pnpm`
3. Creer `pnpm-workspace.yaml` a la racine :
   ```yaml
   packages:
     - 'frontend'
     - 'shared'
   ```
4. Ajouter `shared/package.json` :
   ```json
   {
     "name": "@cir/shared",
     "version": "0.0.0",
     "private": true
   }
   ```
5. Lancer `pnpm install` depuis la racine
6. Verifier : `cd frontend && pnpm run lint && pnpm run typecheck && pnpm run build`
7. Mettre a jour CI : `npm ci` -> `pnpm install --frozen-lockfile`

**Etape 1.2 : Ajouter Vitest au CI (30min)**
1. Dans `.github/workflows/ci.yml`, job frontend, ajouter :
   ```yaml
   - name: Run tests
     run: pnpm run test:run
   ```
   Entre `typecheck` et `build`.
2. Verifier que le CI passe (les 101 tests doivent etre verts).

---

### Phase 2 : Routing avec TanStack Router (2-3 jours)

**Objectif :** URL addressability, code splitting, historique navigateur, deep links.

**Etape 2.1 : Installation**
```bash
cd frontend
pnpm add @tanstack/react-router @tanstack/router-devtools
```

**Etape 2.2 : Definition de l'arbre de routes**
```
/                        -> redirect vers /cockpit
/cockpit                 -> CockpitForm + entites recentes
/cockpit/new             -> Nouveau formulaire interaction
/dashboard               -> InteractionDashboard (liste interactions)
/dashboard?status=open   -> Filtre par statut (search param type-safe)
/clients                 -> ClientsPanel (liste clients)
/clients/$clientId       -> ClientDetailPanel (remplace focusedClientId state)
/clients/$clientId/contacts/$contactId -> Detail contact
/prospects               -> ProspectsPanel
/prospects/$prospectId   -> ProspectDetailPanel
/settings                -> SettingsPanel (guarde par role >= agency_admin)
/admin                   -> AdminPanel (guarde par role = super_admin)
/admin/users             -> Gestion utilisateurs
/admin/agencies          -> Gestion agences
/change-password         -> Changement mot de passe (premiere connexion)
```

**Etape 2.3 : Refactoring App.tsx**
- Supprimer `useState<AppTab>` et `setActiveTab`
- Supprimer `focusedClientId`, `focusedContactId` (deviennent des params de route)
- Remplacer le rendu conditionnel par `<RouterProvider>`
- Les gardes de role deviennent des `beforeLoad` sur les routes

**Etape 2.4 : Code splitting**
- Chaque route majeure utilise `lazy()` :
  ```typescript
  const cockpitRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/cockpit',
    component: lazy(() => import('./pages/CockpitPage')),
  })
  ```

**Etape 2.5 : Integration TanStack Query**
- Les loaders de route pre-chargent les queries :
  ```typescript
  loader: ({ params }) =>
    queryClient.ensureQueryData(clientQueryOptions(params.clientId))
  ```

**Verification Phase 2 :**
- [ ] Toutes les routes fonctionnent
- [ ] Deep links marchent (copier URL -> coller dans nouvel onglet -> meme vue)
- [ ] Boutons retour/avance du navigateur fonctionnent
- [ ] Code splitting verifie via `pnpm run build` + analyse taille des chunks
- [ ] `typecheck` + `lint` + `test` + `build` verts

---

### Phase 3 : API Type-Safe avec tRPC (2-3 jours)

**Objectif :** Type-safety end-to-end entre frontend et backend.

**Etape 3.1 : Installation backend**
```bash
# Dans le backend (Deno), ajouter au deno.json imports
"@trpc/server": "npm:@trpc/server@11"
```

**Etape 3.2 : Installation frontend**
```bash
cd frontend
pnpm add @trpc/client @trpc/react-query
```

**Etape 3.3 : Creer le routeur tRPC backend**
- Creer `backend/functions/api/trpc/router.ts`
- Wrapper les fonctions service existantes en procedures tRPC :
  ```typescript
  import { initTRPC } from '@trpc/server';
  import { DataInteractionsSchema } from '../../../../shared/schemas/data.schema.ts';

  const t = initTRPC.context<{ db: DbClient; auth: AuthContext }>().create();

  export const appRouter = t.router({
    data: t.router({
      interactions: t.router({
        save: t.procedure
          .input(DataInteractionsSchema)
          .mutation(({ input, ctx }) =>
            handleDataInteractionsAction(ctx.db, ctx.auth, undefined, input)
          ),
      }),
    }),
  });

  export type AppRouter = typeof appRouter;
  ```

**Etape 3.4 : Monter l'adaptateur dans Hono**
- Dans `app.ts`, ajouter le handler tRPC :
  ```typescript
  import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
  app.all('/trpc/*', (c) => fetchRequestHandler({ ... }));
  ```

**Etape 3.5 : Client tRPC frontend**
- Creer `frontend/src/services/api/trpc.ts` :
  ```typescript
  import { createTRPCReact } from '@trpc/react-query';
  import type { AppRouter } from '../../../../backend/functions/api/trpc/router';
  export const trpc = createTRPCReact<AppRouter>();
  ```

**Etape 3.6 : Migration progressive**
- Remplacer les appels `safeInvoke` un par un par des appels tRPC
- Garder `safeInvoke` comme fallback pendant la migration
- Supprimer `safeInvoke` une fois tous les endpoints portes

**Verification Phase 3 :**
- [ ] Tous les endpoints migres vers tRPC
- [ ] Autocomplete dans l'IDE pour les appels API
- [ ] Erreur TypeScript si le backend change un type
- [ ] Tests frontend et backend passent
- [ ] `typecheck` + `lint` + `test` + `build` verts

---

### Phase 4 : Drizzle ORM backend (3-5 jours, optionnel)

**Objectif :** Queries backend type-safe, meilleur DX migrations.

**Etape 4.1 : Installation**
```bash
# deno.json imports
"drizzle-orm": "npm:drizzle-orm@0.39"
"drizzle-orm/pg-core": "npm:drizzle-orm@0.39/pg-core"
```

**Etape 4.2 : Introspection DB existante**
```bash
npx drizzle-kit introspect --driver pg --url $DATABASE_URL
```
Genere le schema Drizzle initial miroir des 14 tables.

**Etape 4.3 : Migration progressive des services**
- Commencer par les services les plus simples (dataConfig, dataProfile)
- Puis migrer dataEntities, dataEntityContacts, dataInteractions
- Puis adminUsers, adminAgencies
- Garder le client Supabase pour les operations auth et realtime

**Etape 4.4 : Ajustements RLS**
- Drizzle se connecte directement a PostgreSQL (pas via le client Supabase)
- Les services backend utilisent deja le Supabase admin client (bypass RLS)
- Avec Drizzle, utiliser un role service avec les memes privileges

**Verification Phase 4 :**
- [ ] Toutes les queries backend type-safe
- [ ] Zero regression sur les tests existants
- [ ] Migrations Drizzle compatibles avec les 53 migrations existantes
- [ ] `deno test` passe
- [ ] Performance identique ou meilleure

---

## 6. Fichiers critiques pour l'implementation

| Fichier | Phase | Changement |
|---------|-------|-----------|
| `pnpm-workspace.yaml` | 1 | Creer (workspaces) |
| `shared/package.json` | 1 | Creer (package workspace) |
| `.github/workflows/ci.yml` | 1 | Ajouter `test:run`, changer npm -> pnpm |
| `frontend/src/App.tsx` | 2 | Refactorer : remplacer useState tabs par RouterProvider |
| `frontend/src/routes/` | 2 | Creer : arbre de routes TanStack Router |
| `frontend/src/pages/` | 2 | Creer : composants page (extraction depuis App.tsx) |
| `backend/functions/api/trpc/router.ts` | 3 | Creer : routeur tRPC |
| `backend/functions/api/app.ts` | 3 | Modifier : monter adaptateur tRPC |
| `frontend/src/services/api/trpc.ts` | 3 | Creer : client tRPC |
| `frontend/src/services/api/client.ts` | 3 | Deprecier : `safeInvoke` remplace par tRPC |
| `backend/functions/api/db/schema.ts` | 4 | Creer : schema Drizzle |
| `backend/functions/api/services/*.ts` | 4 | Modifier : queries Drizzle |

---

## 7. Checklist de verification

### Apres Phase 1 (Fondations)
- [ ] `pnpm install` fonctionne depuis la racine
- [ ] `pnpm --filter frontend run lint` passe
- [ ] `pnpm --filter frontend run typecheck` passe
- [ ] `pnpm --filter frontend run test:run` passe (101 tests)
- [ ] `pnpm --filter frontend run build` passe
- [ ] CI GitHub Actions passe avec pnpm + tests
- [ ] `deno test --allow-env --no-check --config backend/deno.json backend/functions/api` passe (40 tests)

### Apres Phase 2 (Routing)
- [ ] Toutes les routes definies et fonctionnelles
- [ ] Deep links fonctionnent (URL -> vue correcte)
- [ ] Historique navigateur fonctionne (retour/avance)
- [ ] Code splitting verifie (chunks separes par route)
- [ ] Aucune regression fonctionnelle
- [ ] `typecheck` + `lint` + `test` + `build` verts

### Apres Phase 3 (tRPC)
- [ ] Tous les endpoints migres vers tRPC
- [ ] Autocomplete IDE pour les appels API
- [ ] Erreur compile-time si le backend change un type
- [ ] `safeInvoke` supprime
- [ ] Tests adaptes
- [ ] `typecheck` + `lint` + `test` + `build` verts

### Apres Phase 4 (Drizzle ORM)
- [ ] Schema Drizzle couvre les 14 tables
- [ ] Toutes les queries backend migrees
- [ ] Migrations compatibles
- [ ] Zero regression
- [ ] Performance identique ou meilleure
- [ ] Tous les tests passent

---

## 8. Validation factuelle de cet audit (17/02/2026)

Cette section sert de correctif officiel quand elle contredit une affirmation precedente.

### 8.1 Points verifies et confirmes

- Routing actuel sans routeur URL: confirme dans `frontend/src/App.tsx` (`activeTab`, `focusedClientId`, `focusedContactId` en `useState`).
- CI frontend sans execution des tests Vitest: confirme dans `.github/workflows/ci.yml` (lint + typecheck + check:error-compliance + build, mais pas `test:run`).
- Backend Hono sur Edge Function Supabase unique: confirme dans `backend/functions/api/app.ts`, `backend/functions/api/index.ts`, `supabase/functions/api/index.ts`.
- Contrat auth runtime `Authorization: Bearer`: confirme dans `backend/functions/api/middleware/auth.ts` et `frontend/src/services/api/client.ts`.

### 8.2 Points a corriger dans la version initiale

1. **Monorepo "Aucun"**: inexact.
- Un workspace pnpm existe deja (`pnpm-workspace.yaml`) mais ne couvre que `frontend`.
- Etat reel: monorepo **partiel/non finalise**, pas "absent".

2. **Package manager "npm uniquement"**: incomplet.
- Le projet est actuellement mixte: `npm` operant, mais presence d'un `pnpm-workspace.yaml` racine.

3. **CI backend "potentiellement deja present"**: deja present.
- Le job backend execute bien `deno test` dans `.github/workflows/ci.yml`.

4. **Certaines metriques globales** (`tables`, `triggers`, `functions SQL`, `migrations appliquees`) ne sont pas demontrees dans ce fichier.
- Elles doivent etre traitees comme estimations tant qu'elles ne sont pas prouvees par extraction SQL/MCP.

### 8.3 Repriorisation des recommandations

Ordre reel recommande apres verification:

1. Ajouter `frontend test:run` au CI.
2. Introduire un routeur URL (TanStack Router ou React Router data mode).
3. Normaliser le package management (npm ou pnpm), puis seulement etendre les workspaces.
4. Reporter les chantiers tRPC/Drizzle tant qu'un besoin concret (contrat API cassant, dette SQL) n'est pas constate.

---

## 9. Grand chapitre: Sortir de Supabase vers une stack PostgreSQL plus ouverte

### 9.1 Pourquoi envisager cette bascule

Supabase couvre aujourd'hui plusieurs couches d'un coup (DB, Auth, Storage, Realtime, Edge Functions). Migrer vers une stack plus ouverte peut apporter:

- plus de souverainete (infra, reseau, secrets, politiques de retention),
- plus de controle de version/upgrade PostgreSQL,
- plus de flexibilite d'architecture (choix des briques une par une),
- reduction du lock-in produit.

Contrepartie: vous remplacez une plateforme integree par plusieurs services a operer.

### 9.2 Ce que "quitter Supabase" implique vraiment

Sortir de Supabase ne signifie pas seulement deplacer PostgreSQL:

1. Base de donnees (schema, migrations, RLS, fonctions SQL, extensions).
2. Authentification (JWT, rotation, sessions, MFA eventuelle, lifecycle utilisateur).
3. API (Edge Functions Hono, routage, secret management, cold starts).
4. Storage objet (si utilise).
5. Realtime/subscriptions (si utilise).
6. Tooling types/schema (aujourd'hui base sur `shared/supabase.types.ts`).

La bonne approche est donc "decomposition du platform coupling", pas migration brute d'une DB.

### 9.3 Options cibles comparees

| Option | Ouverture | Effort ops | Effort migration | Performance/scaling | Lock-in |
|---|---|---:|---:|---|---|
| A. PostgreSQL self-host (local/VM/K8s) | Maximum | Eleve | Eleve | Excellent si bien opere | Faible |
| B. Neon + services complementaires | Moyen/eleve cote DB | Faible a moyen | Moyen | Tres bon, serverless natif | Moyen |
| C. Supabase self-host | Eleve (open source) | Moyen a eleve | Faible a moyen | Bon | Moyen-faible |
| D. Hybride progressif | Eleve progressif | Moyen | Moyen | Bon a tres bon | Faible a moyen |

### 9.4 Option A - PostgreSQL self-host (local / cloud IaaS)

#### Stack type "ouverte maximale"

- PostgreSQL 17/18.
- API: Hono (Node ou Deno) en service dedie (Fly.io, Railway, Render, VM, K8s).
- Auth: Better Auth (ou Authentik/Keycloak selon exigence IAM).
- Storage: MinIO (S3-compatible) ou bucket cloud standard.
- Realtime: service WS dedie + LISTEN/NOTIFY, ou CDC (Debezium/Kafka/NATS) selon charge.
- Observabilite: OpenTelemetry + Grafana/Loki/Tempo/Prometheus.

#### Ce que ca apporte

- Controle complet infra + reseau.
- Chiffrement, sauvegardes, PITR et retention totalement parametrables.
- Choix libre des versions, extensions, HA, replication.

#### Ce que ca coute

- Runbook SRE/DBA obligatoire (backup restore tests, failover, alerting, patching).
- Plus de responsabilite securite.
- Delai de mise en place sensiblement plus long.

### 9.5 Option B - Neon (PostgreSQL serverless) + briques open source

#### Profil

- Excellent compromis si vous voulez quitter un BaaS integre sans gerer toute l'infra DB.
- Vous gardez PostgreSQL standard avec scaling compute/storage decouples.

#### Stack type

- DB: Neon.
- API: Hono deploye separement.
- Auth: Better Auth ou equivalent.
- Storage/Realtime: choisis a la carte.

#### Points forts

- Time-to-market rapide.
- Branching DB tres utile pour tests/migrations.
- Moins d'ops que self-host pur.

#### Points de vigilance

- Toujours une dependance fournisseur sur la couche DB managée.
- Migration auth/realtime/storage reste a traiter car Neon ne remplace pas Supabase Auth/Storage/Realtime.
- Verifier les extensions et besoins reseau prives selon contraintes.

### 9.6 Option C - Supabase self-host (etape intermediaire pragmatique)

Cette option est souvent oubliee: elle preserve l'API mentale Supabase tout en augmentant l'ouverture/controle.

#### Avantages

- Impact applicatif reduit (vos appels `@supabase/supabase-js`, politiques RLS, flux existants restent proches).
- Bascule plus douce avant eventuelle decomposition complete.

#### Limites

- Vous gardez une plateforme composee de multiples services a operer.
- Le lock-in produit baisse, mais ne disparait pas autant qu'avec stack DB/API/Auth totalement decouplee.

### 9.7 Option D - Hybride progressif (recommande par defaut)

Recommandation neutre et robuste pour votre contexte: migration en couches, sans big-bang.

1. Stabiliser l'API Hono et le contrat d'erreurs (deja en bonne voie).
2. Introduire une couche d'abstraction autour des appels Supabase (front/back).
3. Migrer d'abord la DB (vers Neon ou self-host) avec compatibilite SQL/RLS.
4. Migrer ensuite Auth, puis Storage/Realtime si necessaire.
5. Decommissionner Supabase seulement apres validation complete multi-agence.

### 9.8 Différences concretes pour CIR Cockpit

| Domaine | Etat actuel Supabase | Cible ouverte | Gain attendu | Risque principal |
|---|---|---|---|---|
| DB + RLS | PostgreSQL Supabase + policies | PostgreSQL ouvert (Neon/self-host) | Souverainete + flexibilite ops | Ecarts extensions/perf/ops |
| Auth | Supabase Auth JWT | Better Auth/Keycloak/Auth service | Controle des flux IAM | Migration utilisateurs/tokens |
| API | Hono sur Edge Function | Hono service dedie | Observabilite et controle runtime | Ops deploy/reliability |
| Types DB | `supabase gen types` | schema-first (Drizzle/Kysely/codegen SQL) | Contrat type plus explicite | Cout de transition outillage |
| Realtime | Supabase Realtime | WS custom / CDC / polling intelligent | Decouplage fournisseur | Complexite implementation |

### 9.9 Plan de migration detaille (decision-complete)

#### Phase 0 - Cadrage et anti-regression

1. Cartographier toutes les dependances Supabase par fonctionnalite (DB/Auth/Storage/Realtime/Edge).
2. Figer les contrats API (`/data/*`, `/admin/*`) et messages d'erreur.
3. Ajouter une suite de non-regression metier (multi-agence, roles, CRUD critique).

#### Phase 1 - DB portability first

1. Verifier compatibilite schema/migrations/extensions avec cible PostgreSQL.
2. Mettre en place migration donnees (`pg_dump`/`pg_restore` ou replication logique selon downtime accepte).
3. Rejouer RLS + fonctions SQL + indexes sur cible.
4. Executer tests de charge et plans d'execution sur parcours critiques.

#### Phase 2 - API/runtime decoupling

1. Deployer Hono hors Edge Supabase (ou garder Deno mais hors plateforme).
2. Remplacer acces DB via client Supabase admin par driver/service DB cible.
3. Conserver le contrat HTTP actuel pour eviter une migration front immediate.

#### Phase 3 - Auth migration

1. Definir modele claims JWT: `sub`, role, scopes, `agency_ids` selon besoin.
2. Migrer comptes et policy reset/password-change.
3. Adapter middleware auth backend.
4. Realiser double validation temporaire des tokens pendant cutover.

#### Phase 4 - Storage/realtime (si impacte)

1. Migrer les assets vers S3-compatible.
2. Remplacer subscriptions par WS/CDC seulement si necessaire produit.
3. Mettre en place monitoring + alerting dedies.

#### Phase 5 - Cutover et rollback

1. Fenetre de bascule avec freeze ecriture court.
2. Verification smoke test complete.
3. Rollback explicite documente (restore snapshot + reroutage DNS/ingress).
4. Decommission progressive des composants Supabase non utilises.

### 9.10 Decision recommandee pour votre projet

Si votre priorite est "ouvert + scalable + puissant" sans exploser le risque:

1. **Court terme**: garder Supabase en production, corriger le socle applicatif (routing, CI tests).
2. **Moyen terme**: lancer un POC DB portability vers Neon **ou** PostgreSQL self-host.
3. **Long terme**: converger vers architecture hybride decouplee (DB + API + Auth maitrisables independamment).

Ce chemin est plus sur qu'une re-ecriture totale immediate et preserve la valeur deja investie.

---

## 10. Sources et references

Sources de reference a utiliser pour les decisions infra/stack:

1. PostgreSQL Versioning Policy (version courante et cycles de support):
   https://www.postgresql.org/support/versioning/
2. Supabase Architecture (plateforme composee autour de PostgreSQL):
   https://supabase.com/docs/guides/getting-started/architecture
3. Supabase self-hosting overview (options auto-hebergees):
   https://supabase.com/docs/guides/hosting/overview
4. Neon PostgreSQL version support:
   https://neon.com/docs/postgresql/postgresql-versions

---

## Resume executif

**Score global de la stack actuelle : 7.8/10**

Le projet est bien construit. La majorite des choix techniques sont optimaux (React 19, Tailwind, shadcn/ui, TanStack Query, Zod, Supabase). Les 3 points d'amelioration majeurs par ordre de priorite :

1. **Routing (3/10 -> 9/10)** : Ajouter TanStack Router. C'est le changement a plus fort impact utilisateur (URLs, deep links, historique, code splitting).

2. **Type-safety API (7.5/10 -> 9.5/10)** : Ajouter tRPC. Elimine les erreurs runtime de contrat API et ameliore massivement le DX.

3. **Queries backend (6.5/10 -> 9/10)** : Ajouter Drizzle ORM. Queries type-safe, migrations generees, zero overhead.

**Quick wins immediats :** tests frontend en CI (30min), routing URL type-safe (2-3 jours), normalisation package manager/workspaces.

**Position strategique revue :** inutile de recommencer a zero. La bonne trajectoire est incrementale, avec un chapitre dedie a la sortie progressive de Supabase vers une stack PostgreSQL plus ouverte (self-host, Neon ou hybride selon priorites reelles).
