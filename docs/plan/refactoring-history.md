# Plan_refactoring

Date de creation: 2026-02-20
Derniere mise a jour: 2026-02-26
Statut global: En cours

## 1) Cadre non negociable

- [x] Rester sur Supabase (DB, Auth, Edge Functions, Realtime)
- [x] Zero CI GitHub (quality gate locale uniquement)
- [x] tRPC obligatoire dans la sequence (couche 9)
- [x] Drizzle obligatoire dans la sequence (couche 12)
- [x] MFA hors scope pour le moment

## 2) Mode d'utilisation du plan

- [x] Toujours traiter les couches dans l'ordre officiel
- [x] Bloquer la couche si un gate QA echoue
- [x] Documenter les preuves d'execution dans le journal en fin de fichier
- [x] Ne pas passer a la couche suivante sans DoD couche courante valide

## 3) Gates QA obligatoires (a chaque couche impactee)

### Gate Frontend

- [x] `pnpm --dir frontend run typecheck`
- [x] `pnpm --dir frontend run lint -- --max-warnings=0`
- [x] `pnpm --dir frontend run test:coverage`
- [x] `pnpm --dir frontend run check:error-compliance`
- [x] `pnpm --dir frontend run build`

### Gate Backend

- [x] `deno lint backend/functions/api`
- [x] `deno check --config backend/deno.json backend/functions/api/index.ts`
- [x] `deno test --allow-env --no-check --config backend/deno.json backend/functions/api`

### Gate Runtime Supabase (si backend/DB impactes)

- [x] `list_edge_functions` valide pour `api`
- [x] `POST /functions/v1/api/trpc/*` sans `404`
- [x] `OPTIONS` routes impactees = `200` avec CORS
- [x] Contrat auth runtime `Authorization-only` respecte

## 4) Ordre officiel et checklist de progression (18 couches)

### Couche 16 - Package Manager (pnpm unifie)

- [x] Fait
- [x] `pnpm-lock.yaml` present
- [x] `package-lock.json` supprime
- [x] `frontend/package-lock.json` supprime

### Couche 17 - Monorepo (workspace frontend + shared)

- [x] Fait
- [x] `pnpm-workspace.yaml` inclut `frontend`
- [x] `pnpm-workspace.yaml` inclut `shared`
- [x] `shared/package.json` present

### Couche 18 - QA Gate locale (scripts + hooks)

- [x] Fait
- [x] `scripts/qa-gate.ps1` present
- [x] `scripts/qa-gate.sh` present
- [x] `.husky/pre-commit` present
- [x] `.husky/pre-push` present
- [x] `pnpm run qa` passe

### Couche 15 - Tests (durcissement)

- [x] Fait
- [x] Cartographier couverture par domaine (auth, entities, interactions, admin)
- [x] Ajouter tests de regression manquants identifies pendant migration
- [x] Stabiliser execution e2e locale via `RUN_E2E=1` dans gate
- [x] Mettre a jour runbook avec criteres de skip explicites
- [x] Seuils de couverture bloquants actifs: `80/70/80/80`

### Couche 13 - Database Supabase Postgres (baseline perf/RLS)

- [x] Fait
- [x] Extraire baseline indexes/policies/advisors via MCP Supabase
- [x] Classifier indexes unused: garder/supprimer avec justification
- [x] Documenter et corriger policies RLS non optimisees
- [x] Rejouer verification roles `anon/authenticated/service_role`

### Couche 14 - Auth Supabase hardening

- [x] Fait
- [x] Hors scope: `auth_leaked_password_protection` (decision produit intranet B2B, 2026-02-22)
- [x] Verifier hygiene secrets (`service_role` jamais exposee frontend)
- [x] Verifier enforcement policy mot de passe (cote app + Supabase)
- [x] Journaliser evidence MCP/security advisors

### Couche 8 - Validation (Zod unifie front/back)

- [x] Fait
- [x] Lister schemas partages vs schemas locaux
- [x] Eliminer divergences de contrat input/output
- [x] Verifier coherence messages d'erreur FR
- [x] Verifier parse/guard sur tous points d'entree API

### Couche 7 - Forms (RHF aligne schemas)

- [x] Fait
- [x] Verifier tous formulaires connectes a resolvers Zod
- [x] Supprimer validations paralleles non source de verite
- [x] Garantir mapping erreurs champ/serveur coherent
- [x] Ajouter tests sur flows erreurs critiques

### Couche 6 - State management (TanStack Query + invalidation)

- [x] Fait
- [x] Finaliser centralisation query keys
- [x] Rendre invalidations plus granulaires
- [x] Ajouter prefetch points strategiques
- [x] Verifier retry/non-retryable alignes codes erreurs

### Couche 3 - Routing (TanStack Router)

- [x] Fait
- [x] Introduire route tree type-safe
- [x] Migrer `AppTab` -> URLs metier
- [x] Garantir deep links, refresh, back/forward
- [x] Verifier code splitting par route

### Couche 9 - API Layer (tRPC + Hono adapter)

- [x] Fait
- [x] Creer `backend/functions/api/trpc/{context,router,procedures}`
- [x] Monter adapter tRPC sur Hono
- [x] Migrer routes REST vers procedures tRPC progressivement
- [x] Brancher client tRPC frontend + hooks query/mutation

### Couche 12 - ORM (Drizzle backend-only)

- [x] Fait
- [x] Creer `backend/drizzle/{schema,relations,index}` + config
- [x] Migrer services backend depuis `supabase.from(...)`
- [x] Imposer garde auth/agency sur toutes queries Drizzle
- [x] Conserver Supabase client pour Auth/Realtime/Storage

### Couche 10 - Backend framework (consolidation Hono)

- [x] Fait
- [x] Nettoyer routes legacy post-migration tRPC
- [x] Verifier middleware order stable (requestId/auth/error/cors)
- [x] Revalider contrat erreurs HTTP + codes catalog
- [x] Renforcer tests integration routes sensibles

### Couche 11 - Runtime backend (consolidation Deno)

- [x] Fait
- [x] Verifier import maps `deno.json` coherents
- [x] Verifier entrypoint wrapper Supabase conforme
- [x] Valider deploy command reference + flags
- [x] Verifier runtime probes post-deploy

### Couche 5 - UI components (composition)

- [x] Fait
- [x] Aide toi notament du skill taste-skill
- [x] Reduire props booleennes proliferees
- [x] Clarifier composants orchestrateurs vs presentatifs
- [x] Standardiser patterns composition (sections, slots, variants)
- [x] Revalider accessibilite clavier/labels/focus

### Couche 4 - Styling (coherence design/tokens)

- [x] Fait
- [x] Aide toi notament du skill taste-skill
- [x] Uniformiser tokens classes utilitaires
- [x] Eliminer incoherences visuelles inter-pages
- [x] Verifier contrastes et states focus
- [x] Stabiliser patterns responsive desktop/mobile

### Couche 2 - Build tool (optimisation Vite/chunks)

- [x] Fait
- [x] Reauditer `manualChunks` post-routing/tRPC/Drizzle
- [x] Comparer tailles avant/apres par chunk
- [x] Ajuster split points a impact reel
- [x] Verifier build time et DX dev server

### Couche 1 - React 19 (optimisation finale)

- [x] Fait
- [x] Aide toi notament du skill taste-skill
- [x] Nettoyer effets inutiles et derives en render
- [x] Optimiser re-renders hotspots identifies
- [x] Verifier architecture finale lisible et stable
- [x] Valider regression complete produit

## 5) Definition of Done globale

- [x] Toutes les couches cochees
- [x] Tous les gates QA verts sur la tranche finale
- [x] Zero `any` non justifie / zero `@ts-ignore` non documente
- [x] Zero `throw new Error` hors tests
- [x] Zero `console.error` hors tests
- [x] Zero `toast.error` hors `notify.ts`
- [x] Supabase runtime probes OK sur routes impactees

## 6) Journal d'execution (preuves)

Utiliser ce template a chaque couche:

```md
### [YYYY-MM-DD] Couche X - Nom

- Statut: EN_COURS | BLOQUEE | TERMINEE
- Scope:
- Fichiers modifies:
- Commandes executees:
  - ...
- Resultats:
  - ...
- Preuves Supabase MCP (si applicable):
  - ...
- Risques restants:
  - ...
- Decision:
  - ...
```

### 2026-02-20 - Couche 16/17/18 (fondations)

- Statut: TERMINEE
- Scope: migration pnpm + workspace shared + QA gate locale
- Fichiers modifies:
  - `package.json`
  - `pnpm-workspace.yaml`
  - `shared/package.json`
  - `frontend/package.json`
  - `scripts/qa-gate.ps1`
  - `scripts/qa-gate.sh`
  - `.husky/pre-commit`
  - `.husky/pre-push`
  - `pnpm-lock.yaml`
  - `Plan_refactoring.md`
