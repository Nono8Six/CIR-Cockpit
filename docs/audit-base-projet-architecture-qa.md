# Audit base projet - architecture et QA

Date: 2026-04-25  
Derniere mise a jour: 2026-04-26
Perimetre: audit du repo `CIR-Cockpit`, avec mise a jour de l'etat reel du 2026-04-26 et migration applicative admin/audit vers backend/tRPC. Aucune migration DB live n'est appliquee dans cette tranche.

## Verdict executif

La base projet est fonctionnelle, testee et exploitable. Les checks locaux et les validations documentees confirment un socle solide: hygiene repo, typecheck/lint/tests front, compliance erreurs, Deno lint/check/tests backend, `qa:fast` et `qa` passes lors de la derniere livraison applicative. Le runtime Supabase expose aussi un socle coherent: 20 tables `public` visibles, RLS activee partout, et l'Edge Function `api` active en `verify_jwt=false`.

Le P0 tRPC client et le P0 QA/docs ont ete traites. Le frontend consomme maintenant un contrat `AppRouter` partage via `shared/api/trpc.ts`, les anciens artefacts RPC generes ont ete supprimes, et la frontiere Supabase direct vs backend/tRPC est formalisee. Les dettes restantes se concentrent sur trois axes structurants: migrations revelees par cette frontiere API, decoupage par domaines, et alignement explicite DB/types/schemas. La dette n'est pas un blocage court terme, mais elle augmente le cout de chaque evolution transverse.

Priorites:

| Priorite | Chantier | Decision |
| --- | --- | --- |
| Clos | Typage tRPC client | Contrat type-only `AppRouter` consomme cote frontend; anciens artefacts RPC generes supprimes. |
| Clos | QA/docs | Contradictions coverage/CI corrigees dans `docs/testing.md` et `docs/qa-runbook.md`; scripts de gate conserves alignes. |
| P1 | Decoupage front/back | Reorganiser progressivement par domaines fonctionnels, sans big bang. |
| Clos | Frontiere API | Regle Supabase direct vs backend/tRPC formalisee; migrations restantes identifiees sans etre cochees. |
| Clos | Alignement DB | Audit cible migrations/live/types/Drizzle/Zod effectue; divergences et garde-fous documentes avant refactor/suppression. |
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
- [x] 2. P0 - Corriger la derive QA/docs.
  - [x] Corriger `docs/testing.md` pour refleter le workflow GitHub Actions actif.
    - Preuve: section CI/CD alignee sur `.github/workflows/qa.yml`, actif sur pull request et `workflow_dispatch`, avec execution de `pnpm run qa`.
  - [x] Clarifier les seuils coverage.
    - Preuve: `docs/testing.md` et `docs/qa-runbook.md` distinguent maintenant le global `55/50/50/58`, les domaines critiques `80/70/80/80`, et les seuils cibles explicites de `frontend/vitest.config.ts`.
  - [x] Verifier la source executable de la gate.
    - Preuve: `package.json` execute `scripts/qa-gate.ps1` via `pnpm run qa`; `scripts/qa-gate.ps1` et `scripts/qa-gate.sh` gardent le meme ordre de gate et se declarent miroirs.
- [x] 3. P1 - Formaliser la frontiere API Supabase direct vs backend/tRPC.
  - [x] Inventorier les acces Supabase directs front.
    - Preuve: scan `requireSupabaseClient`, `supabase.from(...)`, `supabase.auth`, `channel(...)`, `safeTrpc` et `invokeTrpc` dans `frontend/src/services` et `frontend/src/hooks`.
  - [x] Classer les usages autorises, toleres temporairement et a migrer.
    - Preuve: contrat ecrit dans la section "Frontiere API formalisee" avec matrice par famille de services.
  - [x] Ne pas cocher les migrations applicatives non faites.
    - Preuve: drafts, interactions directes, entreprises connues et preference d'agence active restent listes comme dettes de migration; admin/audit est coche seulement apres migration effective.
  - [x] Migrer les lectures admin/audit sensibles vers backend/tRPC.
    - Preuve: `getAdminUsers` appelle `admin.users-list`; `getAuditLogs` appelle `admin.audit-logs`; `backend/functions/api/services/adminQueries.ts` centralise les agregations et les droits; tests cibles frontend/backend PASS.
