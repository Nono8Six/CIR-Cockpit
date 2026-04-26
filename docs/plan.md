# Plan de travail

## 2026-04-17

### Programme de remise a niveau professionnelle

Objectif global:
- remettre le projet dans un etat reproductible et auditable sans drift repo/Supabase distant lie
- restaurer une source de verite unique pour le code Edge Function, les migrations, les types generes et la gate QA
- supprimer les fallbacks qui masquent les divergences backend/Supabase distant lie
- reintroduire une CI qui execute la meme verite que la gate locale

Contexte d'environnement: l'application CIR Cockpit reste executee localement. Le seul runtime distant lie est le projet Supabase `rbjtrcorlezvocayluok` utilise pour la base, Auth et l'Edge Function `api`; toute mention historique de deploy concerne ce runtime Supabase distant, pas une application web de production.

### Etat d'avancement

#### Phase 0 - Stop-the-line et baseline fiable

- [x] diagnostiquer la gate locale et confirmer le faux vert Windows
- [x] reinstaller le workspace frontend en mode `--frozen-lockfile` pour realigner manifest/lock/install
- [x] introduire `pnpm run repo:check` pour bloquer shadow repo, temp files suivis, references docs cassees et drift `deno.json`
- [x] corriger les scripts `qa-gate.ps1` et `qa-gate.sh` pour qu'un echec stoppe reellement la gate
- [x] realigner `deno.json` racine sur `backend/deno.json` pour Hono
- [x] retirer de l'index Git les artefacts `supabase/.temp/*`
- [x] supprimer le shadow repo `migration/`
- [x] mettre en place le workflow GitHub Actions `qa.yml`
- [x] terminer la mise a jour des documents de gouvernance (`CLAUDE.md`, `AGENTS.md`, `docs/qa-runbook.md`, `docs/stack.md`)

Critere de sortie:
- aucun faux PASS sur `pnpm run qa`
- aucun shadow repo ni fichier temporaire suivi
- aucune divergence connue entre import map de deploy et backend local

#### Phase 1 - Alignement Supabase, schema et runtime deploye

- [x] comparer schema distant et migrations locales sur `entities`, `interactions` et objets relies
- [x] appliquer cote remote les migrations manquantes deja presentes dans `backend/migrations/`
- [x] regenerer `shared/supabase.types.ts` depuis le schema reel cible
- [x] redeployer `api` depuis le repo avec le wrapper `supabase/functions/api/index.ts`
- [x] verifier que `directory.company-search`, `directory.company-details` et `directory.duplicates` ne retournent plus `404`
- [ ] ajouter un controle de drift explicite repo/runtime/schema/types

Critere de sortie:
- zero drift DB connu sur le domaine annuaire / entites
- zero `404` sur les procedures tRPC attendues
- types partages alignes avec la base effectivement deployee

#### Phase 2 - Consolidation des contrats et externalisation maximale

- [x] faire du backend la frontiere unique pour la recherche societe, les details entreprise et les doublons
- [x] supprimer les fallbacks frontend `NOT_FOUND -> API directe` et les caches `sessionStorage` de route indisponible
- [ ] introduire une couche de configuration explicite pour les variations produit, annuaire et agence
- [ ] exposer le parametrage metier administrable sans rehardcoder les comportements dans le front

Critere de sortie:
- plus aucun appel frontend direct aux APIs entreprise dans le runtime applicatif local
- plus aucun fallback silencieux qui masque une procedure absente
- chaque comportement variable passe par une couche de configuration explicite

#### Phase 3 - Hardening Supabase, securite et performance

- [x] deplacer les fonctions sensibles et helpers RLS du schema `public` vers le schema `private`
- [x] corriger `pg_trgm` dans `public` en le replaçant dans `extensions`
- [x] restaurer les indexes FK manquants identifies sur `audit_logs_archive`, `interaction_drafts`, `interactions` et `profiles`
- [x] forcer RLS sur `app_settings`, `agency_settings`, `directory_saved_views` et `reference_departments`
- [x] supprimer les appels backend `rpc()` vers `check_rate_limit` et `hard_delete_agency` au profit de SQL direct via le client DB de confiance
- [x] formaliser les controles de hardening dans `docs/qa-runbook.md` et dans `pnpm run repo:check`
- [ ] requalifier les indexes "unused" apres une vraie fenetre d'observation sur le Supabase distant lie
- [ ] garder `auth_leaked_password_protection` explicitement waivé tant que la politique projet reste `N/A`

Critere de sortie:
- advisors propres ou explicitement waives avec justification
- aucune fonction sensible exposee sans necessite
- grants et policies reaudites sur les objets modifies

#### Phase 4 - Refactor structurel par domaines

