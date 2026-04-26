# Audit base projet - architecture et QA

Date: 2026-04-25  
Perimetre: audit documentaire du repo `CIR-Cockpit`, sans modification de code, migration, configuration ou script.

## Verdict executif

La base projet est fonctionnelle, testee et exploitable. Les checks locaux cibles passent en lecture seule: hygiene repo, TypeScript frontend sans generation RPC, lint frontend, tests Vitest, compliance erreurs, Deno lint/check/test backend. Le runtime Supabase expose aussi un socle coherent: 20 tables `public` visibles, RLS activee partout, et l'Edge Function `api` active en `verify_jwt=false`.

Le projet n'est pas encore exemplaire sur quatre axes structurants: typage tRPC end-to-end, source canonique QA/docs, decoupage par domaines, et alignement explicite DB/types/schemas. La dette n'est pas un blocage court terme, mais elle augmente le cout de chaque evolution transverse.

Priorites:

| Priorite | Chantier | Decision |
| --- | --- | --- |
| P0 | Typage tRPC client | Remplacer la facade untyped/string paths par un contrat type-only `AppRouter` consomme cote frontend. |
| P0 | QA/docs | Reduire la gate a une source canonique et corriger les contradictions coverage/CI. |
| P1 | Decoupage front/back | Reorganiser progressivement par domaines fonctionnels, sans big bang. |
| P1 | Frontiere API | Formaliser quand le frontend peut appeler Supabase directement et quand tRPC/backend est obligatoire. |
| P1 | Alignement DB | Auditer migrations, live Supabase, `shared/supabase.types.ts`, Drizzle et schemas Zod avant refactor/suppression. |
| P2 | Dette UI/perf/a11y | Consolider les points non bloquants: transitions, focus states, metadata HTML, dates, virtualisation. |

## Suivi d'execution

Regle de suivi: chaque action terminee doit etre cochee ici avec une preuve courte. Une case ne doit etre cochee que si le fichier ou la validation correspondante existe reellement.

- [x] Audit initial redige dans ce fichier.
  - Preuve: document cree le 2026-04-25 avec cartographie, constats P0/P1/P2, architecture cible et validation docs-only.
- [x] 1. P0 - Remettre tRPC en typage end-to-end cote client.
  - [x] Relire la documentation officielle tRPC compatible v11 via Context7 avant implementation.
    - Preuve: Context7 `/websites/trpc_io`, client vanilla v11 `createTRPCClient<AppRouter>` + `httpBatchLink`, imports `type` effaces au build, `inferRouterInputs` / `inferRouterOutputs`.
  - [x] Identifier le chemin minimal pour exporter `AppRouter` type-only sans embarquer de runtime Deno dans le bundle frontend.
    - Preuve: `shared/api/trpc.ts` expose `AppRouter`, `RouterInputs`, `RouterOutputs` depuis un miroir strictement shared/Zod; aucun import `backend/functions/api/*` cote frontend.
  - [x] Remplacer `createTRPCUntypedClient<AnyRouter>` par un client type.
    - Preuve: `frontend/src/services/api/trpcClient.ts` utilise `createTRPCClient<AppRouter>` et exporte `getTrpcClient()`.
  - [x] Remplacer progressivement les paths string critiques par des appels de procedures typees.
    - Preuve: services `admin`, `config`, `cockpit`, `directory`, `entities`, `clients`, `interactions`, `auth/setProfilePasswordChanged` migrés vers `client.<router>.<procedure>.query/mutate(...)`.
  - [x] Decider du sort de `shared/api/generated/rpc-app.ts`: suppression, maintien temporaire, ou remplacement.
    - Preuve: `shared/api/generated/rpc-app.ts`, `frontend/scripts/generate-rpc-types.mjs`, `rpcClient.ts`, `safeRpc.ts` et le hook `pretypecheck` sont supprimes; `scripts/check-repo-state.mjs` verifie `shared/api/trpc.ts`.
  - [x] Ajouter/adapter les tests frontend des services API impactes.
    - Preuve: tests API/services migres vers `safeTrpc` et appels typed; test cible `pnpm --dir frontend run test:run -- src/services/api/__tests__/safeTrpc.test.ts src/services/api/__tests__/trpcClient.test.ts src/services/admin/__tests__/admin.rpc-services.test.ts src/services/entities/__tests__/entities.rpc-services.test.ts src/services/directory/__tests__/getDirectoryCompanySearch.test.ts src/services/directory/__tests__/getDirectoryCompanyDetails.test.ts src/services/directory/__tests__/getDirectoryDuplicates.test.ts src/services/directory/__tests__/getDirectoryPage.test.ts` PASS, 47 tests.
  - [x] Valider par checks cibles puis `pnpm run qa:fast`; `pnpm run qa` si la livraison applicative est consideree complete.
    - Preuve: `pnpm run qa:fast` PASS; `pnpm run qa` PASS avec frontend coverage/build, Deno lint/check/tests, backend integration runner.