- [x] 4. P1 - Auditer l'alignement DB/types/schemas avant refactor.
  - Preuve: MCP Supabase `list_tables`, `generate_typescript_types`, requetes `information_schema`/`pg_constraint`/policies/indexes, puis relecture ciblee de `backend/migrations`, `shared/supabase.types.ts`, `backend/drizzle/schema.ts` et `shared/schemas/*`.
- [ ] 5. P1 - Decouper progressivement le frontend par domaines.
  - [x] Avancement cible 2026-04-26: `frontend/src/components/entity-onboarding/useEntityOnboardingFlow.ts` n'est plus le mega-hook de 833 lignes; il est redescendu a 270 lignes et delegue types, etapes, checklist, valeurs derivees, etat local, donnees entreprise, effets et actions a des modules dedies.
  - [ ] Reste ouvert: `EntityOnboardingDialog.tsx`, plusieurs sous-composants `entity-onboarding`, `useSettingsState.ts`, `useInteractionDraft.ts`, `AppLayout.tsx` et des zones `client-directory` restent au-dessus de la cible de lisibilite.
- [ ] 6. P1 - Decouper progressivement le backend par domaines tRPC/services.
  - [x] Avancement cible 2026-04-26: annuaire entreprise et data save decoupes (`directoryCompany*`, `directoryListing*`, `directoryDuplicates*`, `dataEntitiesSave*`), avec validations Deno ciblees documentees dans `docs/plan.md`.
  - [ ] Reste ouvert: le router tRPC et plusieurs services transverses restent horizontaux; aucune convention de domaines backend n'est encore imposee mecaniquement.
- [ ] 7. P2 - Traiter la dette UI/perf/a11y non bloquante.

## Cartographie actuelle

Frontend:

- Stack: React `19.2.4`, Vite `7.3.1`, TypeScript `5.9.3`, TanStack Router `1.162.9`, TanStack Query `5.90.21`, Tailwind CSS `4.1.18`, shadcn/Radix, Sonner, Lucide, React Hook Form, Zod.
- Structure actuelle: `frontend/src/app`, `components`, `hooks`, `services`, `stores`, `schemas`, `types`, `utils`, `constants`.
- Acces donnees hybride: services Supabase directs pour auth/session/realtime et certains services applicatifs historiques, plus client tRPC type via `/functions/v1/api/trpc`.
- Evidence: `docs/stack.md`, `frontend/package.json`, `frontend/src/services/api/trpcClient.ts`, `frontend/src/services/api/safeTrpc.ts`, `shared/api/trpc.ts`.

Backend:

- Runtime: Supabase Edge Function unique `api`, Deno, Hono `4.12.4`, `@hono/trpc-server`, tRPC `11.10.0`.
- Structure actuelle: `backend/functions/api/app.ts`, `index.ts`, `middleware`, `services`, `trpc`, `integration`; le dossier `routes` existe mais est vide.
- Data access: Supabase JS pour auth/admin/contexte utilisateur, Drizzle ORM `0.45.1` + `postgres` pour une partie des requetes metier.
- Evidence: `backend/deno.json`, `deno.json`, `backend/functions/api/app.ts`, `backend/functions/api/trpc/router.ts`.

Shared:

- `shared/schemas`: schemas Zod partages front/back.
- `shared/errors`: `AppError`, catalog, types, fingerprint.
- `shared/supabase.types.ts`: types Supabase generes, fichier volumineux de 1050 lignes.
- `shared/api/trpc.ts`: miroir tRPC type-only partageable cote frontend, expose `AppRouter`, `RouterInputs` et `RouterOutputs`.
- `shared/api/generated/rpc-app.ts`: supprime. La generation hardcodee de paths RPC n'est plus la source du contrat client.

Base Supabase:

- MCP Supabase, lecture initiale du 2026-04-25 revalidee le 2026-04-26: 20 tables `public`, toutes avec `rls_enabled=true`.
- Tables visibles: `agencies`, `profiles`, `agency_members`, `interactions`, `agency_statuses`, `agency_services`, `agency_entities`, `agency_families`, `audit_logs`, `rate_limits`, `interaction_drafts`, `agency_interaction_types`, `entities`, `entity_contacts`, `agency_system_users`, `audit_logs_archive`, `directory_saved_views`, `app_settings`, `agency_settings`, `reference_departments`.
- Edge Function MCP: `api` active, version `37`, `verify_jwt=false`, entrypoint `source/supabase/functions/api/index.ts`, import map `source/deno.json`.
- Repo: `supabase/config.toml` confirme aussi `verify_jwt=false`.

## Constats prioritaires

### Clos - tRPC client end-to-end typed

Etat actuel: le P0 initial est traite. Le frontend ne passe plus par `createTRPCUntypedClient<AnyRouter>` et ne depend plus de `shared/api/generated/rpc-app.ts`.

Preuves verifiees:

- `shared/api/trpc.ts` importe `initTRPC`, compose le miroir type-only et exporte `AppRouter`, `RouterInputs`, `RouterOutputs`.
- `frontend/src/services/api/trpcClient.ts` importe `type { AppRouter } from 'shared/api/trpc'` et cree `createTRPCClient<AppRouter>`.
- `frontend/src/services/api/rpcClient.ts`, `frontend/scripts/generate-rpc-types.mjs`, `shared/api/generated/rpc-app.ts` et `frontend/src/services/api/safeRpc.ts` n'existent plus.
- `frontend/package.json` n'a plus de hook `pretypecheck`; `typecheck` execute directement `tsc -p tsconfig.json --noEmit`.

Vigilance residuelle: `safeTrpc` et `invokeTrpc` conservent une couche de parsing/mapping d'erreurs utile, mais les appels passent par des procedures typees. Le risque restant n'est plus le path string hardcode; il se situe plutot dans la coherence entre le miroir `shared/api/trpc.ts`, les schemas Zod partages et les procedures backend reelles.

### Clos - QA/runbook recadre

Etat initial: la gate existait, mais la documentation n'etait pas parfaitement canonique.

Derives corrigees:

- `docs/testing.md` ne dit plus que le projet n'a pas de CI active; il decrit maintenant `.github/workflows/qa.yml`.
- `docs/testing.md` et `docs/qa-runbook.md` separent clairement le seuil global `55/50/50/58`, les domaines critiques `80/70/80/80`, et les seuils explicites de `frontend/vitest.config.ts`.
- Les scripts executables ne sont pas modifies: `pnpm run qa` pointe toujours vers `scripts/qa-gate.ps1`, et `scripts/qa-gate.sh` reste son miroir.

Vigilance residuelle: si la gate evolue, modifier d'abord le script canonique execute par `package.json`, puis synchroniser son miroir et les sections `docs/qa-runbook.md` / `docs/testing.md`.

### P1 - Frontend trop plat

Le frontend est robuste mais encore organise par types techniques: `components`, `hooks`, `services`, `utils`. Des domaines metier emergent deja dans les noms (`cockpit`, `client-directory`, `settings`, `admin`, `entity-onboarding`), mais ils sont disperses entre plusieurs dossiers racine.

Signaux actuels:

- Plusieurs orchestrateurs ou composants restent au-dessus de la cible de lisibilite: `EntityOnboardingDialog.tsx` 524 lignes, `EntityOnboardingSearchStep.tsx` 708 lignes, `EntityOnboardingSidebar.tsx` 454 lignes, `EntityOnboardingDetailsStep.tsx` 409 lignes, `useSettingsState.ts` 307 lignes, `useInteractionDraft.ts` 280 lignes, `ClientDirectoryTable.tsx` 264 lignes, `AppLayout.tsx` 245 lignes.
- Le precedent hotspot `frontend/src/components/entity-onboarding/useEntityOnboardingFlow.ts` est passe de 833 lignes a 270 lignes apres extraction des types, etapes, checklist, valeurs derivees, etat local, donnees entreprise, effets et actions. Il n'est plus le signal principal, mais il reste dans un domaine encore trop fragmente horizontalement.
- Les hooks metier cockpit/directory/admin/settings sont au meme niveau dans `frontend/src/hooks`.
- Les services API/Supabase/metier cohabitent dans `frontend/src/services` avec beaucoup de conventions implicites.