- [ ] decouper les hotspots majeurs d'onboarding entreprise et du domaine annuaire
- [ ] supprimer les patterns hybrides `Supabase direct + tRPC + fallback local`
- [ ] ramener une implementation canonique unique par regle metier/mapping externe
- [ ] rendre les conventions de structure verifiables mecaniquement

Critere de sortie:
- architecture lisible sur les domaines critiques
- baisse visible de la duplication front/back/shared
- disparition des fichiers monolithiques non justifies

#### Phase 5 - Mise a niveau UI, UX critique et accessibilite

- [ ] auditer et corriger auth, navigation, annuaire, detail, onboarding, admin, settings
- [ ] corriger focus, clavier, aria, responsive, loading/error/empty states
- [ ] standardiser les patterns UI autour de la pipeline d'erreur existante
- [ ] supprimer les comportements UI qui compensent un backend non aligne

Critere de sortie:
- parcours critiques coherents, accessibles et testables
- aucune UI ne masque un mode degrade backend

#### Phase 6 - CI, gouvernance et processus de livraison

- [ ] rendre `qa.yml` obligatoire sur PR
- [ ] ajouter les controles structurels de professionnalisation au pipeline
- [ ] documenter procedure de migration Supabase, checklist release et gestion d'incident
- [ ] durcir la gouvernance: required checks, politique de generation des types, politique de deploy Edge Function

Critere de sortie:
- la livraison n'est plus basee sur une confiance implicite
- local, doc et CI executent tous la meme verite

## 2026-04-19 - Solidification corrective verifiee

Cette section remplace le precedent recit "lots A a F" quand il etait surdeclaratif.
Elle ne conserve que l'etat reellement verifie par commandes et tests.

### Corrige et valide

- [x] restaurer les 3 migrations historiques supprimees (`202601221300_audit_actor_fix.sql`, `202601231200_rate_limits_privileges_fix.sql`, `202601231210_updated_at_clock_timestamp.sql`)
- [x] reetablir la semantique cible `clock_timestamp()` dans la chaine historique locale pour `set_updated_at()`
- [x] etendre `pnpm run repo:check` pour couvrir l'inventaire legacy restaure et la compatibilite remote/local des migrations modernes
- [x] remettre `avatar-initials.tsx` a `100/100/100/100` en supprimant le code defensif mort et en completant les tests
- [x] ajouter un vrai contrat d'integration backend: `backend/.env.test.example`, script `pnpm run backend:test:integration`, fallback explicite vers l'environnement shell si `backend/.env.test` est absent
- [x] sortir les lectures brutes d'environnement de `backend/functions/api/integration/helpers.ts` vers `backend/functions/api/integration/env.ts`
- [x] supprimer les castings fragiles cibles dans `backend/functions/api/middleware/errorHandler.ts` et `backend/functions/api/services/adminAgencies.ts`
- [x] ajouter des tests backend sur `configSnapshot.ts`, `directorySavedViews.ts` et `directory.ts`
- [x] conserver le double-cast `app.ts` comme exception technique documentee, sans l'etendre ailleurs

### Reste partiel ou non fait

- [ ] le refactor frontend structurel reste partiel: `EntityOnboardingDialog.tsx` est redescendu mais `useEntityOnboardingFlow.ts` reste un mega-hook
- [ ] `useSettingsState.ts`, `useInteractionDraft.ts` et `useDashboardState.tsx` restent trop gros pour considerer la phase 4 close
- [ ] la gouvernance GitHub (required checks obligatoires sur PR) reste a appliquer cote plateforme
- [ ] la requalification des indexes "unused" et le waiver `auth_leaked_password_protection` restent des sujets ouverts de Phase 3

### Validation reexecutee

- `pnpm run repo:check` -> PASS
- `pnpm --dir frontend run test:coverage` -> PASS (`110` fichiers, `405` tests)
- `pnpm run backend:test:integration` -> PASS avec `9` tests ignores hors environnement dedie
- `deno test --env-file=backend/.env --allow-env --no-check --config backend/deno.json backend/functions/api` -> PASS (`128` passed, `0` failed, `8` ignored)

### Decisions explicites

- Le renommage des anciennes migrations au format `YYYYMMDDHHMMSS_` reste **non execute**. La compatibilite remote/local est desormais verifiee par manifest/ordre, sans reecriture destructive de l'historique.
- L'erreur Postgres `invalid regular expression` reste **hors scope** tant qu'elle provient des requetes d'introspection Supabase Dashboard et non du code applicatif.

## 2026-04-24 - Socle audit phase 1

### Corrige

- [x] retirer la surface prototype `/ui-poc` du runtime applicatif et du router.
- [x] aligner la version pnpm CI/documentation sur le manifest racine.
- [x] ajouter `backend:test:integration` au gate final `pnpm run qa`.
- [x] migrer la lecture clients `getClients` vers la frontiere tRPC `data.entities` avec schema shared strict et filtres d'agence cote backend.