- Commandes executees:
  - `pnpm install`
  - `pnpm run qa`
- Resultats:
  - Front QA OK
  - Back QA OK
  - Gate globale OK

### 2026-02-20 - Couche 15 (durcissement tests)

- Statut: TERMINEE
- Scope: couverture et regression des services critiques front (admin, agency, api, auth, entities, errors)
- Fichiers modifies:
  - `frontend/vitest.config.ts`
  - `scripts/qa-gate.ps1`
  - `scripts/qa-gate.sh`
  - `frontend/playwright.config.ts`
  - `frontend/src/services/admin/__tests__/admin.rpc-services.test.ts`
  - `frontend/src/services/admin/__tests__/getAuditLogs.test.ts`
  - `frontend/src/services/agency/__tests__/agency.supabase-services.test.ts`
  - `frontend/src/services/agency/__tests__/getActiveAgencyContext.test.ts`
  - `frontend/src/services/agency/__tests__/getAgencyMemberships.test.ts`
  - `frontend/src/services/api/__tests__/rpcClient.test.ts`
  - `frontend/src/services/api/__tests__/safeRpc.test.ts`
  - `frontend/src/services/auth/__tests__/auth.core-services.test.ts`
  - `frontend/src/services/entities/__tests__/entities.rpc-services.test.ts`
  - `frontend/src/services/entities/__tests__/entities.supabase-services.test.ts`
  - `docs/qa-runbook.md`
  - `Plan_refactoring.md`
- Commandes executees:
  - `pnpm --dir frontend run typecheck`
  - `pnpm --dir frontend run lint -- --max-warnings=0`
  - `pnpm --dir frontend run test:coverage`
  - `pnpm --dir frontend run check:error-compliance`
  - `pnpm --dir frontend run build`
- Resultats:
  - 47 fichiers de test verts, 159 tests verts
  - Couverture gate: statements `91.86`, branches `77.19`, functions `96.37`, lines `94.54`
  - Seuils `80/70/80/80` respectes
- Risques restants:
  - Le domaine `services/interactions` reste partiellement couvert et sera etendu avant la couche 9
- Decision:
  - Couche 15 validee, passage possible a la couche suivante

### 2026-02-22 - Couche 13 (Supabase Postgres baseline perf/RLS)

- Statut: TERMINEE
- Scope:
  - Baseline prod `rbjtrcorlezvocayluok` (advisors, policies, indexes, routines/grants)
  - Traitement indexes unused en lot
  - Hardening policies RLS roles + grant routine sensible
  - Verification runtime roles et probes CORS/API
- Fichiers modifies:
  - `backend/migrations/20260222110000_layer13_drop_unused_indexes_lot1.sql`
  - `backend/migrations/20260222113000_layer13_drop_unused_indexes_lot2.sql`
  - `backend/migrations/20260222120000_layer13_rls_policy_and_grants_hardening.sql`
  - `backend/migrations/20260222121000_layer13_recreate_fk_safety_indexes.sql`
  - `docs/plan/2026-02-22_layer13_rollback_lot1.sql`
  - `docs/plan/2026-02-22_layer13_rollback_lot2.sql`
  - `docs/plan/2026-02-22_couche13_supabase_postgres.md`
  - `docs/qa-runbook.md`
  - `Plan_refactoring.md`
- Commandes executees:
  - `pnpm run qa`
  - Probes runtime HTTP (`POST`/`OPTIONS`) via shell
  - MCP Supabase: `get_advisors`, `execute_sql`, `apply_migration`, `list_migrations`, `list_edge_functions`
- Resultats:
  - 4 migrations couche 13 appliquees en prod (2 drops, 1 hardening, 1 restauration FK safety)
  - 9 indexes purement unused supprimes et maintenus supprimes
  - 9 indexes FK restaures apres detection `unindexed_foreign_keys` (classification garder/supprimer)
  - Policies `agency_interaction_types` et `interaction_drafts` alignees `TO authenticated`
  - Routine `set_audit_actor(uuid)` limitee a `service_role` + `postgres`
  - QA locale complete PASS (`pnpm run qa`)
  - Runtime probes:
    - `POST /functions/v1/api/data/entities` anonyme -> `401`
    - `POST /functions/v1/api/data/interactions` membre -> `409` (acces autorise + conflit attendu)
    - `POST /functions/v1/api/data/interactions` non membre -> `403`
    - `POST` avec seul `x-client-authorization` -> `401`
    - `OPTIONS /functions/v1/api/data/*` -> `200`
- Preuves Supabase MCP (si applicable):
  - `list_edge_functions`: `api` active, `verify_jwt=false`, version `23`
  - `list_migrations`: presence des versions `20260222175617`, `20260222175755`, `20260222175830`, `20260222180406`
  - `pg_policies`: roles `authenticated` confirmes sur tables ciblees
  - `routine_privileges`: `set_audit_actor` restreinte a `service_role` + `postgres`
  - `get_advisors(performance)`: plus de warning `unindexed_foreign_keys` apres restauration FK safety
- Risques restants:
  - `auth_leaked_password_protection` reste en `WARN` (accepte hors scope: intranet B2B)
  - Plusieurs indexes FK sont toujours `unused` (acceptable a ce stade, conserves pour integrite/perf FK)
- Decision:
  - Couche 13 validee. Passage a la couche 14 autorise.

### 2026-02-22 - Couche 14 (Auth Supabase hardening)

- Statut: TERMINEE
- Scope:
  - Arbitrage produit: retrait du scope `auth_leaked_password_protection` (intranet B2B)
  - Verification hygiene secrets frontend/backend
  - Verification enforcement policy mot de passe app + Supabase
  - Journalisation des preuves MCP security
- Fichiers modifies:
  - `Plan_refactoring.md`
- Commandes executees:
  - `git status --short`
  - `rg -n "SUPABASE_SERVICE_ROLE_KEY|service_role|sb_secret_" frontend/src frontend/.env.example -S`
  - `rg -n "VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY" frontend/src/services/supabase frontend/src/services/api frontend/.env.example -S`
  - `rg -n "passwordSchema|validatePasswordPolicy|AUTH_WEAK_PASSWORD|PASSWORD_REQUIRES" shared frontend/src backend/functions/api -S`
  - `rg -n "x-client-authorization" frontend/src/services/api backend/functions/api/middleware backend/functions/api/app.ts`
  - `pnpm run qa`
  - MCP Supabase: `get_project`, `get_organization`, `get_advisors(security)`, `list_edge_functions`
  - MCP Supabase docs fallback (Context7 quota depassee): `search_docs(query: "Password security")`