Recommandation: migrer progressivement vers une structure feature-sliced par domaines, sans deplacer les primitives shadcn ni casser les imports en masse.

### P1 - Backend trop horizontal

Le router tRPC centralise encore les domaines `data`, `cockpit`, `admin`, `config`, `directory` dans `backend/functions/api/trpc/router.ts` (201 lignes). Les services restent principalement regroupes dans `backend/functions/api/services`, avec quelques sous-dossiers (`adminUsers`) mais pas encore de convention domaine/procedure/schema uniforme.

Avancement depuis l'audit initial:

- `directory.ts` est une facade courte; le vrai hotspot `directoryCompany.ts` a ete decoupe en schemas, client HTTP/parsing, mapper recherche et mapper details.
- `directoryListing.ts` et `directoryDuplicates.ts` sont devenus des facades.
- `dataEntitiesSave.ts` a ete decoupe en orchestration, construction des lignes a persister et persistance DB/contact principal.

Le dossier `backend/functions/api/routes` existe mais est vide. Il doit etre supprime s'il est obsolete, ou reaffecte avec une responsabilite claire si des routes Hono hors tRPC reviennent.

### Clos - Frontiere API formalisee

`docs/stack.md` decrit explicitement un frontend hybride: Supabase direct + tRPC. Ce choix est maintenu, mais il devient un contrat explicite.

Regle canonique:

- Supabase direct autorise pour auth Supabase, session, refresh token, changement de mot de passe utilisateur courant, subscription realtime, et bootstrap minimal du contexte utilisateur/agence quand l'acces reste strictement borne par RLS.
- Supabase direct tolere temporairement pour quelques lectures/ecritures historiques simples deja protegees par RLS, uniquement si elles sont inventoriees ci-dessous et ne masquent pas une absence de procedure backend.
- Backend/tRPC obligatoire pour mutations metier, workflows multi-table, actions admin, audit, rate limiting, validation serveur, usages de service role, logique cross-agency, external APIs et toute donnee partagee qui doit etre normalisee ou historisee.
- Toute nouvelle feature doit choisir explicitement sa frontiere avant implementation. Par defaut, une nouvelle operation metier passe par backend/tRPC.

Matrice actuelle des usages frontend:

| Famille | Fichiers constates | Decision | Justification |
| --- | --- | --- | --- |
| Auth/session Supabase | `services/auth/signInWithPassword.ts`, `signOut.ts`, `getSession.ts`, `onAuthStateChange.ts`, `getCurrentUserId.ts`, `updateUserPassword.ts`, `services/api/trpcClient.ts` | Autorise | API Supabase Auth native, session locale, refresh token et credential flow utilisateur courant. |
| Profil courant et bootstrap agence | `services/auth/getProfile.ts`, `getCurrentUserLabel.ts`, `services/agency/getAgencyMemberships.ts`, `getProfileActiveAgencyId.ts`, `getAgencies.ts` | Tolere temporairement | Lectures bootstrap bornees par RLS; a garder petites et sans logique metier lourde. |
| Preference agence active | `services/agency/setProfileActiveAgencyId.ts` | A migrer | Ecriture sur `profiles`; doit passer par une procedure backend si la preference devient une regle produit ou doit etre auditee. |
| Realtime interactions | `hooks/useRealtimeInteractions.ts` | Autorise | Subscription realtime Supabase; aucune mutation. Les payloads alimentent le cache TanStack Query. |
| Brouillons interaction | `services/interactions/getInteractionDraft.ts`, `saveInteractionDraft.ts`, `deleteInteractionDraft.ts` | A migrer | CRUD applicatif sur `interaction_drafts`; meme si RLS borne l'acces, c'est un workflow metier utilisateur/agence. |
| Interactions directes | `services/interactions/getInteractions.ts`, `getKnownCompanies.ts` | A migrer | Lectures metier sur `interactions`; `data.interactions` existe deja comme frontiere backend pour d'autres usages. |
| Admin utilisateurs et audits | `services/admin/getAdminUsers.ts`, `getAuditLogs.ts` | Conforme backend/tRPC | Migres vers `admin.users-list` et `admin.audit-logs`; agregations profils/agences cote backend, schemas de sortie partages, droits `super_admin` pour utilisateurs et `super_admin`/`agency_admin` borne agence pour audits. |
| Annuaire, entites, clients, config, mutations admin | `services/directory/*`, `services/entities/*`, `services/clients/*`, `services/config/*`, `services/admin/admin*.ts`, `services/interactions/saveInteraction.ts`, `deleteInteraction.ts`, `getInteractionsByEntity.ts` | Conforme backend/tRPC | Appels via `safeTrpc` / `invokeTrpc`, schemas partages et router `shared/api/trpc.ts`. |