- [ ] 2. P0 - Corriger la derive QA/docs.
- [ ] 3. P1 - Formaliser la frontiere API Supabase direct vs backend/tRPC.
- [ ] 4. P1 - Auditer l'alignement DB/types/schemas avant refactor.
- [ ] 5. P1 - Decouper progressivement le frontend par domaines.
- [ ] 6. P1 - Decouper progressivement le backend par domaines tRPC/services.
- [ ] 7. P2 - Traiter la dette UI/perf/a11y non bloquante.

## Cartographie actuelle

Frontend:

- Stack: React `19.2.4`, Vite `7.3.1`, TypeScript `5.9.3`, TanStack Router `1.162.9`, TanStack Query `5.90.21`, Tailwind CSS `4.1.18`, shadcn/Radix, Sonner, Lucide, React Hook Form, Zod.
- Structure actuelle: `frontend/src/app`, `components`, `hooks`, `services`, `stores`, `schemas`, `types`, `utils`, `constants`.
- Acces donnees hybride: services Supabase directs pour auth/realtime/data selon les cas, et client tRPC via `/functions/v1/api/trpc`.
- Evidence: `docs/stack.md`, `frontend/package.json`, `frontend/src/services/api/trpcClient.ts`, `frontend/src/services/api/rpcClient.ts`.

Backend:

- Runtime: Supabase Edge Function unique `api`, Deno, Hono `4.12.4`, `@hono/trpc-server`, tRPC `11.10.0`.
- Structure actuelle: `backend/functions/api/app.ts`, `index.ts`, `middleware`, `services`, `trpc`, `integration`; le dossier `routes` existe mais est vide.
- Data access: Supabase JS pour auth/admin/contexte utilisateur, Drizzle ORM `0.45.1` + `postgres` pour une partie des requetes metier.
- Evidence: `backend/deno.json`, `deno.json`, `backend/functions/api/app.ts`, `backend/functions/api/trpc/router.ts`.

Shared:

- `shared/schemas`: schemas Zod partages front/back.
- `shared/errors`: `AppError`, catalog, types, fingerprint.
- `shared/supabase.types.ts`: types Supabase generes, fichier volumineux de 1050 lignes.
- `shared/api/generated/rpc-app.ts`: generation actuelle de paths RPC, pas un client tRPC end-to-end type.

Base Supabase:

- MCP Supabase, lecture du 2026-04-25: 20 tables `public`, toutes avec `rls_enabled=true`.
- Tables visibles: `agencies`, `profiles`, `agency_members`, `interactions`, `agency_statuses`, `agency_services`, `agency_entities`, `agency_families`, `audit_logs`, `rate_limits`, `interaction_drafts`, `agency_interaction_types`, `entities`, `entity_contacts`, `agency_system_users`, `audit_logs_archive`, `directory_saved_views`, `app_settings`, `agency_settings`, `reference_departments`.
- Edge Function MCP: `api` active, version `37`, `verify_jwt=false`, entrypoint `source/supabase/functions/api/index.ts`, import map `source/deno.json`.
- Repo: `supabase/config.toml` confirme aussi `verify_jwt=false`.