### Reste a traiter

- [ ] migrer les derniers services metier front qui lisent directement Supabase vers la frontiere tRPC (`getProspects`, `getEntitySearchIndex`, `getEntityContacts`).
- [ ] decouper les hotspots majeurs restants (`directory.ts`, onboarding entite, services data).
- [ ] requalifier les grants et indexes Supabase apres observation sur le Supabase distant lie.

## 2026-04-25 - Frontiere API entites

### Corrige

- [x] migrer `getProspects` vers la frontiere tRPC `data.entities` avec conservation des filtres `agencyId`, `includeArchived`, `orphansOnly`.
- [x] exposer l'action backend `data.entities/list` pour les prospects avec filtre compatible `prospect` ou `particulier`.
- [x] migrer `getEntityContacts` vers `data.entity-contacts` via l'action `list_by_entity`.
- [x] migrer `getEntitySearchIndex` vers `data.entities/search_index`.
- [x] filtrer les contacts de l'index de recherche par les entites accessibles de l'agence au lieu d'une lecture globale.
- [x] remplacer les tests Supabase directs obsoletes des services entites par des tests RPC et backend cibles.

### Reste a traiter

- [ ] poursuivre le decoupage des hotspots majeurs restants (onboarding entite).
- [ ] requalifier Supabase securite/performance via MCP avant toute phase DB.
- [ ] renforcer les controles mecaniques de gouvernance non encore couverts par `repo:check`.

## 2026-04-26 - Phase 4 annuaire entreprise

### Corrige

- [x] constater que `directory.ts` est deja une facade courte, puis traiter le vrai hotspot interne `directoryCompany.ts`.
- [x] extraire les schemas Zod de l'API Entreprises dans `directoryCompanySchemas.ts` avec `z.looseObject` conforme Zod v4.
- [x] extraire le client HTTP / parsing API Entreprises dans `directoryCompanyApi.ts`.
- [x] extraire les mappers recherche et detail entreprise dans `directoryCompanySearchMapper.ts` et `directoryCompanyDetailsMapper.ts`.
- [x] conserver les exports publics existants (`buildCompanySearchUrl`, `getDirectoryCompanySearch`, `getDirectoryCompanyDetails`).
- [x] transformer `directoryListing.ts` en facade et extraire liste, options, suggestions ville et fiche annuaire dans des modules dedies.
- [x] transformer `directoryDuplicates.ts` en facade et extraire doublons societe, doublons particulier et mapping de ligne commun.
- [x] decouper `dataEntitiesSave.ts` en orchestration, construction des lignes a persister et persistance DB/contact principal.

### Validation reexecutee

- `deno lint backend/functions/api/services/directoryCompany*.ts backend/functions/api/services/directory_test.ts` -> PASS.
- `deno check --config backend/deno.json backend/functions/api/index.ts` -> PASS.
- `deno test --env-file=backend/.env --allow-env --no-check --config backend/deno.json backend/functions/api/services/directory_test.ts` -> PASS (`8` tests).
- `deno lint backend/functions/api/services/directoryListing*.ts backend/functions/api/services/directory_test.ts` -> PASS.
- `deno test --env-file=backend/.env --allow-env --no-check --config backend/deno.json backend/functions/api/services/directory_test.ts backend/functions/api/trpc/router_test.ts` -> PASS (`13` tests).
- `deno lint backend/functions/api/services/directoryDuplicates*.ts backend/functions/api/services/directoryDuplicateRows.ts backend/functions/api/services/directory_test.ts` -> PASS.
- `deno check --config backend/deno.json backend/functions/api/index.ts` -> PASS apres correction du typage des conditions Drizzle dynamiques.
- `deno lint backend/functions/api/services/dataEntitiesSave*.ts backend/functions/api/services/dataEntities_test.ts` -> PASS.
- `deno test --env-file=backend/.env --allow-env --no-check --config backend/deno.json backend/functions/api/services/dataEntities_test.ts backend/functions/api/trpc/payloadContracts_test.ts` -> PASS (`16` tests).

## 2026-04-26 - Phase 4 onboarding entite

### Corrige

- [x] transformer `useEntityOnboardingFlow.ts` en orchestrateur de flux au lieu d'un mega-hook monolithique.
- [x] extraire les types publics du flux dans `useEntityOnboardingFlow.types.ts`.
- [x] extraire les etapes stepper dans `entityOnboardingSteps.ts`.
- [x] extraire la checklist manquante dans `entityOnboardingChecklist.ts`.
- [x] extraire les valeurs derivees du formulaire dans `useOnboardingValues.ts`.
- [x] extraire l'etat local du flux dans `useOnboardingLocalState.ts`.
- [x] extraire les donnees entreprise, doublons et details officiels dans `useOnboardingCompanyData.ts`.
- [x] extraire les effets de reset/synchronisation dans `useOnboardingFlowEffects.ts`.
- [x] extraire les actions de navigation/fermeture/soumission dans `useOnboardingFlowActions.ts`, `useOnboardingNavigation.ts` et `useOnboardingSubmit.ts`.