Priorite de migration conseillee:

1. `getInteractions` et `getKnownCompanies`: lectures metier sur `interactions`, a rapprocher de `data.interactions`.
2. `getInteractionDraft`, `saveInteractionDraft`, `deleteInteractionDraft`: CRUD de brouillons a deplacer vers une procedure dediee si le workflow continue d'evoluer.
3. `setProfileActiveAgencyId`: preference profil a traiter via backend si on veut audit, validation ou logique multi-agence plus stricte.

Ce qui ne doit plus arriver: ajouter une nouvelle lecture ou mutation metier Supabase directe dans `frontend/src/services` sans ligne de justification dans cette matrice ou sans procedure backend/tRPC.

### Clos - Alignement DB/types/schemas audite

Perimetre audite le 2026-04-26: tables live `profiles`, `agency_members`, `agencies`, `audit_logs`, `interactions`, `interaction_drafts`, `entities`, `entity_contacts`; migrations locales; types Supabase generes; schema Drizzle; schemas Zod de payloads et de reponses. Le code admin/audit a ensuite ete migre vers backend/tRPC sans migration DB live.

Etat live verifie:

- 20 tables `public`, toutes avec RLS activee.
- Tables auditees avec donnees existantes: `profiles` 31 lignes, `agency_members` 32, `agencies` 2, `audit_logs` 742, `interactions` 3, `interaction_drafts` 2, `entities` 5, `entity_contacts` 6.
- Policies RLS coherentes avec le modele multi-tenant: `agency_members` borne par appartenance ou `super_admin`; `interactions` borne par agence/entite accessible; `interaction_drafts` borne par `user_id = auth.uid()`; `entity_contacts` borne par l'entite parente; `audit_logs` lisible par `super_admin` ou `agency_admin` membre.
- Indexes de securite/performance encore presents sur les FK et acces critiques: memberships user/agence, interactions agence/date/statut/entite/contact/createur/updater, contacts par entite, entites par annuaire, audit logs par agence/acteur/date, drafts par `(user_id, agency_id, form_type)`.

Sources de verite constatees:

| Couche | Etat | Decision |
| --- | --- | --- |
| Migrations repo | 76 migrations SQL locales. Elles racontent l'historique, pas forcement le schema final lisible en un fichier. | A utiliser pour comprendre l'origine d'une contrainte, d'une policy ou d'un index avant suppression. |
| Live Supabase MCP | Source de verite de l'etat deploye: colonnes, nullabilite, policies, indexes, contraintes et row counts. | A requalifier avant toute modification DB ou suppression d'index/policy. |
| `shared/supabase.types.ts` | 1050 lignes, `PostgrestVersion: "14.1"`. Les sections echantillonnees pour les tables auditees refletent le type genere MCP: `interaction_drafts.agency_id` non nullable, `interactions.agency_id` nullable, `profiles.last_name` non nullable, `entities` et `entity_contacts` conformes aux colonnes live. | Source de typage front/back. A regenerer apres chaque migration appliquee. |
| `backend/drizzle/schema.ts` | Couche partielle pour requetes SQL typees. Elle couvre les domaines actifs, mais ne decrit pas tout le schema live: pas `audit_logs_archive`, pas `rate_limits`. `audit_logs` a ete ajoute pour la procedure backend admin/audit. | Ne pas l'utiliser comme preuve que la DB est exhaustive. Elle doit rester synchronisee seulement avec les tables qu'elle manipule. |
| `shared/schemas/*` | Contrats API et formulaires, pas miroir complet de la DB. Les schemas `.strict()` filtrent les payloads metier, tandis que `api-responses.ts` caste les rows DB via gardes minimaux. | A auditer par endpoint avant chaque migration de frontiere ou refactor tRPC. |