## Constats prioritaires

### P0 - tRPC pas encore end-to-end typed cote client

Le backend exporte bien `export type AppRouter = typeof appRouter` dans `backend/functions/api/trpc/router.ts`, mais le frontend ne le consomme pas. `frontend/src/services/api/trpcClient.ts` utilise `createTRPCUntypedClient<AnyRouter>`, ce qui casse le benefice principal de tRPC: les paths, inputs et outputs ne sont pas portes automatiquement du router vers le client.

La facade actuelle ajoute une couche manuelle:

- `frontend/src/services/api/rpcClient.ts` reference des paths string comme `data.entities`, `data.entity-contacts`, `admin.users`.
- `frontend/src/services/api/invokeTrpc.ts` parse les retours via callbacks locaux.
- `shared/api/generated/rpc-app.ts` genere des URLs `/trpc/...`, mais son type `AppType` represente une arborescence de `$post`, pas les procedures tRPC typees.
- `frontend/scripts/generate-rpc-types.mjs` ecrit `shared/api/generated/rpc-app.ts` et supprime des artefacts legacy; le script repose sur une liste de paths et sur l'analyse de `backend/functions/api/app.ts`.

Impact: le contrat API peut deriver sans que TypeScript detecte tous les ecarts cote frontend. C'est le chantier P0 le plus structurant.

### P0 - QA/runbook en derive

La gate existe et passe sur les controles cibles, mais la documentation n'est pas parfaitement canonique.

Preuves:

- `package.json` expose `qa:fast` et `qa`; `qa` appelle `scripts/qa-gate.ps1`.
- `scripts/qa-gate.ps1` et `scripts/qa-gate.sh` sont deux miroirs a maintenir synchronises.
- `.github/workflows/qa.yml` existe et lance `pnpm run qa` sur PR et `workflow_dispatch`.
- `docs/testing.md` affirme pourtant: "Le projet n'a pas de workflow GitHub CI actif."
- `docs/qa-runbook.md` mentionne un seuil global `55/50/50/58`, puis indique en PASS une couverture bloquante `80/70/80/80`; `frontend/vitest.config.ts` montre en realite des seuils globaux `55/50/50/58` et des seuils par zones critiques a `80/70/80/80`.

Impact: un contributeur peut appliquer une mauvaise gate ou conclure a tort qu'une CI n'existe pas. La correction doit viser une seule source de verite, pas seulement reformuler une phrase.

### P1 - Frontend trop plat

Le frontend est robuste mais encore organise par types techniques: `components`, `hooks`, `services`, `utils`. Des domaines metier emergent deja dans les noms (`cockpit`, `client-directory`, `settings`, `admin`, `entity-onboarding`), mais ils sont disperses entre plusieurs dossiers racine.

Signaux:

- Plusieurs orchestrateurs depassent largement la cible de lisibilite: `EntityOnboardingDialog.tsx` 524 lignes, `useEntityOnboardingFlow.ts` 833 lignes, `ClientDirectoryTable.tsx` 264 lignes, `AppLayout.tsx` 245 lignes.
- Les hooks metier cockpit/directory/admin/settings sont au meme niveau dans `frontend/src/hooks`.
- Les services API/Supabase/metier cohabitent dans `frontend/src/services` avec beaucoup de conventions implicites.

Recommandation: migrer progressivement vers une structure feature-sliced par domaines, sans deplacer les primitives shadcn ni casser les imports en masse.

### P1 - Backend trop horizontal

Le router tRPC centralise les domaines `data`, `cockpit`, `admin`, `config`, `directory` dans `backend/functions/api/trpc/router.ts` (201 lignes). Les services sont nombreux et principalement regroupes dans `backend/functions/api/services`, avec quelques sous-dossiers (`adminUsers`) mais pas de convention domaine/procedure/schema uniforme.