### Validation reexecutee

- `pnpm --dir frontend run typecheck` -> PASS.
- `pnpm --dir frontend run lint` -> PASS.
- `pnpm --dir frontend exec vitest run src/components/__tests__/EntityOnboardingDialog.test.tsx src/components/cockpit/__tests__/CockpitFormDialogs.test.tsx` -> PASS (`10` tests).
- `pnpm run qa:fast` -> PASS (`425` tests frontend, `138` tests backend).

## 2026-04-26 - Frontiere API admin/audit

### Corrige

- [x] migrer `getAdminUsers` hors lecture Supabase directe vers la procedure tRPC `admin.users-list`.
- [x] migrer `getAuditLogs` hors lecture Supabase directe vers la procedure tRPC `admin.audit-logs`.
- [x] ajouter les schemas partages d'entree/sortie admin/audit dans `shared/schemas`.
- [x] ajouter `audit_logs` au schema Drizzle parce que la procedure backend lit cette table.
- [x] conserver les droits live: liste utilisateurs reservee `super_admin`; audit logs accessibles aux `super_admin` et aux `agency_admin` uniquement sur leurs agences.
- [x] remplacer les tests frontend PostgREST/Supabase directs par des tests de contrat tRPC.

### Validation reexecutee

- MCP Supabase `list_tables(public, verbose=true)` + SQL `pg_policies`/`pg_indexes` sur `profiles`, `agency_members`, `audit_logs`, `agencies` -> droits et indexes requalifies.
- Context7 tRPC v11 -> contrat `input`/`output` Zod et route type-only miroir confirmes.
- `pnpm --dir frontend run test:run -- src/services/admin/__tests__/getAdminUsers.test.ts src/services/admin/__tests__/getAuditLogs.test.ts src/services/admin/__tests__/admin.rpc-services.test.ts` -> PASS (`18` tests).
- `deno check --config backend/deno.json backend/functions/api/index.ts` -> PASS.
- `deno test --env-file=backend/.env --allow-env --no-check --config backend/deno.json backend/functions/api/services/adminUsers_test.ts backend/functions/api/trpc/router_test.ts` -> PASS (`23` tests).
- `pnpm --dir frontend run typecheck` -> PASS.
- `deno lint backend/functions/api` -> PASS.
- MCP Supabase `list_edge_functions` -> `api` ACTIVE version 37 avant deploy distant admin/audit, `verify_jwt=false`, entrypoint/import map attendus.
- MCP Supabase advisors -> securite: `auth_leaked_password_protection` WARN connu; performance: `unused_index` INFO observation-only, aucune action de suppression.
- `pnpm run qa:fast` -> PASS (`425` tests frontend, `140` tests backend, `8` ignores).
- `pnpm run qa` -> PASS avec coverage, build frontend, lint/typecheck/tests backend et runner integration (`9` ignores hors environnement dedie).
- Deploy Edge Function Supabase distant `supabase functions deploy api --project-ref rbjtrcorlezvocayluok --use-api --import-map deno.json --no-verify-jwt` -> PASS.
- MCP Supabase `list_edge_functions` apres deploy -> `api` ACTIVE version 38, `verify_jwt=false`, hash `04800a6bad825c417245e82f94331428589fae3964aac9cd51adf8efff2b06a0`.
- Probe CORS Supabase distant `OPTIONS /functions/v1/api/trpc/admin.audit-logs` avec `Origin: http://localhost:3000` -> PASS `200`. Avec `Origin: https://cir-cockpit.com` -> `403`, origine non autorisee par la configuration actuelle.
- `pnpm run qa` -> PASS (`117` fichiers de tests frontend, `425` tests frontend, `138` tests backend, `9` integrations backend ignorees hors environnement dedie).

## 2026-04-26 - Audit architecture et QA docs

### Corrige

- [x] restaurer `docs/plan.md` comme roadmap globale vivante apres suppression locale non desiree.
- [x] mettre a jour `docs/audit-base-projet-architecture-qa.md` pour refleter l'etat reel: P0 tRPC clos, P0 QA/docs clos, avancements Phase 4 annuaire/onboarding integres, dettes restantes qualifiees.
- [x] corriger `docs/testing.md` pour documenter le workflow GitHub Actions actif (`.github/workflows/qa.yml`) et l'execution de `pnpm run qa`.
- [x] clarifier les seuils Vitest dans `docs/testing.md` et `docs/qa-runbook.md`: global `55/50/50/58`, domaines critiques `80/70/80/80`, seuils cibles explicites dans `frontend/vitest.config.ts`.
- [x] verifier que `package.json` garde `scripts/qa-gate.ps1` comme gate executable de `pnpm run qa`, avec `scripts/qa-gate.sh` comme miroir synchronise.