Ecarts ou vigilances factuels:

- `interactions.id`: live Supabase expose `id text` et `shared/supabase.types.ts` le type en `string`. La divergence Drizzle initiale `uuid('id')` a ete corrigee le 2026-04-26: `backend/drizzle/schema.ts` declare maintenant `text('id').$type<string>().primaryKey()`, avec garde-fou dans `pnpm run repo:check`.
- `entities.department`: contrainte live `^[0-9]{2}$`, alors que `client.schema.ts` accepte `^\d{2,3}$`. Les departements de l'annuaire de reference acceptent bien des codes non strictement numeriques comme `2A/2B` via `reference_departments`, mais la table `entities.department` ne les acceptera pas. Ce point doit etre tranche avant d'enrichir l'annuaire client.
- `interaction_drafts`: la table live a `agency_id` non nullable et une unique key `(user_id, agency_id, form_type)`. Le schema formulaire `interactionDraftSchema` accepte un `agency_id` optionnel car il valide un etat UI transitoire, pas la ligne DB finale. La future migration backend/tRPC des brouillons devra donc separer clairement validation brouillon UI et payload persiste.
- `profiles.first_name`: live nullable, `profiles.last_name` non nullable. Le fallback legacy frontend de `getAdminUsers` a ete supprime avec la migration backend/tRPC; la liste admin consomme maintenant le schema live via Drizzle et le contrat `adminUsersListResponseSchema`.
- `api-responses.ts`: les rows `entities`, `entity_contacts` et `interactions` sont validees par `z.custom` avec gardes minimaux, pas par une validation colonne par colonne. C'est acceptable comme contrat de transport tant que les rows viennent du backend, mais insuffisant si une sortie exposee devient publique ou recombine plusieurs sources.
- Les direct reads encore listes dans la frontiere API (`getInteractions`, `getKnownCompanies`, brouillons) sont les meilleurs candidats suivants pour consommer cet audit: ils touchent justement les tables avec RLS, nullabilite et contrats Zod a clarifier.

Decision: l'alignement n'est pas bloquant pour continuer le refactor par domaines, mais il interdit les suppressions opportunistes de colonnes/index/policies. Le modele Drizzle `interactions.id` est maintenant aligne avec le schema live; les vigilances restantes portent surtout sur `entities.department`, les brouillons et la validation row-level des sorties API.

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

tRPC cible et garde-fous:

- Maintenir `shared/api/trpc.ts` comme surface type-only partageable sans embarquer du runtime Deno dans le bundle frontend.
- Maintenir le client tRPC type (`createTRPCClient<AppRouter>`) cote frontend.
- Garder supprimes les artefacts generes hardcodes (`shared/api/generated/rpc-app.ts`, `generate-rpc-types.mjs`, anciens clients untyped).
- Pour toute nouvelle procedure, ajouter ou adapter le miroir `shared/api/trpc.ts`, les schemas Zod partages et les tests de service afin d'eviter une nouvelle derive entre backend et frontend.

QA cible:

- Choisir une source canonique: soit `scripts/qa-gate.ps1` comme executable principal et `qa-gate.sh` derive/verifie, soit un seul script cross-platform.
- Source executable actuelle: `scripts/qa-gate.ps1`, appele par `pnpm run qa`; `scripts/qa-gate.sh` reste un miroir a garder synchronise.
- `docs/testing.md` reflete `.github/workflows/qa.yml`.
- Les seuils sont clarifies: global `55/50/50/58`, domaines critiques `80/70/80/80`, seuils explicites de hooks/composants/utilitaires dans `frontend/vitest.config.ts`.
- Retirer des docs toute mention du flux obsolete `pretypecheck` / `generate:rpc-types`.
- Documenter que `frontend:typecheck` lance maintenant directement `tsc -p tsconfig.json --noEmit`.

DB cible:

- Declarer la source de verite operationnelle par usage: migrations repo pour historique, live Supabase MCP pour etat deploye, `shared/supabase.types.ts` pour typage front/back, Drizzle pour requetes SQL typees, Zod pour contrats API.
- Avant toute suppression/refactor: verifier table, index, policies, grants, triggers, fonctions, usages backend/frontend/tests.
- Regenerer les types Supabase apres modification schema, puis verifier les schemas Zod affectes.

