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

### Reste a traiter

- [ ] traiter le mega-hook frontend `useEntityOnboardingFlow.ts`.