### Validation reexecutee

- `pnpm run repo:check` -> PASS.
- `git diff --check -- docs/testing.md docs/qa-runbook.md docs/audit-base-projet-architecture-qa.md` -> PASS avec avertissements LF/CRLF uniquement.
- Relecture croisee de `docs/testing.md`, `docs/qa-runbook.md`, `package.json`, `scripts/qa-gate.ps1`, `scripts/qa-gate.sh`, `.github/workflows/qa.yml` et `frontend/vitest.config.ts` -> PASS.

### Reste a traiter

- [x] formaliser la frontiere API Supabase direct vs backend/tRPC dans `docs/audit-base-projet-architecture-qa.md` (traite dans la section suivante).
- [ ] garder la gouvernance GitHub required checks comme sujet plateforme Phase 6, distinct de la correction documentaire QA/docs.

## 2026-04-26 - Frontiere API Supabase direct vs backend

### Corrige

- [x] inventorier les usages Supabase directs frontend avec `rg` sur `requireSupabaseClient`, `supabase.from(...)`, `supabase.auth`, `channel(...)`, `safeTrpc` et `invokeTrpc`.
- [x] formaliser dans `docs/audit-base-projet-architecture-qa.md` la regle canonique:
  - Supabase direct autorise pour auth/session/realtime et bootstrap minimal borne par RLS;
  - backend/tRPC obligatoire pour mutations metier, admin, audit, workflows multi-table, validation serveur, service role, rate limiting et logique cross-agency.
- [x] classer les usages existants en `autorise`, `tolere temporairement` et `a migrer`.

### Reste a traiter

- [x] migrer `frontend/src/services/admin/getAdminUsers.ts` et `frontend/src/services/admin/getAuditLogs.ts` vers des procedures backend/tRPC.
- [x] migrer `frontend/src/services/interactions/getInteractions.ts` et `frontend/src/services/interactions/getKnownCompanies.ts` vers `data.interactions`.
- [x] migrer `frontend/src/services/interactions/getInteractionDraft.ts`, `saveInteractionDraft.ts` et `deleteInteractionDraft.ts` vers `data.interactions`.
- [x] migrer `frontend/src/services/agency/setProfileActiveAgencyId.ts` vers `data.profile`.

## 2026-04-26 - Audit alignement DB/types/schemas

### Corrige

- [x] requalifier via MCP Supabase les tables ciblees `profiles`, `agency_members`, `agencies`, `audit_logs`, `interactions`, `interaction_drafts`, `entities` et `entity_contacts`.
- [x] verifier les colonnes, nullabilites, contraintes, policies RLS, indexes et volumes live des tables ciblees.
- [x] verifier que `shared/supabase.types.ts` reflete les tables auditees du schema live genere par MCP (`PostgrestVersion: "14.1"`).
- [x] clarifier que `backend/drizzle/schema.ts` est une couche partielle de requetes, pas la source exhaustive du schema Supabase.
- [x] clarifier que les schemas Zod partages sont des contrats API/formulaires, pas un miroir DB colonne par colonne.
- [x] documenter les divergences a traiter avant refactor lourd: `interactions.id` live `text` vs Drizzle `uuid`, `entities.department` live strictement 2 chiffres vs schema client historique 2-3 chiffres, validation transitoire des brouillons vs `interaction_drafts.agency_id` non nullable.
- [x] aligner `backend/drizzle/schema.ts` sur le schema live pour `interactions.id`: colonne Drizzle passee de `uuid('id')` a `text('id').$type<string>().primaryKey()`, sans migration DB.
- [x] ajouter un garde-fou `pnpm run repo:check` qui bloque le retour de `interactions.id` en `uuid` dans Drizzle.

### Reste a traiter

- [x] trancher la strategie departements pour `entities.department`: rester aligne avec la contrainte live `NULL` ou deux chiffres, sans accepter `2A/2B` dans les fiches entites tant qu'aucune migration DB explicite n'est appliquee.
- [x] migrer les lectures/ecritures directes restantes des brouillons en s'appuyant sur les contraintes live et schemas partages verifies.
- [ ] ajouter un controle de drift explicite repo/runtime/schema/types si la phase DB reprend.

### Validation reexecutee