## Plan de validation

Validation historique effectuee pour l'audit Markdown initial du 2026-04-25:

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

Validation applicative recente documentee dans `docs/plan.md` pour les refactors du 2026-04-26:

- Phase 4 annuaire entreprise: Deno lint/check/tests cibles PASS sur les modules `directoryCompany*`, `directoryListing*`, `directoryDuplicates*`, `dataEntitiesSave*` et tests associes.
- Phase 4 onboarding entite: `pnpm --dir frontend run typecheck` PASS, `pnpm --dir frontend run lint` PASS, tests cibles onboarding/cockpit PASS, `pnpm run qa:fast` PASS, `pnpm run qa` PASS.
- Migration admin/audit: `getAdminUsers` et `getAuditLogs` ne font plus de lecture Supabase directe; ils consomment les procedures tRPC `admin.users-list` et `admin.audit-logs`.

Revalidation effectuee le 2026-04-26 pour cette mise a jour:

| Controle | Commande | Resultat |
| --- | --- | --- |
| Worktree avant migration admin/audit | `git status --short` | Worktree deja modifie par les tranches precedentes: Drizzle `interactions.id`, docs de gouvernance et plan. Ces changements ne sont pas revertis. |
| Hygiene repo | `pnpm run repo:check` | PASS: `Repo state check passed.` |
| Recherche artefacts RPC obsoletes | `Test-Path` + `rg` sur `rpcClient`, `generated/rpc-app`, `generate-rpc`, `createTRPCUntypedClient`, `pretypecheck` | Les artefacts obsoletes n'existent plus; seules les mentions documentaires etaient obsoletes. |
| Tailles hotspots | mesure lignes sur fichiers front/back cibles | Hotspots actualises: `useEntityOnboardingFlow.ts` 270 lignes, `EntityOnboardingDialog.tsx` 524 lignes, `ClientDirectoryTable.tsx` 264 lignes, `AppLayout.tsx` 245 lignes, `router.ts` 201 lignes. |
| Supabase MCP tables | `list_tables(public)` | PASS: 20 tables publiques, RLS activee partout. |
| Supabase MCP Edge Functions | `list_edge_functions` | PASS: `api` active, version 37, `verify_jwt=false`, entrypoint `source/supabase/functions/api/index.ts`, import map `source/deno.json`. |
| Alignement QA/docs | relecture `docs/testing.md`, `docs/qa-runbook.md`, `package.json`, `scripts/qa-gate.ps1`, `scripts/qa-gate.sh`, `.github/workflows/qa.yml` | PASS: CI documentee, seuils clarifies, gate executable identifiee. |
| Frontiere API | `rg` sur `requireSupabaseClient`, `supabase.from`, `supabase.auth`, `channel`, `safeTrpc`, `invokeTrpc` dans `frontend/src` | PASS: usages directs classes; admin/audit est maintenant conforme backend/tRPC, les lectures restantes a migrer sont interactions, brouillons et preference agence active. |
| Alignement DB/types/schemas | MCP `list_tables`, `generate_typescript_types`, SQL `information_schema.columns`, `pg_policies`, `pg_indexes`, `pg_constraint`; relecture `backend/migrations`, `shared/supabase.types.ts`, `backend/drizzle/schema.ts`, `shared/schemas/*` | PASS documentaire: tables ciblees auditees; divergence `interactions.id` corrigee; vigilances `entities.department`, brouillons et validation row-level consignees. |
| Correction Drizzle `interactions.id` | `deno check --config backend/deno.json backend/functions/api/index.ts`, `pnpm run qa:fast`, `pnpm run qa` | PASS: schema Drizzle aligne sur `id text`, garde-fou `repo:check` actif, gate complete verte. |
| Migration backend admin/audit | MCP `list_tables(public, verbose=true)`, SQL MCP `pg_policies`/`pg_indexes`, Context7 tRPC v11, relecture `AdminPanel`, `useAuditLogsPanel`, services admin, router tRPC et schemas shared | PASS: droits live confirmes (`profiles`, `agency_members`, `audit_logs`, `agencies` avec RLS); `audit_logs` lisible par `super_admin` ou `agency_admin` membre; contrat implemente sans lecture Supabase front. |
| Tests cibles admin/audit | `pnpm --dir frontend run test:run -- src/services/admin/__tests__/getAdminUsers.test.ts src/services/admin/__tests__/getAuditLogs.test.ts src/services/admin/__tests__/admin.rpc-services.test.ts` | PASS: 3 fichiers, 18 tests. |
| Tests cibles backend/router | `deno test --env-file=backend/.env --allow-env --no-check --config backend/deno.json backend/functions/api/services/adminUsers_test.ts backend/functions/api/trpc/router_test.ts` | PASS: 23 tests. |
| Typecheck/lint cibles | `deno check --config backend/deno.json backend/functions/api/index.ts`, `deno lint backend/functions/api`, `pnpm --dir frontend run typecheck` | PASS. |
| Supabase MCP fin de tranche | `list_edge_functions`, `get_advisors(security)`, `get_advisors(performance)` | PASS qualif: `api` active version 37, `verify_jwt=false`; security WARN connu `auth_leaked_password_protection`; performance INFO `unused_index` a conserver en observation. |
| Gate intermediaire | `pnpm run qa:fast` | PASS: repo check, typecheck/lint/tests front, compliance erreurs, Deno lint/check/tests backend; `425` tests frontend, `140` tests backend, `8` ignores. |
| Gate finale | `pnpm run qa` | PASS: gate complete avec coverage, build frontend, backend tests et runner integration; `QA Gate PASS`. |
| Deploy prod Edge Function | `supabase functions deploy api --project-ref rbjtrcorlezvocayluok --use-api --import-map deno.json --no-verify-jwt` | PASS: `api` deployee sur le projet prod. |
| Supabase MCP apres deploy | `list_edge_functions` | PASS: `api` active version 38, `verify_jwt=false`, entrypoint `source/supabase/functions/api/index.ts`, import map `source/deno.json`, hash `04800a6bad825c417245e82f94331428589fae3964aac9cd51adf8efff2b06a0`. |
| Probe CORS prod | `OPTIONS https://rbjtrcorlezvocayluok.supabase.co/functions/v1/api/trpc/admin.audit-logs` avec `Origin: http://localhost:3000` | PASS: `200`, `Access-Control-Allow-Origin: http://localhost:3000`, methods `POST, OPTIONS`, headers attendus. |
| Probe CORS domaine non autorise | meme endpoint avec `Origin: https://cir-cockpit.com` | 403 attendu avec la configuration actuelle: cette origine n'est pas dans `CORS_ALLOWED_ORIGIN`. |
| Recherche mentions obsoletes | `rg` sur les anciennes formulations DB non auditee | PASS: aucune mention obsolete restante; seule la checklist cochee garde le libelle historique de l'action. |
| Hygiene repo apres edition docs | `pnpm run repo:check` | PASS: `Repo state check passed.` |
| Diff whitespace docs | `git diff --check -- docs/audit-base-projet-architecture-qa.md docs/plan.md docs/qa-runbook.md docs/testing.md` | PASS avec avertissements LF/CRLF uniquement. |

Validation non executee automatiquement:

- E2E Playwright: non lance automatiquement; parcours UI non demande explicitement et pas de modification de composant visuel.
- Probes tRPC POST authentifies: non executes faute de session utilisateur fournie dans ce contexte; le preflight CORS prod et le statut Edge Function ont ete verifies.

Validation a appliquer pour les phases de refactor ulterieures:

1. Lancer `pnpm run repo:check`, puis les checks cibles par zone.
2. Lancer `pnpm run qa:fast` en validation intermediaire quand des fichiers applicatifs changent.
3. Lancer `pnpm run qa` comme gate finale pour toute livraison applicative ou merge.
4. Si backend/Edge Function/DB est touche: verifier Supabase MCP, deploy `api`, CORS/preflight et probes live.

## Hypotheses

- Le livrable immediat inclut du code applicatif frontend/backend/shared et la mise a jour de ce fichier d'audit.
- Aucun changement DB live ni migration SQL n'est applique dans cette phase.
- Le niveau "parfait" vise une base claire et evolutive: structure par domaines, typage strict, responsabilites nettes, QA sans ambiguite, DB alignee, et aucun contrat implicite cache.
