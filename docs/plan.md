# Plan de travail

## 2026-04-17

### Programme de remise a niveau professionnelle

Objectif global:
- remettre le projet dans un etat reproductible, auditable et deployable sans drift repo/prod
- restaurer une source de verite unique pour le code Edge Function, les migrations, les types generes et la gate QA
- supprimer les fallbacks qui masquent les divergences backend/prod
- reintroduire une CI qui execute la meme verite que la gate locale

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
- plus aucun appel frontend direct aux APIs entreprise en production
- plus aucun fallback silencieux qui masque une procedure absente
- chaque comportement variable passe par une couche de configuration explicite

#### Phase 3 - Hardening Supabase, securite et performance

- [x] deplacer les fonctions sensibles et helpers RLS du schema `public` vers le schema `private`
- [x] corriger `pg_trgm` dans `public` en le replaçant dans `extensions`
- [x] restaurer les indexes FK manquants identifies sur `audit_logs_archive`, `interaction_drafts`, `interactions` et `profiles`
- [x] forcer RLS sur `app_settings`, `agency_settings`, `directory_saved_views` et `reference_departments`
- [x] supprimer les appels backend `rpc()` vers `check_rate_limit` et `hard_delete_agency` au profit de SQL direct via le client DB de confiance
- [x] formaliser les controles de hardening dans `docs/qa-runbook.md` et dans `pnpm run repo:check`
- [ ] requalifier les indexes "unused" apres une vraie fenetre d'observation prod
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
- [ ] requalifier les grants et indexes Supabase apres observation prod.

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
- MCP Supabase `list_edge_functions` -> `api` ACTIVE version 37, `verify_jwt=false`, entrypoint/import map attendus.
- MCP Supabase advisors -> securite: `auth_leaked_password_protection` WARN connu; performance: `unused_index` INFO observation-only, aucune action de suppression.
- `pnpm run qa:fast` -> PASS (`425` tests frontend, `140` tests backend, `8` ignores).
- `pnpm run qa` -> PASS avec coverage, build frontend, lint/typecheck/tests backend et runner integration (`9` ignores hors environnement dedie).
- Deploy prod `supabase functions deploy api --project-ref rbjtrcorlezvocayluok --use-api --import-map deno.json --no-verify-jwt` -> PASS.
- MCP Supabase `list_edge_functions` apres deploy -> `api` ACTIVE version 38, `verify_jwt=false`, hash `04800a6bad825c417245e82f94331428589fae3964aac9cd51adf8efff2b06a0`.
- Probe CORS prod `OPTIONS /functions/v1/api/trpc/admin.audit-logs` avec `Origin: http://localhost:3000` -> PASS `200`. Avec `Origin: https://cir-cockpit.com` -> `403`, origine non autorisee par la configuration actuelle.
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
- [ ] migrer `frontend/src/services/interactions/getInteractions.ts` et `frontend/src/services/interactions/getKnownCompanies.ts` vers `data.interactions` ou une procedure dediee.
- [ ] migrer `frontend/src/services/interactions/getInteractionDraft.ts`, `saveInteractionDraft.ts` et `deleteInteractionDraft.ts` si le workflow brouillon continue d'evoluer.
- [ ] migrer `frontend/src/services/agency/setProfileActiveAgencyId.ts` si la preference agence doit etre auditee ou valider une logique multi-agence stricte.

## 2026-04-26 - Audit alignement DB/types/schemas

### Corrige

- [x] requalifier via MCP Supabase les tables ciblees `profiles`, `agency_members`, `agencies`, `audit_logs`, `interactions`, `interaction_drafts`, `entities` et `entity_contacts`.
- [x] verifier les colonnes, nullabilites, contraintes, policies RLS, indexes et volumes live des tables ciblees.
- [x] verifier que `shared/supabase.types.ts` reflete les tables auditees du schema live genere par MCP (`PostgrestVersion: "14.1"`).
- [x] clarifier que `backend/drizzle/schema.ts` est une couche partielle de requetes, pas la source exhaustive du schema Supabase.
- [x] clarifier que les schemas Zod partages sont des contrats API/formulaires, pas un miroir DB colonne par colonne.
- [x] documenter les divergences a traiter avant refactor lourd: `interactions.id` live `text` vs Drizzle `uuid`, `entities.department` live strictement 2 chiffres vs schema client 2-3 chiffres, validation transitoire des brouillons vs `interaction_drafts.agency_id` non nullable.
- [x] aligner `backend/drizzle/schema.ts` sur le schema live pour `interactions.id`: colonne Drizzle passee de `uuid('id')` a `text('id').$type<string>().primaryKey()`, sans migration DB.
- [x] ajouter un garde-fou `pnpm run repo:check` qui bloque le retour de `interactions.id` en `uuid` dans Drizzle.

### Reste a traiter

- [ ] trancher la strategie departements pour `entities.department` avant d'accepter des codes hors `^[0-9]{2}$` dans les fiches clients.
- [ ] migrer les lectures directes restantes interactions/brouillons en s'appuyant sur les contraintes live et schemas partages verifies.
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