- MCP Supabase `list_tables(public)` -> PASS: 20 tables publiques, RLS activee partout.
- MCP Supabase `generate_typescript_types` -> PASS: types generes disponibles, `PostgrestVersion: "14.1"`.
- MCP SQL `information_schema.columns`, `pg_policies`, `pg_indexes`, `pg_constraint` sur tables ciblees -> PASS: constats integres dans `docs/audit-base-projet-architecture-qa.md`.
- Relecture locale ciblee `backend/migrations`, `shared/supabase.types.ts`, `backend/drizzle/schema.ts`, `shared/schemas/*`, services frontend/backend touches par les tables ciblees -> PASS documentaire.
- `deno check --config backend/deno.json backend/functions/api/index.ts` -> PASS apres correction Drizzle.
- `pnpm run repo:check` -> PASS avec garde-fou `interactions.id` actif.
- `pnpm run qa:fast` -> PASS (`425` tests frontend, `138` tests backend).
- `pnpm run qa` -> PASS (`425` tests frontend avec coverage/build, `138` tests backend, `9` integrations backend ignorees hors environnement dedie).

## 2026-04-26 - Suite frontiere API interactions

### Corrige

- [x] clarifier dans les docs que l'application reste locale et que le projet Supabase `rbjtrcorlezvocayluok` est le seul runtime distant lie.
- [x] ajouter les actions `data.interactions/list_by_agency` et `data.interactions/known_companies` dans le contrat Zod partage.
- [x] migrer `getInteractions` hors lecture Supabase directe vers `data.interactions/list_by_agency`, avec hydratation locale de la timeline conservee.
- [x] migrer `getKnownCompanies` hors lecture Supabase directe vers `data.interactions/known_companies`, avec normalisation trim/dedup/tri cote backend.
- [x] supprimer le fallback global de `getInteractionsByEntity` vers `getInteractions`.

### Validation reexecutee

- MCP Supabase `list_edge_functions` -> `api` ACTIVE version 38, `verify_jwt=false`, entrypoint/import map attendus.
- MCP Supabase `list_tables(public)` -> PASS: 20 tables publiques, RLS activee partout.
- Context7 tRPC -> KO technique: 3 tentatives `resolve-library-id` ont expire. Decision appliquee depuis le contrat local deja type (`shared/api/trpc.ts`) et les patterns tRPC v11 existants du repo.
- `deno test --env-file=backend/.env --allow-env --no-check --config backend/deno.json backend/functions/api/services/dataInteractions_test.ts backend/functions/api/trpc/payloadContracts_test.ts` -> PASS (`11` tests).
- `pnpm --dir frontend run test:run -- src/services/interactions/__tests__/interactions.rpc-services.test.ts src/services/interactions/__tests__/getInteractionsByEntity.test.ts` -> PASS (`6` tests).
- `deno lint backend/functions/api/services/dataInteractions.ts backend/functions/api/services/dataInteractions_test.ts backend/functions/api/trpc/payloadContracts_test.ts` -> PASS.
- `deno check --config backend/deno.json backend/functions/api/index.ts` -> PASS.
- `pnpm --dir frontend run typecheck` -> PASS.
- `pnpm run qa:fast` -> PASS (`118` fichiers de tests frontend, `428` tests frontend, `141` tests backend, `8` ignores).
- `pnpm run qa` -> PASS avec coverage, build frontend, lint/typecheck/tests backend et runner integration (`9` integrations backend ignorees hors environnement dedie).
- Deploy Edge Function Supabase distant `supabase functions deploy api --project-ref rbjtrcorlezvocayluok --use-api --import-map deno.json --no-verify-jwt` -> PASS.
- MCP Supabase `list_edge_functions` apres deploy -> `api` ACTIVE version 39, `verify_jwt=false`, entrypoint `source/supabase/functions/api/index.ts`, import map `source/deno.json`, hash `a264e0dc7109d76c3f1068a6ede3c027269f5d8cde099832e1884a0ce16c4373`.
- Probe CORS Supabase distant `OPTIONS /functions/v1/api/trpc/data.interactions` avec `Origin: http://localhost:3000` -> PASS `200`.
- Probe anonyme Supabase distant `POST /functions/v1/api/trpc/data.interactions` -> PASS attendu `401 AUTH_REQUIRED`, sans `404`.
- Probe header legacy Supabase distant `POST /functions/v1/api/trpc/data.interactions` avec seul `x-client-authorization` -> PASS attendu `401 AUTH_REQUIRED`, contrat `Authorization` uniquement respecte.

## 2026-04-26 - Suite frontiere API brouillons interactions

### Corrige

- [x] ajouter les actions `data.interactions/draft_get`, `draft_save` et `draft_delete` dans le contrat Zod partage, avec payloads `.strict()`.
- [x] ajouter `interaction_drafts` au schema Drizzle local utilise par l'Edge Function, sans migration DB.
- [x] migrer `getInteractionDraft`, `saveInteractionDraft` et `deleteInteractionDraft` hors lecture/ecriture Supabase directe vers `data.interactions`.
- [x] conserver la validation frontend du payload UI brouillon via `parseInteractionDraftPayload`, separee du transport JSON backend.
- [x] ajouter le controle serveur `user_id === authContext.userId` en plus de `ensureAgencyAccess`.