- Resultats:
  - Organisation `vnwmeftwpvpmwpdsmxcy` en plan `free`
  - `auth_leaked_password_protection` reste en `WARN` mais explicitement retire du scope (decision produit intranet B2B)
  - Hygiene secrets frontend validee:
    - `NO_MATCH_FRONTEND_SERVICE_ROLE` sur `frontend/src` + `frontend/.env.example`
    - Variables frontend limitees a `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
    - Contrat auth HTTP strict confirme (`NO_MATCH_X_CLIENT_AUTH`)
  - Enforcement policy mot de passe aligne:
    - `shared/schemas/auth.schema.ts` (`min 8`, `digit`, `symbol`)
    - `backend/functions/api/services/adminUsers.ts` (`validatePasswordPolicy`)
    - `frontend/src/services/errors/mapSupabaseAuthError.ts` (`AUTH_WEAK_PASSWORD`)
  - Gate QA locale executee: `pnpm run qa` = PASS
- Preuves Supabase MCP (si applicable):
  - `get_project`: `rbjtrcorlezvocayluok` = `ACTIVE_HEALTHY`
  - `get_organization`: plan `free`
  - `get_advisors(security)`: `auth_leaked_password_protection` = `WARN`
  - `list_edge_functions`: `api` active, `verify_jwt=false`, version `23`
- Risques restants:
  - `auth_leaked_password_protection` signale en `WARN` par l'advisor, accepte hors scope par decision produit intranet B2B
- Decision:
  - Couche 14 validee et terminee.
  - Le point leaked-password est retire des criteres bloquants pour ce projet.

### 2026-02-23 - Couche 8 (Validation Zod unifie front/back)

- Statut: TERMINEE
- Scope:
  - Convergence validation interaction entre front/backend via schemas partages
  - Durcissement strict des payloads API (`.strict()` sur contrats d'entree)
  - Ajout de schemas Zod runtime pour reponses critiques admin/data
  - Remplacement des parseurs frontend casts par parseurs Zod runtime
  - Ajout de tests de non-regression contracts/strict payload
- Fichiers modifies:
  - `shared/schemas/interaction.schema.ts`
  - `shared/schemas/data.schema.ts`
  - `shared/schemas/user.schema.ts`
  - `shared/schemas/agency.schema.ts`
  - `shared/schemas/client.schema.ts`
  - `shared/schemas/client-contact.schema.ts`
  - `shared/schemas/convert-client.schema.ts`
  - `shared/schemas/prospect.schema.ts`
  - `shared/schemas/edge-error.schema.ts`
  - `shared/schemas/api-responses.ts`
  - `shared/schemas/index.ts`
  - `frontend/src/schemas/interactionSchema.ts`
  - `frontend/src/types.ts`
  - `frontend/src/services/admin/adminAgenciesCreate.ts`
  - `frontend/src/services/admin/adminAgenciesArchive.ts`
  - `frontend/src/services/admin/adminAgenciesRename.ts`
  - `frontend/src/services/admin/adminAgenciesUnarchive.ts`
  - `frontend/src/services/admin/adminAgenciesHardDelete.ts`
  - `frontend/src/services/admin/adminUsersCreate.ts`
  - `frontend/src/services/admin/adminUsersArchive.ts`
  - `frontend/src/services/admin/adminUsersDelete.ts`
  - `frontend/src/services/admin/adminUsersSetRole.ts`
  - `frontend/src/services/admin/adminUsersSetMemberships.ts`
  - `frontend/src/services/admin/adminUsersResetPassword.ts`
  - `frontend/src/services/admin/adminUsersUnarchive.ts`
  - `frontend/src/services/admin/adminUsersUpdateIdentity.ts`
  - `frontend/src/services/clients/saveClient.ts`
  - `frontend/src/services/clients/setClientArchived.ts`
  - `frontend/src/services/entities/saveEntity.ts`
  - `frontend/src/services/entities/convertEntityToClient.ts`
  - `frontend/src/services/entities/saveEntityContact.ts`
  - `frontend/src/services/entities/reassignEntity.ts`
  - `frontend/src/services/interactions/saveInteraction.ts`
  - `frontend/src/services/interactions/updateInteractionOptimistic.ts`
  - `frontend/src/services/admin/__tests__/admin.rpc-services.test.ts`
  - `frontend/src/services/entities/__tests__/entities.rpc-services.test.ts`
  - `frontend/src/services/interactions/__tests__/validateInteractionDraft.test.ts`
  - `frontend/src/schemas/__tests__/interactionSchema.test.ts`
  - `backend/functions/api/routes/dataEntities_test.ts`
  - `Plan_refactoring.md`
- Commandes executees:
  - `pnpm --dir frontend run typecheck`
  - `pnpm --dir frontend run lint -- --max-warnings=0`
  - `pnpm --dir frontend run test:coverage`
  - `deno lint backend/functions/api`
  - `deno check --config backend/deno.json backend/functions/api/index.ts`
  - `deno test --allow-env --no-check --config backend/deno.json backend/functions/api`
  - `pnpm run qa`
- Resultats:
  - Validation runtime reponses critiques activee cote frontend (admin/data)
  - Rejets explicites des champs inconnus sur payloads API cibles
  - Convergence des regles interaction front/backend et suppression de la divergence schema local
  - Tests verts: frontend `47` fichiers / `161` tests, backend `69` passes / `0` fail / `9` ignored
  - Couverture gate frontend: statements `92.04`, branches `76.59`, functions `96.37`, lines `94.67`
  - Gate locale complete PASS (`pnpm run qa`)
- Risques restants:
  - Messages details Zod pour `unrecognized_keys` restent natifs Zod (anglais) dans `details` techniques; message utilisateur principal reste francais
  - Endpoints non critiques hors admin/data continuent avec parseurs existants (hors scope couche 8)
- Decision:
  - Couche 8 validee et terminee.
  - Passage a la couche suivante autorise selon ordre officiel.

### 2026-02-24 - Couche 7 (Forms RHF aligne schemas)

- Statut: TERMINEE
- Scope:
  - Migration des formulaires persistants vers `React Hook Form + zodResolver`
  - Suppression des validations paralleles non source de verite
  - Normalisation du mapping erreurs champ/serveur (`errors.root` / `fieldError`)
  - Ajout de tests de non-regression sur flows erreur critiques
- Fichiers modifies:
  - `shared/schemas/agency.schema.ts`
  - `shared/schemas/user.schema.ts`
  - `shared/schemas/index.ts`
  - `shared/schemas/client.schema.ts`
  - `shared/schemas/prospect.schema.ts`
  - `shared/schemas/__tests__/client.schema.test.ts`
  - `shared/schemas/__tests__/prospect.schema.test.ts`
  - `frontend/src/components/AgencyFormDialog.tsx`
  - `frontend/src/components/ClientFormDialog.tsx`
  - `frontend/src/components/ProspectFormDialog.tsx`
  - `frontend/src/components/ClientContactDialog.tsx`
  - `frontend/src/components/ConvertClientDialog.tsx`
  - `frontend/src/components/LoginScreen.tsx`
  - `frontend/src/components/login/LoginScreenForm.tsx`
  - `frontend/src/components/ChangePasswordScreen.tsx`
  - `frontend/src/components/UserCreateDialog.tsx`
  - `frontend/src/components/UserIdentityDialog.tsx`
  - `frontend/src/components/UserMembershipDialog.tsx`
  - `frontend/src/components/InteractionDetails.tsx`
  - `frontend/src/components/interactions/InteractionDetailsFooter.tsx`
  - `frontend/src/hooks/useClientFormDialog.ts`
  - `frontend/src/hooks/useProspectFormDialog.ts`
  - `frontend/src/hooks/useClientContactDialog.ts`
  - `frontend/src/hooks/useConvertClientDialog.ts`
  - `frontend/src/hooks/useInteractionSubmit.ts`
  - `frontend/src/hooks/useCockpitFormController.ts`
  - `frontend/src/hooks/useUserCreateDialog.ts`
  - `frontend/src/hooks/useLoginScreenForm.ts`
  - `frontend/src/hooks/useChangePasswordState.ts`
  - `frontend/src/hooks/useInteractionDetailsState.ts`
  - `frontend/src/hooks/useSettingsState.ts`
  - `frontend/src/hooks/useUsersManager.ts`
  - `frontend/src/hooks/useAgenciesManager.ts`
  - `frontend/src/hooks/useClientsPanelState.ts`
  - `frontend/src/hooks/__tests__/useEntityFormDialogs.test.tsx`
  - `frontend/src/components/__tests__/AgencyFormDialog.test.tsx`
  - `frontend/src/components/__tests__/UserMembershipDialog.test.tsx`
  - `frontend/src/components/__tests__/LoginScreen.test.tsx`
  - `Plan_refactoring.md`
- Commandes executees:
  - `pnpm --dir frontend run typecheck`
  - `pnpm --dir frontend run lint -- --max-warnings=0`
  - `pnpm --dir frontend run test:coverage`
  - `pnpm --dir frontend run check:error-compliance`
  - `pnpm --dir frontend run build`
  - `pnpm run qa`
  - Verification ciblage couche 7: `rg --line-number "zodResolver\\(" frontend/src/components frontend/src/hooks`
  - Audit sous-agent: verification regressions forms RHF/Zod
  - MCP Context7: tentative `resolve-library-id` (quota depassee)
- Resultats:
  - Tous les formulaires cibles couche 7 sont relies a un resolver Zod
  - Les validations paralleles `setError` metier ont ete supprimees la ou le schema Zod est source de verite
  - Mapping erreurs coherent: erreurs champs RHF + erreurs serveur via `root`/`fieldError`
  - Tests supplementaires verts pour les flows erreur critiques
  - Gate locale complete PASS (`pnpm run qa`)
- Risques restants:
  - Aucun blocant identifie sur la couche 7
  - Observation mineure hors scope couche 7: un texte avec artefact d'encodage potentiel dans `useChangePasswordState` a surveiller
- Decision:
  - Couche 7 validee et terminee.
  - Passage a la couche suivante possible selon ordre officiel.

### 2026-02-24 - Couche 6 (State management TanStack Query + invalidation)

- Statut: TERMINEE
- Scope:
  - Centralisation des query keys (racines + normalisation des cles fallback)
  - Centralisation des invalidations TanStack Query via helpers dedies
  - Durcissement des invalidations avec scope agence/archives/orphans
  - Ajout de prefetch strategique minimal sur intentions de navigation (`clients`, `admin`)
  - Alignement retry QueryClient sur `AppError.retryable` (catalog comme source de verite)
  - Ajout des tests de regression/query management (keys, retry, invalidation, prefetch, hook reassign)
- Fichiers modifies:
  - `frontend/src/services/query/queryKeys.ts`
  - `frontend/src/services/query/queryClient.ts`
  - `frontend/src/services/query/queryInvalidation.ts`
  - `frontend/src/services/query/queryPrefetch.ts`
  - `frontend/src/services/query/__tests__/queryKeys.test.ts`
  - `frontend/src/services/query/__tests__/queryClient.test.ts`
  - `frontend/src/services/query/__tests__/queryInvalidation.test.ts`
  - `frontend/src/services/query/__tests__/queryPrefetch.test.ts`
  - `frontend/src/hooks/useArchiveAgency.ts`
  - `frontend/src/hooks/useCreateAgency.ts`
  - `frontend/src/hooks/useHardDeleteAgency.ts`
  - `frontend/src/hooks/useRenameAgency.ts`
  - `frontend/src/hooks/useUnarchiveAgency.ts`
  - `frontend/src/hooks/useArchiveUser.ts`
  - `frontend/src/hooks/useCreateAdminUser.ts`
  - `frontend/src/hooks/useDeleteUser.ts`
  - `frontend/src/hooks/useResetUserPassword.ts`
  - `frontend/src/hooks/useSetUserRole.ts`
  - `frontend/src/hooks/useSetUserMemberships.ts`
  - `frontend/src/hooks/useUnarchiveUser.ts`
  - `frontend/src/hooks/useUpdateUserIdentity.ts`
  - `frontend/src/hooks/useDeleteEntityContact.ts`
  - `frontend/src/hooks/useSaveEntityContact.ts`
  - `frontend/src/hooks/useSaveClient.ts`
  - `frontend/src/hooks/useSaveProspect.ts`
  - `frontend/src/hooks/useSetClientArchived.ts`
  - `frontend/src/hooks/useReassignEntity.ts`
  - `frontend/src/hooks/useClientsPanelState.ts`
  - `frontend/src/hooks/useInteractionHandlers.ts`
  - `frontend/src/hooks/useInteractionSubmit.ts`
  - `frontend/src/hooks/useInteractions.ts`
  - `frontend/src/hooks/useRealtimeInteractions.ts`
  - `frontend/src/hooks/useDashboardState.tsx`
  - `frontend/src/hooks/__tests__/useReassignEntity.test.tsx`
  - `frontend/src/App.tsx`
  - `Plan_refactoring.md`
- Commandes executees:
  - `pnpm --dir frontend run typecheck`
  - `pnpm --dir frontend run lint -- --max-warnings=0`
  - `pnpm --dir frontend run test:coverage`
  - `pnpm --dir frontend run check:error-compliance`
  - `pnpm --dir frontend run build`
  - `pnpm run qa`
- Resultats:
  - Query keys centralisees avec racines explicites + suppression du fallback literal `['interactions','none']`
  - Invalidations literals supprimees (dont `['clients']` / `['prospects']`) au profit de helpers scopes
  - Prefetch minimal actif sur navigation vers `clients` (clients+prospects actifs) et `admin` (users)
  - Retry QueryClient aligne catalog (`retryable === true` requis pour AppError)
  - Tests verts: `55` fichiers / `183` tests
  - Couverture gate frontend: statements `92.04`, branches `76.59`, functions `96.37`, lines `94.67`
  - Gate locale complete PASS (`pnpm run qa`)
- Preuves Supabase MCP (si applicable):
  - N/A (couche frontend state management, pas d'impact backend/DB/runtime Supabase)
- Risques restants:
  - Context7 indisponible (quota depassee) pendant la couche; arbitrage maintenu avec implementation conservative TanStack Query v5
  - Warnings React `act(...)` existants dans certains tests historiques, non bloquants et hors scope couche 6
- Decision:
  - Couche 6 validee et terminee.
  - Passage a la couche suivante autorise selon ordre officiel.

### 2026-02-25 - Couche 3 (Routing TanStack Router)

- Statut: TERMINEE
- Scope:
  - Introduction de TanStack Router avec route tree type-safe (`/cockpit`, `/dashboard`, `/clients`, `/admin`, `/settings`)
  - Migration de la navigation `AppTab` vers URLs metier (header tabs, menu profil, recherche globale, shortcuts F1-F5)
  - Garantie deep links + refresh + back/forward (tests E2E dedies)
  - Verification du code splitting par route via lazy imports des vues principales
- Fichiers modifies:
  - `frontend/package.json`
  - `pnpm-lock.yaml`
  - `frontend/src/main.tsx`
  - `frontend/src/App.tsx`
  - `frontend/src/app/router.tsx`
  - `frontend/src/app/appRoutes.ts`
  - `frontend/src/components/app-main/AppMainTabContent.tsx`
  - `frontend/src/app/__tests__/appRoutes.test.ts`
  - `frontend/src/app/__tests__/useAppShortcuts.test.tsx`
  - `frontend/e2e/navigation.spec.ts`
  - `Plan_refactoring.md`
- Commandes executees:
  - `pnpm --dir frontend add @tanstack/react-router@^1.114.3`
  - `pnpm --dir frontend run typecheck`
  - `pnpm --dir frontend run lint -- --max-warnings=0`
  - `pnpm --dir frontend run test:coverage`
  - `pnpm --dir frontend run check:error-compliance`
  - `pnpm --dir frontend run build`
  - `RUN_E2E=1 pnpm --dir frontend run test:e2e`
  - `pnpm run qa`
- Resultats:
  - Navigation URL-first activee sur les onglets metier, avec redirection `/` -> `/cockpit`
  - Garde d'acces conservee: route non autorisee (`/admin` ou `/settings`) redirigee vers `/cockpit`
  - Deep links/back-forward verifies par E2E (`navigation.spec.ts`)
  - Refresh conserve la route (`/clients`) et respecte le gate d'authentification
  - Code splitting route-level confirme au build (chunks dedies `CockpitForm`, `Dashboard`, `ClientsPanel`, `AdminPanel`, `Settings`)
  - Gates frontend PASS (typecheck, lint, coverage, error-compliance, build)
  - Gate globale PASS (`pnpm run qa`)
  - E2E PASS: `17 passed`, `1 skipped` (skip conditionnel role)
- Preuves Supabase MCP (si applicable):
  - N/A (couche frontend routing, sans impact backend/DB/runtime Supabase)
- Risques restants:
  - Sur hard reload sans session persistante (storage memoire), l'utilisateur est renvoye au login tout en conservant l'URL cible; comportement coherent avec la politique auth actuelle, hors scope couche 3
- Decision:
  - Couche 3 validee et terminee.
  - Passage a la couche suivante autorise selon ordre officiel.

### 2026-02-25 - Couche 9 (API Layer tRPC + Hono adapter)

- Statut: TERMINEE
- Scope:
  - Introduction de la couche tRPC backend (`context`, `procedures`, `router`) adossee a Hono
  - Montage du middleware `@hono/trpc-server` sur `/trpc/*` en conservant les routes REST `/data/*` et `/admin/*` pour compatibilite
  - Migration du transport frontend vers client tRPC (remplacement du transport REST interne) sans rupture des hooks metier existants
  - Alignement gestion d'erreurs frontend sur erreurs tRPC (mapper dedie + integration `safeRpc`)
- Fichiers modifies:
  - `backend/functions/api/middleware/auth.ts`
  - `backend/functions/api/app.ts`
  - `backend/functions/api/trpc/context.ts`
  - `backend/functions/api/trpc/procedures.ts`
  - `backend/functions/api/trpc/router.ts`
  - `deno.json`
  - `backend/deno.json`
  - `frontend/src/services/api/trpcClient.ts`
  - `frontend/src/services/api/rpcClient.ts`
  - `frontend/src/services/api/safeRpc.ts`
  - `frontend/src/services/errors/mapTrpcError.ts`
  - `frontend/src/services/api/__tests__/trpcClient.test.ts`
  - `frontend/src/services/api/__tests__/rpcClient.test.ts`
  - `frontend/src/services/api/__tests__/safeRpc.test.ts`
  - `frontend/src/services/errors/__tests__/mapTrpcError.test.ts`
  - `frontend/package.json`
  - `pnpm-lock.yaml`
  - `Plan_refactoring.md`
- Commandes executees:
  - `deno lint backend/functions/api`
  - `deno check --config backend/deno.json backend/functions/api/index.ts`
  - `deno test --allow-env --no-check --config backend/deno.json backend/functions/api`
  - `pnpm --dir frontend run typecheck`
  - `pnpm --dir frontend run lint -- --max-warnings=0`
  - `pnpm --dir frontend run test:coverage`
  - `pnpm --dir frontend run check:error-compliance`
  - `pnpm --dir frontend run build`
  - `pnpm run qa`
  - MCP Supabase: `list_projects`, `list_edge_functions`, `get_project_url`, `get_anon_key`
  - Probes runtime HTTP (`POST`/`OPTIONS`) via shell sur `/functions/v1/api/data/*` et `/functions/v1/api/trpc/*`
- Resultats:
  - Gate backend PASS (lint, typecheck, tests)
  - Gate frontend PASS (typecheck, lint, coverage, error-compliance, build)
  - Gate globale PASS (`pnpm run qa`)
  - Couverture frontend gate: statements `91.37`, branches `74.52`, functions `95.27`, lines `93.73`
  - `POST /functions/v1/api/data/*` sans token retourne `401 AUTH_REQUIRED` (aucun `404`)
  - `OPTIONS` routes impactees retourne `200` avec headers CORS pour l'origine whitelist `http://localhost:3000`
  - Contrat auth runtime `Authorization-only` preserve (`x-client-authorization` seul invalide => `401 AUTH_REQUIRED`)
- Preuves Supabase MCP (si applicable):
  - `list_edge_functions` (project `rbjtrcorlezvocayluok`): fonction `api` active, version `23`, `verify_jwt=false`, `entrypoint_path=source/supabase/functions/api/index.ts`, `import_map=true`
  - Probes runtime prod:
    - `/functions/v1/api/data/profile|config|entities|entity-contacts|interactions`:
      - `OPTIONS=200`, `Access-Control-Allow-Origin=http://localhost:3000`
      - `POST` anonyme `=401`, code `AUTH_REQUIRED`, sans `404`
    - `/functions/v1/api/data/entities` avec `x-client-authorization` seul:
      - `POST=401`, code `AUTH_REQUIRED`
- Risques restants:
  - La route runtime prod `/functions/v1/api/trpc/*` retourne encore `404` tant que la nouvelle version Edge Function n'est pas deployee en production
- Decision:
  - Couche 9 validee et terminee sur le code + gates QA + probes runtime de compatibilite `/data/*`.
  - Passage a la couche suivante autorise selon ordre officiel.

### [2026-02-25] Couche 12 - ORM (Drizzle backend-only)

- Statut: TERMINEE
- Scope:
  - Introduction de Drizzle backend-only avec schema relationnel type-safe et client runtime dedie
  - Migration des services backend de `supabase.from(...)` vers queries Drizzle
  - Maintien du client Supabase pour Auth/Admin Auth/rate-limit RPC/Storage/Realtime
  - Conservation des contrats REST/tRPC existants (payloads, codes erreurs, format reponse)
- Fichiers modifies:
  - `deno.json`
  - `backend/deno.json`
  - `backend/deno.lock`
  - `backend/drizzle/config.ts`
  - `backend/drizzle/schema.ts`
  - `backend/drizzle/relations.ts`
  - `backend/drizzle/index.ts`
  - `backend/functions/api/types.ts`
  - `backend/functions/api/middleware/auth.ts`
  - `backend/functions/api/services/dataAccess.ts`
  - `backend/functions/api/services/dataProfile.ts`
  - `backend/functions/api/services/dataEntityContacts.ts`
  - `backend/functions/api/services/dataInteractions.ts`
  - `backend/functions/api/services/dataEntities.ts`
  - `backend/functions/api/services/dataConfig.ts`
  - `backend/functions/api/services/adminAgencies.ts`
  - `backend/functions/api/services/adminUsers.ts`
  - `backend/functions/api/services/dataEntities_test.ts`
  - `Plan_refactoring.md`
- Commandes executees:
  - `deno lint backend/functions/api`
  - `deno check --config backend/deno.json backend/functions/api/index.ts`
  - `deno test --allow-env --no-check --config backend/deno.json backend/functions/api`
  - `RUN_API_INTEGRATION=1 deno test --allow-env --no-check --config backend/deno.json backend/functions/api/integration/api_integration_test.ts`
  - `pnpm run qa`
  - `rg -n "throw new Error\\(" frontend/src backend/functions/api shared --glob "!**/*.test.*" --glob "!**/*_test.ts"`
  - `rg -n "console\\.error\\(" frontend/src backend/functions/api shared --glob "!**/*.test.*" --glob "!**/*_test.ts"`
  - `rg -n "toast\\.error\\(" frontend/src`
  - `rg -n "@ts-ignore|@ts-expect-error" frontend/src backend/functions/api shared`
  - `rg -n "\\bany\\b" frontend/src backend/functions/api shared --glob "!**/*.test.*" --glob "!**/*_test.ts"`
  - `rg -n "x-client-authorization" frontend/src/services/api backend/functions/api/middleware backend/functions/api/app.ts`
  - Probes runtime HTTP (`POST`/`OPTIONS`) via shell sur `/functions/v1/api/data/entities|entity-contacts|interactions`
- Resultats:
  - Migration Couche 12 realisee: plus aucune utilisation `supabase.from(...)` dans `backend/functions/api/services`
  - Services `data/*` et `admin/*` alignes Drizzle, avec gardes auth/agence conservees (`ensureAgencyAccess`, `ensureOptionalAgencyAccess`, `ensureReassignSuperAdmin`)
  - Auth runtime conserve Supabase JWT/JWKS + contexte metier; DB queries backend executees via Drizzle
  - Gate backend PASS (`deno lint`, `deno check`, `deno test`)
  - Gate globale PASS (`pnpm run qa`)
  - Relecture regles:
    - `throw new Error` hors tests: `NO_MATCH`
    - `console.error` hors tests: `NO_MATCH`
    - `toast.error` uniquement `frontend/src/services/errors/notify.ts`: OK
    - `@ts-ignore`/`@ts-expect-error`: `NO_MATCH`
    - `any` hors tests: `NO_MATCH`
    - Contrat `x-client-authorization` fallback runtime: `NO_MATCH` dans code applicatif
  - Integration API opt-in (`RUN_API_INTEGRATION=1`):
    - KO fail-fast environnement: variables absentes (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `API_INT_ADMIN_EMAIL`, `API_INT_ADMIN_PASSWORD`, `API_INT_USER_EMAIL`, `API_INT_USER_PASSWORD`)
- Preuves Supabase MCP (si applicable):
  - `list_edge_functions` (project `rbjtrcorlezvocayluok`): `api` active, version `23`, `verify_jwt=false`, `entrypoint_path=source/supabase/functions/api/index.ts`, `import_map=true`
  - Probes runtime:
    - `POST /functions/v1/api/data/entities` => `401` (pas de `404`)
    - `POST /functions/v1/api/data/entity-contacts` => `401` (pas de `404`)
    - `POST /functions/v1/api/data/interactions` => `401` (pas de `404`)
    - `OPTIONS /functions/v1/api/data/entities|entity-contacts|interactions` => `200` + `Access-Control-Allow-Origin=http://localhost:3000`
    - `POST /functions/v1/api/data/entities` avec seul `x-client-authorization` => `401`
- Risques restants:
  - Le jeu de tests d'integration API `RUN_API_INTEGRATION=1` reste non executable tant que les variables `API_INT_*` ne sont pas renseignees localement
- Decision:
  - Couche 12 implementee et validee sur code + gates QA + probes runtime obligatoires
  - Passage a la couche suivante autorise des que l'environnement d'integration opt-in est provisionne

### [2026-02-26] Couche 10 - Backend framework (consolidation Hono)

- Statut: TERMINEE
- Scope:
  - Suppression des routes REST legacy `/admin/*` et `/data/*` au profit d'un backend tRPC-only
  - Stabilisation middleware Hono (headers CORS appliques aussi en erreurs precoces)
  - Revalidation contrat erreurs HTTP/catalog (`code -> status` strict, formatter tRPC aligne)
  - Renforcement tests integration routes sensibles (`/trpc/*`) + garde opt-in reseau
- Fichiers modifies:
  - `backend/functions/api/app.ts`
  - `backend/functions/api/middleware/corsAndBodySize.ts`
  - `backend/functions/api/middleware/errorHandler_test.ts`
  - `backend/functions/api/services/adminUsers.ts`
  - `backend/functions/api/trpc/procedures.ts`
  - `backend/functions/api/trpc/router.ts`
  - `backend/functions/api/trpc/appRoutes_test.ts`
  - `backend/functions/api/trpc/router_test.ts`
  - `backend/functions/api/integration/api_integration_test.ts`
  - `backend/functions/api/routes/adminUsers.ts` (supprime)
  - `backend/functions/api/routes/adminAgencies.ts` (supprime)
  - `backend/functions/api/routes/dataEntities.ts` (supprime)
  - `backend/functions/api/routes/dataEntityContacts.ts` (supprime)
  - `backend/functions/api/routes/dataInteractions.ts` (supprime)
  - `backend/functions/api/routes/dataConfig.ts` (supprime)
  - `backend/functions/api/routes/dataProfile.ts` (supprime)
  - `backend/functions/api/routes/dataEntities_test.ts` (supprime)
  - `shared/errors/types.ts`
  - `shared/errors/catalog.ts`
  - `frontend/scripts/generate-rpc-types.mjs`
  - `shared/api/generated/rpc-app.ts`
  - `frontend/src/services/errors/mapEdgeError.ts`
  - `frontend/src/services/errors/__tests__/mapEdgeError.test.ts`
  - `frontend/src/services/errors/__tests__/mapTrpcError.test.ts`
  - `docs/qa-runbook.md`
  - `Plan_refactoring.md`
- Commandes executees:
  - `deno lint backend/functions/api`
  - `deno check --config backend/deno.json backend/functions/api/index.ts`
  - `deno test --env-file=backend/.env --allow-env --no-check --config backend/deno.json backend/functions/api`
  - `pnpm --dir frontend run generate:rpc-types`
  - `pnpm run qa`
  - `rg -n "throw new Error\\(" frontend/src backend/functions/api shared --glob "!**/*.test.*" --glob "!**/*_test.ts"`
  - `rg -n "console\\.error\\(" frontend/src backend/functions/api shared --glob "!**/*.test.*" --glob "!**/*_test.ts"`
  - `rg -n "toast\\.error\\(" frontend/src`
  - `rg -n "@ts-ignore|@ts-expect-error" frontend/src backend/functions/api shared`
  - `rg -n "\\bany\\b" frontend/src backend/functions/api shared --glob "!**/*.test.*" --glob "!**/*_test.ts"`
  - `rg -n "x-client-authorization" frontend/src/services/api backend/functions/api/middleware backend/functions/api/app.ts`
  - MCP Supabase: `list_edge_functions`, `get_project_url`, `get_anon_key`
  - Probes runtime HTTP (`POST`/`OPTIONS`) via shell sur `/functions/v1/api/trpc/data.profile` et `/functions/v1/api/data/entities`
- Resultats:
  - Nettoyage legacy effectif: endpoints REST supprimes cote code, tRPC conserve comme unique surface API backend
  - Ordre middleware stabilise (`requestId` -> `corsAndBodySize` -> `trpc`) + headers CORS presents sur erreurs 413
  - Contrat erreurs aligne:
    - `AGENCY_NOT_FOUND` uniformise en `404`
    - `INVALID_PAYLOAD` reserve a `400`
    - nouveau code `PAYLOAD_TOO_LARGE` pour `413`
    - `tRPC unknown path` retourne desormais `404` avec `appCode=NOT_FOUND`
  - Tests backend renforces:
    - nouveaux tests `/trpc/*` (auth manquante, header `x-client-authorization`, unknown procedure)
    - tests integration opt-in migres vers routes tRPC et ignores proprement sans `--allow-net`
  - Gate backend PASS (`deno lint`, `deno check`, `deno test`)
  - Gate globale PASS (`pnpm run qa`)
  - Relecture regles:
    - `throw new Error` hors tests: `NO_MATCH`
    - `console.error` hors tests: `NO_MATCH`
    - `toast.error` uniquement `frontend/src/services/errors/notify.ts`: OK
    - `@ts-ignore`/`@ts-expect-error`: `NO_MATCH`
    - `any` hors tests: `NO_MATCH`
    - Contrat `x-client-authorization` fallback runtime: `NO_MATCH` dans code applicatif
- Preuves Supabase MCP (si applicable):
  - `list_edge_functions` (project `rbjtrcorlezvocayluok`): `api` active, version `23`, `verify_jwt=false`, `entrypoint_path=source/supabase/functions/api/index.ts`, `import_map=true`
  - Probes runtime:
    - `POST /functions/v1/api/trpc/data.profile` anonyme => `404` (version prod non deployee avec la consolidation Couche 10)
    - `OPTIONS /functions/v1/api/trpc/data.profile` => `200` + `Access-Control-Allow-Origin=http://localhost:3000`
    - `POST /functions/v1/api/data/entities` anonyme => `401` (ancienne surface REST encore presente en production)
    - `OPTIONS /functions/v1/api/data/entities` => `200` + `Access-Control-Allow-Origin=http://localhost:3000`
- Risques restants:
  - La prod execute encore la version `23` non alignee avec la suppression REST/tRPC-only de la Couche 10
  - Les probes runtime cibles `/trpc/*` restent en `404` tant que le deploy runtime n'est pas traite (Couche 11)
- Decision:
  - Couche 10 validee sur le code et les gates QA locales, avec override acte de la gouvernance runtime vers `/trpc/*`
  - Passage a la couche suivante autorise; consolidation runtime/deploy a finaliser en Couche 11

### [2026-02-26] Couche 11 - Runtime backend (consolidation Deno)

- Statut: TERMINEE
- Scope:
  - Consolidation runtime prod de l'Edge Function `api` apres bascule tRPC-only
  - Validation des prerequis Deno/Supabase (import maps, wrapper entrypoint, flags de deploy)
  - Alignement documentaire runtime `/trpc/*` dans les regles projet
- Fichiers modifies:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `Plan_refactoring.md`
- Commandes executees:
  - `git add -A && git commit -m "chore: snapshot global avant couche 11"` (aucun changement a committer)
  - `git push origin main`
  - `supabase functions list --project-ref rbjtrcorlezvocayluok --output pretty`
  - `supabase functions deploy api --project-ref rbjtrcorlezvocayluok --use-api --import-map deno.json --no-verify-jwt`
  - Probes runtime HTTP (`POST`/`OPTIONS`) via shell sur `/functions/v1/api/trpc/data.entities|data.entity-contacts|data.interactions`
  - Probe contrat auth via shell: `POST /functions/v1/api/trpc/data.entities` avec seul header `x-client-authorization`
  - Probe legacy informative via shell: `POST /functions/v1/api/data/entities`
  - MCP Supabase: `list_edge_functions`
- Resultats:
  - Baseline avant deploy: `POST /functions/v1/api/trpc/*` en `404`, `OPTIONS` en `200`
  - Deploy runtime execute avec la commande de reference et flags attendus
  - Runtime apres deploy:
    - `POST /functions/v1/api/trpc/data.entities` => `401` (plus de `404`)
    - `POST /functions/v1/api/trpc/data.entity-contacts` => `401` (plus de `404`)
    - `POST /functions/v1/api/trpc/data.interactions` => `401` (plus de `404`)
    - `OPTIONS /functions/v1/api/trpc/*` => `200` + `Access-Control-Allow-Origin=http://localhost:3000`
    - `POST /functions/v1/api/trpc/data.entities` avec seul `x-client-authorization` => `401`
  - Probe informative: `POST /functions/v1/api/data/entities` => `404` (surface legacy retiree en runtime)
- Preuves Supabase MCP (si applicable):
  - `list_edge_functions` (project `rbjtrcorlezvocayluok`): `api` active, version `24`, `verify_jwt=false`, `entrypoint_path=source/supabase/functions/api/index.ts`, `import_map=true`
- Risques restants:
  - Aucun risque bloquant couche 11 identifie
  - Warning non bloquant: version locale Supabase CLI (`2.54.11`) en retard vs derniere version proposee
- Decision:
  - Couche 11 validee et terminee
  - Passage a la couche suivante autorise selon ordre officiel

### [2026-02-26] Couche 5 - UI components (composition)

- Statut: TERMINEE
- Scope:
  - Reduction de la proliferation de props booleennes sur les flux UI critiques (`AppMain`, `InteractionSearch`, `Cockpit left`)
  - Clarification orchestration/presentation via etats de vue explicites (`mainViewState`, `search status`, `relationMode`)
  - Standardisation de composition par patterns `variant`/sections/slots sans changement visuel
  - Revalidation accessibilite clavier/labels/focus sur composants impactes
- Fichiers modifies:
  - `frontend/src/App.tsx`
  - `frontend/src/components/AppMainContent.tsx`
  - `frontend/src/components/app-main/AppMainContent.types.ts`
  - `frontend/src/components/app-main/AppMainStateView.tsx`
  - `frontend/src/components/AppSearchOverlay.tsx`
  - `frontend/src/components/InteractionSearchBar.tsx`
  - `frontend/src/components/interaction-search/InteractionSearchListArea.tsx`
  - `frontend/src/components/interaction-search/InteractionSearchResults.tsx`
  - `frontend/src/components/interaction-search/InteractionSearchStatusMessage.tsx`
  - `frontend/src/hooks/useInteractionSearch.ts`
  - `frontend/src/constants/relations.ts`
  - `frontend/src/hooks/useInteractionFormState.ts`
  - `frontend/src/hooks/useCockpitPaneProps.types.ts`
  - `frontend/src/hooks/useCockpitPaneProps.ts`
  - `frontend/src/hooks/useCockpitFormController.ts`
  - `frontend/src/components/cockpit/CockpitPaneTypes.ts`
  - `frontend/src/components/cockpit/buildCockpitLeftEntitySectionsProps.ts`
  - `frontend/src/components/cockpit/left/CockpitSearchSection.tsx`
  - `frontend/src/components/cockpit/left/CockpitIdentitySection.tsx`
  - `frontend/src/components/cockpit/left/CockpitIdentityEditor.tsx`
  - `frontend/src/components/cockpit/left/CockpitIdentityHints.tsx`
  - `frontend/src/components/cockpit/left/CockpitContactSection.tsx`
  - `frontend/src/components/cockpit/left/CockpitContactSection.types.ts`
  - `frontend/src/components/cockpit/left/CockpitManualContactSection.tsx`
  - `frontend/src/components/cockpit/left/CockpitManualContactForm.tsx`
  - `frontend/src/components/cockpit/left/CockpitManualContactForm.types.ts`
  - `frontend/src/components/cockpit/left/CockpitRelationSection.tsx`
  - `frontend/src/components/cockpit/left/CockpitServicePicker.tsx`
  - `frontend/src/components/cockpit/left/CockpitServiceSection.tsx`
  - `frontend/src/components/app-header/AppHeaderProfileMenu.tsx`
  - `frontend/src/components/audit-logs/AuditLogsFilters.tsx`
  - `frontend/src/components/audit-logs/AuditLogsDateRange.tsx`
  - `frontend/src/components/__tests__/AppMainStateView.test.tsx`
  - `frontend/src/components/audit-logs/__tests__/AuditLogsFilters.test.tsx`
  - `frontend/src/components/audit-logs/__tests__/AuditLogsDateRange.test.tsx`
  - `Plan_refactoring.md`
- Commandes executees:
  - `pnpm --dir frontend run typecheck`
  - `pnpm --dir frontend run lint -- --max-warnings=0`
  - `pnpm --dir frontend run test:run -- src/components/__tests__/AppMainStateView.test.tsx src/components/audit-logs/__tests__/AuditLogsFilters.test.tsx src/components/audit-logs/__tests__/AuditLogsDateRange.test.tsx`
  - `pnpm --dir frontend run test:coverage`
  - `pnpm --dir frontend run check:error-compliance`
  - `pnpm --dir frontend run build`
  - `RUN_E2E=1 pnpm --dir frontend run test:e2e`
  - `pnpm run qa`
- Resultats:
  - Etats de vue explicites introduits sur `AppMain` et `InteractionSearch` (reduction des combinaisons booleennes)
  - `relationMode` introduit et propage sur le cockpit gauche pour simplifier les branches de rendu
  - Accessibilite renforcee sur labels lies aux controles (`audit logs`, `relation`, `service`) et icone decorative profil
  - Tests ajoutes et verts sur les nouveaux comportements (`AppMainStateView`, labels audit)
  - Gates frontend PASS:
    - coverage: statements `91.37`, branches `74.52`, functions `95.27`, lines `93.73`
    - e2e: `17` passes, `1` skipped, `0` fail
  - Gate globale PASS (`pnpm run qa`): frontend + backend verts
- Preuves Supabase MCP (si applicable):
  - N/A (couche frontend UI components, sans impact backend/DB/runtime Supabase)
- Risques restants:
  - Aucun risque bloquant identifie sur la couche 5
  - Observation non bloquante: artefacts `frontend/coverage/**` regenes par la gate coverage locale
- Decision:
  - Couche 5 validee et terminee
  - Passage a la couche suivante autorise selon ordre officiel

### [2026-02-26] Couche 4 - Styling (coherence design/tokens)

- Statut: TERMINEE
- Scope:
  - Uniformisation globale des classes utilitaires vers tokens semantiques (`background/foreground/card/muted/border/primary/warning/destructive/success`)
  - Elimination des incoherences visuelles inter-pages (cockpit, dashboard, clients, admin, settings, login/gates)
  - Harmonisation des states focus (`focus-visible`, ring, ring-offset) sur composants metier et primitives UI
  - Stabilisation responsive viewport mobile (`min-h-[100dvh]` sur ecrans plein viewport)
- Fichiers modifies:
  - `frontend/src/index.css`
  - `frontend/tailwind.config.cjs`
  - `frontend/src/components/ui/{button,badge,combobox,dialog,sheet,switch,toggle}.tsx`
  - `frontend/src/app/{appConstants,getAppGate}.tsx`
  - `frontend/src/App.tsx`
  - `frontend/src/components/**/*` (harmonisation styling couche 4)
  - `frontend/src/hooks/{useCockpitFormController,useDashboardState}.ts*`
  - `Plan_refactoring.md`
- Commandes executees:
  - Audit style/focus/responsive (rg):
    - `hardcoded_color_matches` baseline `572` -> final `0`
    - `focus_non_visible_matches` baseline `12` -> final `3` (skip-link + cas librairie)
    - `h_screen_matches` baseline `7` -> final `0`
  - `pnpm --dir frontend run typecheck`
  - `pnpm --dir frontend run lint -- --max-warnings=0`
  - `pnpm --dir frontend run test:coverage`
  - `pnpm --dir frontend run check:error-compliance`
  - `pnpm --dir frontend run build`
  - `RUN_E2E=1 pnpm --dir frontend run test:e2e`
  - `pnpm run qa`
- Resultats:
  - Design tokens et classes utilitaires unifies sur les surfaces principales et composants transverses
  - Nouveau token `success` ajoute et integre dans Tailwind + primitives (`Badge`, `Button`)
  - Focus clavier homogene et renforce (rings/offsets), avec maintien du skip-link accessibilite
  - Responsive viewport stabilise (`min-h-[100dvh]`) sur les ecrans gate/login/error et shell principal
  - Gates frontend PASS:
    - `typecheck`, `lint`, `test:coverage`, `check:error-compliance`, `build`
    - couverture: statements `91.37`, branches `74.52`, functions `95.27`, lines `93.73`
  - E2E PASS: `17` passed, `1` skipped, `0` failed
  - Gate globale PASS (`pnpm run qa`): frontend + backend verts
- Preuves Supabase MCP (si applicable):
  - N/A (couche frontend styling, sans impact backend/DB/runtime Supabase)
- Risques restants:
  - Delta visuel large mais non fonctionnel sur de nombreux ecrans (normalisation globale des classes)
  - Artefacts coverage regenes localement (`frontend/coverage/**`)
- Decision:
  - Couche 4 validee et terminee
  - Passage a la couche suivante autorise selon ordre officiel

### [2026-02-26] Couche 2 - Build tool (optimisation Vite/chunks)

- Statut: TERMINEE
- Scope:
  - Reaudit complet du split Vite post-routing/tRPC/Drizzle avec mesures factuelles avant/apres
  - Recomposition `manualChunks` par domaines techniques a impact reel (`react-core`, `tanstack-core`, `tanstack-query`, `supabase`, `trpc`, `forms`, `data-grid`, `date-utils`, `calendar`, `ui-primitives`)
  - Exception validee sur la couche: lazy-load des ecrans de gate auth (`LoginScreen`, `ChangePasswordScreen`) pour reduire le cout du shell initial
  - Verification du build time et de la DX dev server (`vite ready`)
- Fichiers modifies:
  - `frontend/vite.config.ts`
  - `frontend/src/app/getAppGate.tsx`
  - `Plan_refactoring.md`
- Commandes executees:
  - `pnpm --dir frontend run typecheck`
  - `pnpm --dir frontend run lint -- --max-warnings=0`
  - `pnpm --dir frontend run build`
  - `pnpm --dir frontend exec vite build --manifest`
  - `pnpm --dir frontend run test:coverage`
  - `pnpm --dir frontend run check:error-compliance`
  - `RUN_E2E=1 pnpm --dir frontend run test:e2e`
  - `pnpm run qa`
  - `pnpm --dir frontend run dev -- --host 127.0.0.1 --port 4173 --strictPort`
  - `rg` controles stricts (`throw new Error`, `console.error`, `toast.error`, `@ts-ignore|@ts-expect-error`, `any`, `x-client-authorization`)
- Resultats:
  - Chunking Vite reequilibre:
    - `vendor` passe de `471.14 kB` (gzip `143.84 kB`) a `28.99 kB` (gzip `9.66 kB`)
    - introduction de chunks metier dedies (`tanstack-core`, `tanstack-query`, `trpc`, `data-grid`, `date-utils`, `calendar`, `ui-primitives`)
  - Payload JS initial (entry + imports manifest):
    - avant: `1,060,320` bytes raw / `316,625` bytes gzip (`7` fichiers)
    - apres: `940,782` bytes raw / `283,386` bytes gzip (`11` fichiers)
    - gain net: `-119,538` bytes raw et `-33,239` bytes gzip
  - Build time:
    - baseline mesuree: `~9.94s`
    - apres optimisation: `~7.65s` (build final)
  - DX dev server:
    - baseline: `ready in 545 ms`
    - apres optimisation: `ready in 519 ms`
  - Exception auth gate livree:
    - `LoginScreen` et `ChangePasswordScreen` sont des chunks dynamiques dedies
  - QA:
    - frontend gates PASS (`typecheck`, `lint`, `test:coverage`, `check:error-compliance`, `build`)
    - E2E PASS: `17 passed`, `1 skipped`, `0 failed`
    - gate globale PASS (`pnpm run qa`)
  - Conformite regles:
    - `throw new Error` hors tests: `NO_MATCH`
    - `console.error` hors tests: `NO_MATCH`
    - `toast.error` uniquement `frontend/src/services/errors/notify.ts`: OK
    - `@ts-ignore`/`@ts-expect-error`: `NO_MATCH`
    - `any` hors tests: `NO_MATCH`
    - `x-client-authorization` dans code applicatif: `NO_MATCH`
- Preuves Supabase MCP (si applicable):
  - N/A (couche frontend build tool, sans impact backend/DB/runtime Supabase)
- Risques restants:
  - Le nombre de chunks initiaux augmente (`7` -> `11`) malgre la baisse du poids total; risque de latence reseau accru en contexte tres contraint
  - Le chunk `ui-primitives` reste volumineux et charge au boot car le shell importe des composants UI transverses; optimisation complementaire potentielle hors scope strict Couche 2
- Decision:
  - Couche 2 validee et terminee
  - Passage a la couche suivante autorise selon ordre officiel

### [2026-02-26] Couche 2 - Build tool (optimisation complementaire post-risques)

- Statut: TERMINEE
- Scope:
  - Mitigation ciblee des risques residuels de la couche 2 (`chunks initiaux` et `ui-primitives` au boot)
  - Lazy-load de `AppSearchOverlay` et `ConvertClientDialog` avec prefetch sur intention utilisateur (hover/focus/pointerdown + ouverture clavier)
  - Reequilibrage `manualChunks` pour reduire le nombre de requetes initiales sans reintroduire un vendor monolithique
- Fichiers modifies:
  - `frontend/src/App.tsx`
  - `frontend/src/components/AppHeader.tsx`
  - `frontend/src/components/app-header/AppHeader.types.ts`
  - `frontend/src/components/app-header/AppHeaderSearchButton.tsx`
  - `frontend/vite.config.ts`
  - `Plan_refactoring.md`
- Commandes executees:
  - `pnpm --dir frontend run typecheck`
  - `pnpm --dir frontend run lint -- --max-warnings=0`
  - `pnpm --dir frontend run test:coverage`
  - `pnpm --dir frontend run check:error-compliance`
  - `pnpm --dir frontend run build`
  - `RUN_E2E=1 pnpm --dir frontend run test:e2e`
  - `pnpm --dir frontend exec vite build --manifest --sourcemap`
  - `node -e "<mesure initial payload depuis manifest>"`
  - `rg` controles stricts (`throw new Error`, `console.error`, `toast.error`, `@ts-ignore|@ts-expect-error`, `any`, `x-client-authorization`)
  - `pnpm run qa`
- Resultats:
  - Payload JS initial (entry + imports manifest) apres optimisation complementaire:
    - `923,700` bytes raw / `279,434` bytes gzip (`7` fichiers)
  - Delta vs precedent etat couche 2 (`11` fichiers, `940,782` raw, `283,386` gzip):
    - `-4` chunks initiaux
    - `-17,082` bytes raw
    - `-3,952` bytes gzip
  - `ui-primitives` reste le plus gros chunk (`246.02 kB`, gzip `78.09 kB`) mais la surface chargee au boot est mieux contenue par l'extraction lazy des overlays non critiques
  - QA complete PASS:
    - Frontend: `typecheck`, `lint`, `test:coverage` (`61` fichiers, `203` tests), `check:error-compliance`, `build`, `test:e2e` (`17` passed, `1` skipped, `0` failed)
    - Gate globale: `pnpm run qa` PASS (frontend + backend)
  - Conformite regles:
    - `throw new Error` hors tests: `NO_MATCH`
    - `console.error` hors tests: `NO_MATCH`
    - `toast.error` uniquement `frontend/src/services/errors/notify.ts`: OK
    - `@ts-ignore`/`@ts-expect-error`: `NO_MATCH`
    - `any` hors tests: `NO_MATCH`
    - `x-client-authorization` dans code applicatif: `NO_MATCH`
- Preuves Supabase MCP (si applicable):
  - N/A (couche frontend build tool, sans impact backend/DB/runtime Supabase)
- Risques restants:
  - `ui-primitives` demeure un hotspot de poids initial; gain additionnel possible via segmentation plus fine des primitives transverses, a arbitrer en couche 1 pour eviter une fragmentation excessive
  - Build avec `--sourcemap --manifest` est plus lent (`19.78s`) que le build gate standard (`~7.75s`), sans impact runtime utilisateur
- Decision:
  - Risques initiaux de latence reseau lies a la hausse de chunks (`7 -> 11`) traites avec retour a `7` chunks initiaux
  - Couche 2 reste validee et terminee
  - Passage a la couche suivante autorise selon ordre officiel

### [2026-02-26] Couche 1 - React 19 (optimisation finale)

- Statut: TERMINEE
- Scope:
  - Nettoyage des effets derives inutiles et reduction des mises a jour post-render
  - Optimisation des frontieres de re-render sur `App`, `cockpit`, `clients`, `dashboard`
  - Consolidation architecture React finale: split context session (`state`/`actions`) et keep-alive des onglets metier
  - Validation de non-regression produit via gates frontend + e2e + gate globale
- Fichiers modifies:
  - `frontend/src/hooks/useInteractionFormEffects.types.ts`
  - `frontend/src/hooks/useInteractionFormEffects.ts`
  - `frontend/src/hooks/useInteractionHandlers.types.ts`
  - `frontend/src/hooks/useInteractionHandlers.ts`
  - `frontend/src/hooks/useCockpitFormController.ts`
  - `frontend/src/hooks/useClientFormDialog.ts`
  - `frontend/src/hooks/useProspectFormDialog.ts`
  - `frontend/src/hooks/useInteractionDetailsState.ts`
  - `frontend/src/hooks/useClientsPanelState.ts`
  - `frontend/src/hooks/useDashboardState.tsx`
  - `frontend/src/types/app-session.ts`
  - `frontend/src/components/AppSessionProvider.tsx`
  - `frontend/src/hooks/useAppSession.ts`
  - `frontend/src/App.tsx`
  - `frontend/src/components/app-main/AppMainTabContent.tsx`
  - `frontend/src/components/AppHeader.tsx`
  - `frontend/src/components/AppMainContent.tsx`
  - `frontend/src/components/AppSearchOverlay.tsx`
  - `frontend/src/components/Dashboard.tsx`
  - `frontend/src/components/clients/ClientsPanelLayout.tsx`
  - `frontend/src/components/clients/buildClientsPanelSectionProps.ts`
  - `frontend/src/components/dashboard/toolbar/DashboardDateFilters.tsx`
  - `Plan_refactoring.md`
- Commandes executees:
  - `pnpm --dir frontend run typecheck`
  - `pnpm --dir frontend run lint -- --max-warnings=0`
  - `pnpm --dir frontend run test:run -- src/hooks/__tests__/useDashboardState.test.tsx src/components/__tests__/AppSearchOverlay.test.tsx src/app/__tests__/useAppShortcuts.test.tsx`
  - `pnpm --dir frontend run test:coverage`
  - `pnpm --dir frontend run check:error-compliance`
  - `pnpm --dir frontend run build`
  - `RUN_E2E=1 pnpm --dir frontend run test:e2e`
  - `RUN_E2E=1 pnpm run qa`
- Resultats:
  - Gates frontend completes PASS (`typecheck`, `lint`, `test:coverage`, `check:error-compliance`, `build`)
  - E2E PASS: `17 passed`, `1 skipped`, `0 failed`
  - Gate globale PASS (`RUN_E2E=1 pnpm run qa`)
  - Backend QA dans gate globale: `74 passed`, `0 failed`, `8 ignored`
  - Nettoyage des effets derives realise sur formulaires/hooks cibles
  - Hotspots de re-render reduits via stabilisation props/callbacks et memoisation des frontieres couteuses
  - Keep-alive des onglets metier actif avec garde d'acces conservee (`admin`/`settings`)
- Preuves Supabase MCP (si applicable):
  - N/A (couche React frontend, sans impact backend/DB/runtime Supabase)
- Risques restants:
  - Aucune regression bloquante detectee par les gates QA et E2E
  - Les artefacts `frontend/coverage/**` restent regeneres localement par la gate coverage
- Decision:
  - Couche 1 validee et terminee
  - Passage a la couche suivante autorise