Le dossier `backend/functions/api/routes` existe mais est vide. Il doit etre supprime s'il est obsolete, ou reaffecte avec une responsabilite claire si des routes Hono hors tRPC reviennent.

### P1 - Frontiere API a formaliser

`docs/stack.md` decrit explicitement un frontend hybride: Supabase direct + tRPC. Ce choix peut etre valide, mais il doit devenir un contrat ecrit.

Regle cible a formaliser:

- Supabase direct autorise pour auth, session, realtime et lectures simples explicitement approuvees.
- Backend/tRPC obligatoire pour les mutations metier, workflows multi-table, actions admin, validation serveur, audit, rate limiting, et toute operation ou le service role/interdiction cross-agency intervient.

Sans cette frontiere, les prochaines features risquent de contourner audit, mappers d'erreurs ou policies de domaine.

### P1 - Alignement DB a auditer

Le repo contient 77 migrations SQL dans `backend/migrations`, un fichier de types Supabase genere, des schemas Zod partages, et une couche Drizzle partielle. Le live Supabase confirme 20 tables `public` avec RLS, mais l'audit d'alignement complet reste a faire avant tout refactor DB.

Points a comparer table par table:

- migrations versionnees vs schema live MCP;
- `shared/supabase.types.ts` vs schema live;
- `backend/drizzle/schema.ts` et usages Drizzle vs tables live;
- schemas Zod `shared/schemas/*` vs payloads reels et sorties backend;
- policies RLS/indexes live vs hypothese multi-tenant documentee.

### P2 - Dette UI/perf/a11y a consigner

La base UI a des signaux positifs: tests a11y presents, nombreux `aria-label`, `aria-live`, focus rings visibles, primitives Radix/shadcn. La dette restante est de niveau P2:

- `transition-all` subsiste dans quelques composants (`tabs.tsx`, `DirectoryTypeFilter.tsx`, `EntityOnboardingDetailsStep.tsx`), a remplacer par des transitions ciblees.
- `frontend/index.html` ne contient qu'un `<title>CIR Cockpit</title>`; les metadata descriptives minimales restent pauvres.
- La strategie date doit rester centralisee: beaucoup d'appels passent par `utils/date`, mais `toLocaleDateString()` existe encore dans `calendar.tsx` pour un attribut.
- La virtualisation est disponible (`@tanstack/react-virtual`) et referencee par Vite, mais les grandes listes doivent etre auditees au cas par cas avant volumes reels.

## Architecture cible

Frontend cible:

```text
frontend/src/
  app/
  features/
    cockpit/
    directory/
    admin/
    settings/
    auth/
  services/
    api/
    supabase/
  shared/
    ui/
    lib/
    errors/
    query/
```

Principes:

- Garder `components/ui` ou le deplacer vers `shared/ui` seulement lors d'un refactor controle.
- Rapprocher composants, hooks, schemas locaux, tests et services de leur domaine.
- Conserver TanStack Query comme orchestration server-state.
- Eviter un big bang: commencer par les domaines qui bougent le plus (`cockpit`, puis `directory`).

Backend cible:

```text
backend/functions/api/
  trpc/
    router.ts
    procedures.ts
    domains/
      cockpit/
      directory/
      admin/
      config/
      data/
  middleware/
  shared/
  index.ts
  app.ts
```

Principes:

- Splitter le router tRPC par domaine et garder `router.ts` comme composeur.
- Rapprocher procedures, schemas d'input/output et services quand cela reduit les imports croises.
- Supprimer ou reutiliser clairement `routes`.
- Garder `app.ts` minimal: middleware chain + montage tRPC + error handler.

tRPC cible:

- Exporter `AppRouter` type-only depuis une surface partageable sans embarquer du runtime Deno dans le bundle frontend.
- Utiliser un client tRPC type (`createTRPCClient<AppRouter>` ou equivalent compatible repo) cote frontend.
- Supprimer la generation RPC hardcodee si elle devient redondante, ou la limiter a un role non contractuel.
- Remplacer les paths string manuels par des appels de procedures types.