### Reste a traiter

- [x] trancher la strategie departements pour `entities.department`: contrat applicatif limite a deux chiffres et absence persistee en `NULL`.

### Validation reexecutee

- MCP Supabase `list_tables(public, verbose=true)` -> PASS: `interaction_drafts` RLS active, `agency_id` non nullable, unique key `(user_id, agency_id, form_type)` presente.
- Supabase docs MCP deploy Edge Functions -> PASS: commande `supabase functions deploy` et option `--no-verify-jwt` confirmees dans la documentation officielle.
- Context7 tRPC -> KO technique: `resolve-library-id` a expire. Decision appliquee depuis le contrat local deja type (`shared/api/trpc.ts`) et les patterns tRPC v11 existants du repo.
- `deno test --env-file=backend/.env --allow-env --no-check --config backend/deno.json backend/functions/api/services/dataInteractions_test.ts backend/functions/api/trpc/payloadContracts_test.ts` -> PASS (`12` tests).
- `pnpm --dir frontend run test:run -- src/services/interactions/__tests__/interactions.rpc-services.test.ts src/hooks/__tests__/useInteractionDraft.test.tsx` -> PASS (`13` tests).
- `deno check --config backend/deno.json backend/functions/api/index.ts` -> PASS.
- `pnpm --dir frontend run typecheck` -> PASS.
- `pnpm run qa:fast` -> PASS (`118` fichiers de tests frontend, `432` tests frontend, `142` tests backend, `8` ignores).
- `pnpm run qa` -> PASS avec coverage, build frontend, lint/typecheck/tests backend et runner integration (`9` integrations backend ignorees hors environnement dedie).
- Deploy Edge Function Supabase distant `supabase functions deploy api --project-ref rbjtrcorlezvocayluok --use-api --import-map deno.json --no-verify-jwt` -> PASS.
- MCP Supabase `list_edge_functions` apres deploy -> `api` ACTIVE version 40, `verify_jwt=false`, entrypoint `source/supabase/functions/api/index.ts`, import map `source/deno.json`, hash `41bfc3eed7eb8fded1841f7abb74ddb304af63dee09494118a67ff8a45d17331`.
- Probe CORS Supabase distant `OPTIONS /functions/v1/api/trpc/data.interactions` avec `Origin: http://localhost:3000` -> PASS `200`.
- Probe anonyme Supabase distant `POST /functions/v1/api/trpc/data.interactions` action `draft_get` -> PASS attendu `401 AUTH_REQUIRED`, sans `404`.
- Probe header legacy Supabase distant `POST /functions/v1/api/trpc/data.interactions` action `draft_get` avec seul `x-client-authorization` -> PASS attendu `401 AUTH_REQUIRED`, contrat `Authorization` uniquement respecte.

## 2026-04-26 - Suite frontiere API preference agence active

### Corrige

- [x] ajouter l'action `data.profile/set_active_agency` dans le contrat Zod partage, avec `agency_id` `uuid | null`.
- [x] migrer `setProfileActiveAgencyId` hors ecriture Supabase directe vers `data.profile`.
- [x] controler cote backend que l'agence demandee est accessible via `ensureAgencyAccess`; `null` reste autorise pour vider la preference.
- [x] conserver le contrat frontend `ResultAsync<void, AppError>` consomme par `useAppSessionState`.

### Reste a traiter

- [x] trancher la strategie departements pour `entities.department`: contrat applicatif limite a deux chiffres et absence persistee en `NULL`.

## 2026-04-26 - Suite alignement `entities.department`

### Corrige

- [x] ajouter un schema partage `entityDepartmentCodeSchema` aligne sur la contrainte live `department IS NULL OR department ~ '^[0-9]{2}$'`.
- [x] brancher les schemas client, prospect, fournisseur et onboarding sur ce contrat deux chiffres.
- [x] normaliser la deduction onboarding depuis le code postal sur deux chiffres pour eviter les valeurs `971/972/...` refusees par `entities.department`.
- [x] persister les departements absents en `NULL` cote backend au lieu de `''`, qui viole aussi la contrainte live.
- [x] documenter l'ecart assume: `2A/2B` restent autorises dans `reference_departments`, mais pas dans les fiches entites sans migration DB.

### Validation reexecutee

- Context7 Zod v4 -> PASS: `z.strictObject`/schemas stricts et validation regex/safeParse confirmes; implementation conserve les patterns `.strict()` existants du repo.
- `pnpm --dir frontend run test:run -- src/components/entity-onboarding/__tests__/entityOnboarding.utils.test.ts src/components/__tests__/EntityOnboardingDialog.test.tsx src/services/entities/__tests__/entities.rpc-services.test.ts` -> PASS (`21` tests).
- `deno test --allow-env --no-check --config backend/deno.json backend/functions/api/trpc/payloadContracts_test.ts backend/functions/api/services/dataEntities_test.ts` -> PASS (`18` tests).
- `pnpm --dir frontend run typecheck` -> PASS.
- `deno check --config backend/deno.json backend/functions/api/index.ts` -> PASS.
- `deno lint backend/functions/api` -> PASS.
- `git diff --check` -> PASS avec avertissements CRLF historiques uniquement.
- `pnpm run qa:fast` -> PASS (`119` fichiers de tests frontend, `433` tests frontend, `147` tests backend, `8` ignores).
- `pnpm run qa` -> PASS avec coverage, build frontend, lint/typecheck/tests backend et runner integration (`9` integrations backend ignorees hors environnement dedie).
- MCP Supabase avant deploy -> `api` ACTIVE version 41, `verify_jwt=false`; security advisor: WARN connu `auth_leaked_password_protection`; performance advisor: INFO `unused_index` observation-only.
- Deploy Edge Function Supabase distant `supabase functions deploy api --project-ref rbjtrcorlezvocayluok --use-api --import-map deno.json --no-verify-jwt` -> PASS.
- MCP Supabase `list_edge_functions` apres deploy -> `api` ACTIVE version 42, `verify_jwt=false`, entrypoint `source/supabase/functions/api/index.ts`, import map `source/deno.json`, hash `07b24ed5d2c389812a3075fd46f39811b4d535383df7ad8927a89a06d3afad91`.
- Probe CORS Supabase distant `OPTIONS /functions/v1/api/trpc/data.entities` avec `Origin: http://localhost:3000` -> PASS `200`.
- Probe anonyme Supabase distant `POST /functions/v1/api/trpc/data.entities` action `list` -> PASS attendu `401 AUTH_REQUIRED`, sans `404`.
- Probe header legacy Supabase distant `POST /functions/v1/api/trpc/data.entities` action `list` avec seul `x-client-authorization` -> PASS attendu `401 AUTH_REQUIRED`, contrat `Authorization` uniquement respecte.

### Validation reexecutee

- MCP Supabase `list_tables(public, verbose=true)` -> PASS: `profiles.active_agency_id` nullable, FK vers `agencies`, RLS active.
- Context7 tRPC -> KO technique: `resolve-library-id` a expire. Decision appliquee depuis le contrat local deja type (`shared/api/trpc.ts`) et les patterns tRPC v11 existants du repo.
- `deno test --env-file=backend/.env --allow-env --no-check --config backend/deno.json backend/functions/api/services/dataProfile_test.ts backend/functions/api/trpc/payloadContracts_test.ts` -> PASS (`12` tests).
- `pnpm --dir frontend run test:run -- src/services/agency/__tests__/agency.supabase-services.test.ts src/hooks/__tests__/useAppSessionState.test.tsx` -> PASS (`6` tests).
- `deno lint backend/functions/api/services/dataProfile.ts backend/functions/api/services/dataProfile_test.ts backend/functions/api/trpc/payloadContracts_test.ts` -> PASS.
- `deno check --config backend/deno.json backend/functions/api/index.ts` -> PASS.
- `pnpm --dir frontend run typecheck` -> PASS.
- `pnpm run qa:fast` -> PASS (`118` fichiers de tests frontend, `432` tests frontend, `145` tests backend, `8` ignores).
- `pnpm run qa` -> PASS avec coverage, build frontend, lint/typecheck/tests backend et runner integration (`9` integrations backend ignorees hors environnement dedie).
- Deploy Edge Function Supabase distant `supabase functions deploy api --project-ref rbjtrcorlezvocayluok --use-api --import-map deno.json --no-verify-jwt` -> PASS.
- MCP Supabase `list_edge_functions` apres deploy -> `api` ACTIVE version 41, `verify_jwt=false`, entrypoint `source/supabase/functions/api/index.ts`, import map `source/deno.json`, hash `e65d0339e479e324481fca8e99066168dc0e167493937adce4fcb5d706a7f1b4`.
- Probe CORS Supabase distant `OPTIONS /functions/v1/api/trpc/data.profile` avec `Origin: http://localhost:3000` -> PASS `200`.
- Probe anonyme Supabase distant `POST /functions/v1/api/trpc/data.profile` action `set_active_agency` -> PASS attendu `401 AUTH_REQUIRED`, sans `404`.
- Probe header legacy Supabase distant `POST /functions/v1/api/trpc/data.profile` action `set_active_agency` avec seul `x-client-authorization` -> PASS attendu `401 AUTH_REQUIRED`, contrat `Authorization` uniquement respecte.