QA cible:

- Choisir une source canonique: soit `scripts/qa-gate.ps1` comme executable principal et `qa-gate.sh` derive/verifie, soit un seul script cross-platform.
- Corriger `docs/testing.md` pour refleter `.github/workflows/qa.yml`.
- Clarifier les seuils: global `55/50/50/58`, domaines critiques `80/70/80/80`, exceptions hooks explicites.
- Documenter que `frontend:typecheck` lance `pretypecheck` et donc `generate:rpc-types`; les audits lecture seule doivent utiliser `pnpm --dir frontend exec tsc -p tsconfig.json --noEmit`.

DB cible:

- Declarer la source de verite operationnelle par usage: migrations repo pour historique, live Supabase MCP pour etat deploye, `shared/supabase.types.ts` pour typage front/back, Drizzle pour requetes SQL typees, Zod pour contrats API.
- Avant toute suppression/refactor: verifier table, index, policies, grants, triggers, fonctions, usages backend/frontend/tests.
- Regenerer les types Supabase apres modification schema, puis verifier les schemas Zod affectes.

## Plan de validation

Validation effectuee pour cet audit Markdown:

| Controle | Commande | Resultat |
| --- | --- | --- |
| Worktree initial | `git status --short` | Aucun changement initial affiche. |
| Hygiene repo | `pnpm run repo:check` | PASS: `Repo state check passed.` |
| TypeScript frontend lecture seule | `pnpm --dir frontend exec tsc -p tsconfig.json --noEmit` | PASS. |
| Lint frontend | `pnpm --dir frontend run lint` | PASS. |
| Tests frontend | `pnpm --dir frontend run test:run` | PASS: 118 fichiers, 428 tests. |
| Compliance erreurs | `pnpm --dir frontend run check:error-compliance` | PASS: `Error compliance check passed.` |
| Deno lint backend | `deno lint backend/functions/api` | PASS: 75 fichiers. |
| Deno check backend | `deno check --config backend/deno.json backend/functions/api/index.ts` | PASS. |
| Deno tests backend | `deno test --env-file=backend/.env --allow-env --no-check --config backend/deno.json backend/functions/api` | PASS: 138 passed, 0 failed, 8 ignored. |
| Supabase MCP tables | `list_tables(public)` | PASS: 20 tables publiques, RLS activee partout. |
| Supabase MCP Edge Functions | `list_edge_functions` | PASS: `api` active, version 37, `verify_jwt=false`. |

Validation volontairement non lancee:

- `pnpm run qa:fast`: non lance pour cette phase documentaire, car il appelle `pnpm --dir frontend run typecheck`, dont le `pretypecheck` execute `generate:rpc-types` et peut modifier `shared/api/generated/rpc-app.ts`.
- `pnpm run qa`: non requis par la matrice docs-only du runbook; il inclut aussi la generation frontend et la gate complete de livraison applicative.
- E2E Playwright: non requis, aucun parcours UI n'est modifie.
- Probes runtime HTTP Supabase: non requis, aucun backend/API/DB n'est modifie.

Validation a appliquer pour les phases de refactor ulterieures:

1. Lancer `pnpm run repo:check`, puis les checks cibles par zone.
2. Lancer `pnpm run qa:fast` en validation intermediaire quand des fichiers applicatifs changent.
3. Lancer `pnpm run qa` comme gate finale pour toute livraison applicative ou merge.
4. Si backend/Edge Function/DB est touche: verifier Supabase MCP, deploy `api`, CORS/preflight et probes live.

## Hypotheses

- Le livrable immediat est uniquement ce fichier Markdown dans `docs/`.
- Aucun code, migration, config ou script QA n'est modifie dans cette phase.
- Le niveau "parfait" vise une base claire et evolutive: structure par domaines, typage strict, responsabilites nettes, QA sans ambiguite, DB alignee, et aucun contrat implicite cache.
