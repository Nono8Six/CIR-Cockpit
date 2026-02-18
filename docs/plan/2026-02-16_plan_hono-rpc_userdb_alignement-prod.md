# Plan d'implementation ultra detaille - Hono RPC + User-Scoped DB + Alignement Prod

Date de reference: 2026-02-16
Perimetre: backend + frontend + shared + supabase runtime
Etat: plan executable avec checklist a cocher

---

## 1) Objectif

Ce plan transforme le contre-plan en sequence executable, avec dependances explicites, criteres Go/No-Go, et controles MCP.

Objectifs de livraison:
- Aligner le projet Supabase prod avec le repo (migrations + runtime).
- Verrouiller le contrat CORS prod en whitelist stricte.
- Migrer l'API frontend vers un contrat type-safe Hono RPC sans big-bang.
- Introduire un client DB user-scoped sur les routes data (defense en profondeur avec RLS).
- Garder la compatibilite fonctionnelle et respecter le gate qualite `docs/qa-runbook.md`.

---

## 2) Snapshot verifie (repo + MCP Supabase)

### 2.1 Verifications MCP effectuees

- [x] `list_edge_functions` sur `rbjtrcorlezvocayluok`
  - slug: `api`
  - version: `21`
  - status: `ACTIVE`
  - `verify_jwt=false`
  - entrypoint: `source/supabase/functions/api/index.ts`
  - import map actif: `source/deno.json`

- [x] `list_migrations` + `supabase_migrations.schema_migrations`
  - derniere migration appliquee cote prod: `20260215190920`

- [x] Probes runtime HTTP
  - `POST /functions/v1/api/data/entities` -> `401 AUTH_REQUIRED` (pas de `404`)
  - `OPTIONS /functions/v1/api/data/entities` -> `200`
  - CORS observe: `Access-Control-Allow-Origin: *`

- [x] `execute_sql` (privileges RPC)
  - `hard_delete_agency` est encore executable par `PUBLIC`, `anon`, `authenticated`, `service_role`
  - incoherent avec la migration locale de durcissement

- [x] `execute_sql` (policies config)
  - policies SELECT autorisent les membres d'agence.
  - policies INSERT/UPDATE/DELETE imposent `is_super_admin()` sur les tables config.
  - `agency_interaction_types` est en role policy `public`, mais la contrainte `is_super_admin()` bloque les ecritures hors super_admin.

### 2.2 Verifications repo effectuees

- [x] Migration locale presente mais non appliquee prod:
  - `backend/migrations/20260216101000_harden_hard_delete_agency_rpc_privileges.sql`
  - `backend/migrations/20260216102000_strict_multi_tenant_rls.sql`
  - `backend/migrations/20260216103000_backfill_interaction_agency_id.sql`

- [x] App Hono actuelle en mode `registerXxxRoutes(app)`
  - `backend/functions/api/app.ts` exporte `AppType = typeof app` (type peu exploitable cote frontend)

- [x] Frontend actuel utilise encore `safeInvoke`
  - 11 services data appellent `safeInvoke` directement.
  - 13 services admin appellent `invokeAdminFunction` (qui appelle `safeInvoke`).
  - Total cible de migration metier: 24 services + 2 helpers (`client.ts`, `invokeAdminFunction.ts`).

- [x] Settings UI en edition super_admin only
  - `frontend/src/App.tsx`: `canEditSettings = userRole === 'super_admin'`

---

## 3) Decisions de cadrage (a ne pas changer en cours de route)

- [ ] D1 - Politique CORS prod: whitelist stricte, jamais `*` en production.
- [x] D2 - Migration API: progressive vers contrat RPC type-safe derive des routes backend, avec periode de coexistence.
- [ ] D3 - User-scoped DB: routes data en `userDb`, routes admin en `service_role`.
- [ ] D4 - Gouvernance settings: conserver edition super_admin tant que decision produit contraire non validee.
- [ ] D5 - Aucun elargissement de droits SQL non valide explicitement.

---

## 4) Ordre d'execution strict (gates)

- Gate G0: Baseline + inventaire exact
- Gate G1: Alignement prod critique (migrations + CORS runtime)
- Gate G2: Fondations backend RPC (types + routes chainees)
- Gate G3: User-scoped DB + RLS defense
- Gate G4: Fondations frontend RPC (client + bridge)
- Gate G5: Migration services frontend par vagues
- Gate G6: Nettoyage legacy + QA final + validation prod

Ne pas passer au gate suivant si le gate courant n'est pas vert.

---

## 5) Plan detaille par gate

## Gate G0 - Baseline de travail

### G0.1 Baseline repo
- [x] `git status --short` documente dans le ticket.
- [x] Identifier les fichiers cibles de la migration (liste ci-dessous).

### G0.2 Baseline qualite locale
- [x] `frontend`: `npm run typecheck`
- [x] `frontend`: `npm run lint -- --max-warnings=0`
- [x] `frontend`: `npm run test:run`
- [x] `backend`: `deno lint backend/functions/api`
- [x] `backend`: `deno check --config backend/deno.json backend/functions/api/index.ts`
- [x] `backend`: `deno test --allow-env --no-check --config backend/deno.json backend/functions/api`

### G0.3 Baseline Supabase MCP
- [x] `list_edge_functions` archive dans le ticket.
- [x] `list_migrations` archive dans le ticket.
- [x] `execute_sql` privileges `hard_delete_agency` archive.
- [x] Probes HTTP `POST/OPTIONS` archivees.

Critere G0 PASS:
- [ ] Tous les constats sont traces avec preuves.

### [Compte rendu G0]

Date: 2026-02-16
Statut global G0.x execute: `G0.1` + `G0.2` + `G0.3` completes.

#### G0.1 - Baseline repo
- Commande executee: `git status --short`
- Resultat observe: `?? docs/plan/`
- Inventaire des fichiers cibles de migration: identifie a partir des sections `Fichiers:` du plan (backend routes/services/middleware/types, migrations, typing RPC, client API frontend, services frontend admin/data).

#### G0.2 - Baseline qualite locale
Toutes les commandes demandees ont retourne `PASS`:
- `frontend`: `npm run typecheck`
- `frontend`: `npm run lint -- --max-warnings=0`
- `frontend`: `npm run test:run` -> `37` fichiers de tests passes, `109` tests passes, `0` echec
- `backend`: `deno lint backend/functions/api` -> `Checked 32 files`
- `backend`: `deno check --config backend/deno.json backend/functions/api/index.ts`
- `backend`: `deno test --allow-env --no-check --config backend/deno.json backend/functions/api` -> `66` passes, `0` echec, `9` ignores

#### G0.3 - Baseline Supabase MCP
Projet cible confirme: `rbjtrcorlezvocayluok` (`CIR_Cockpit`).

- `list_edge_functions`:
  - `api` active, version `21`, `verify_jwt=false`
  - entrypoint: `source/supabase/functions/api/index.ts`
  - import map: `source/deno.json`

- `list_migrations`:
  - derniere migration visible: `20260215190920`

- `execute_sql` (privileges `hard_delete_agency`):
  - `EXECUTE` present pour `PUBLIC`, `anon`, `authenticated`, `service_role`, `postgres`

- Probes HTTP archivees (`POST` + `OPTIONS`):
  - `/functions/v1/api/data/entities`: `POST 401`, `OPTIONS 200`
  - `/functions/v1/api/data/entity-contacts`: `POST 401`, `OPTIONS 200`
  - `/functions/v1/api/data/interactions`: `POST 401`, `OPTIONS 200`
  - Aucun `404` observe sur les routes testees
  - Header CORS observe: `Access-Control-Allow-Origin: *`

#### Risques ouverts constates (baseline)
- Privileges RPC `hard_delete_agency` trop larges (`PUBLIC/anon/authenticated` encore autorises).
- CORS runtime en wildcard `*` (a traiter dans `G1.4`).

---

## Gate G1 - Alignement prod critique (must-have avant architecture)

### G1.1 Appliquer migrations manquantes en prod
- [x] Appliquer `20260216101000_harden_hard_delete_agency_rpc_privileges.sql`
- [x] Appliquer `20260216102000_strict_multi_tenant_rls.sql`
- [x] Appliquer `20260216103000_backfill_interaction_agency_id.sql`

### G1.2 Re-verifier droits RPC
- [x] `execute_sql` -> `hard_delete_agency` doit etre executable uniquement par `service_role` (+ `postgres`).
- [x] `PUBLIC/anon/authenticated` ne doivent plus avoir EXECUTE.

### G1.3 Verifier runtime API
- [x] `POST /functions/v1/api/data/entities` -> pas de `404`
- [x] `POST /functions/v1/api/data/entity-contacts` -> pas de `404`
- [x] `POST /functions/v1/api/data/interactions` -> pas de `404`
- [x] `OPTIONS` des memes routes -> `200`

### G1.4 CORS prod
- [x] Renseigner `CORS_ALLOWED_ORIGIN` avec whitelist explicite (prod + preview voulues).
- [x] Verifier origine autorisee -> header exact.
- [x] Verifier origine non autorisee -> `403 AUTH_FORBIDDEN`.
- [x] Verifier qu'aucune route critique ne repond `Access-Control-Allow-Origin: *` en prod.

Critere G1 PASS:
- [x] Migrations alignees repo/prod.
- [x] RPC sensible verrouillee.
- [x] CORS prod conforme (whitelist stricte).

Rollback G1:
- [ ] Si regression CORS prod, restaurer temporairement origin de secours connue et tracer l'incident.
- [ ] Si migration RLS bloque operation legitime, rollback SQL cible par migration inverse.

### [Compte rendu G1]

Date: 2026-02-17
Statut global G1.x execute: `G1.1` + `G1.2` + `G1.3` + `G1.4` completes.

#### G1.1 - Migrations prod
- `apply_migration` execute avec succes pour:
  - `20260216101000_harden_hard_delete_agency_rpc_privileges`
  - `20260216102000_strict_multi_tenant_rls`
  - `20260216103000_backfill_interaction_agency_id`
- `list_migrations` confirme les versions ajoutees cote prod:
  - `20260216135200`
  - `20260216135225`
  - `20260216135230`

#### G1.2 - Droits RPC `hard_delete_agency`
- `execute_sql` (has_function_privilege) confirme:
  - `service_role=true`, `postgres=true`
  - `public=false`, `anon=false`, `authenticated=false`
- Controle de corroboration (`pg_roles`) confirme que seuls `postgres` et `service_role` gardent `EXECUTE`.

#### G1.3 - Runtime routes data
- Probes HTTP executes sur:
  - `/functions/v1/api/data/entities`
  - `/functions/v1/api/data/entity-contacts`
  - `/functions/v1/api/data/interactions`
- Resultats:
  - `POST` retourne `401` (donc aucun `404`)
  - `OPTIONS` retourne `200`

#### G1.4 - CORS strict
- Secret runtime configure:
  - `CORS_ALLOWED_ORIGIN=http://localhost:3000` (contexte de travail local valide explicitement)
  - Aucun domaine frontend de production n'est encore defini (environnement en developpement uniquement).
- Redeploiement Edge Function effectue:
  - `supabase functions deploy api --project-ref rbjtrcorlezvocayluok --use-api --import-map deno.json --no-verify-jwt`
  - `list_edge_functions` confirme `api` active, version `23`, `verify_jwt=false`, entrypoint/import map conformes.
- Verifications CORS:
  - Origine autorisee `http://localhost:3000` -> header exact `Access-Control-Allow-Origin: http://localhost:3000`
  - Origine non autorisee `https://evil.com` -> `403 AUTH_FORBIDDEN`
  - Controle global routes critiques testees -> aucun `Access-Control-Allow-Origin: *`

#### Decision G1
- Gate `G1` considere PASS avec preuves MCP + probes runtime archivees.

---

## Gate G2 - Fondations backend pour Hono RPC type-safe

### G2.1 Ajouter validateur Zod v4 Hono
Fichiers:
- [x] `backend/functions/api/middleware/zodValidator.ts` (nouveau)

Taches:
- [x] Creer `zValidator` base sur `@hono/hono/validator`.
- [x] Ne pas utiliser `@hono/zod-validator` dans ce chantier (eviter les frictions de typage avec Zod v4).
- [x] Mapper erreur validation vers `httpError(400, 'INVALID_PAYLOAD', ...)`.
- [x] Messages en francais.

### G2.2 Types de reponse API partages
Fichiers:
- [x] `shared/schemas/api-responses.ts` (nouveau)

Taches:
- [x] Definir types de reponse data routes (`entities`, `entity-contacts`, `interactions`, `config`, `profile`).
- [x] Definir types de reponse admin routes (`admin/users`, `admin/agencies`).
- [x] Reutiliser `Database['public']['Tables'][...]['Row']`.

### G2.3 Typage services backend
Fichiers:
- [x] `backend/functions/api/services/dataEntities.ts`
- [x] `backend/functions/api/services/dataEntityContacts.ts`
- [x] `backend/functions/api/services/dataInteractions.ts`
- [x] `backend/functions/api/services/dataConfig.ts`
- [x] `backend/functions/api/services/dataProfile.ts`
- [x] `backend/functions/api/services/adminUsers.ts`
- [x] `backend/functions/api/services/adminAgencies.ts`

Taches:
- [x] Remplacer `Promise<Record<string, unknown>>` par unions de reponses explicites.
- [x] Garder les codes erreur existants.

### G2.4 Extraire middleware CORS/body-size (prerequis lisibilite)
Fichiers:
- [x] `backend/functions/api/middleware/corsAndBodySize.ts` (nouveau)
- [x] `backend/functions/api/app.ts`

Taches:
- [x] Sortir la logique inline vers middleware nomme.
- [x] Conserver comportement existant (headers securite + taille body + OPTIONS + reject origin).

### G2.5 Refactor routes en sub-apps chainees
Fichiers:
- [x] `backend/functions/api/routes/dataEntities.ts`
- [x] `backend/functions/api/routes/dataEntityContacts.ts`
- [x] `backend/functions/api/routes/dataInteractions.ts`
- [x] `backend/functions/api/routes/dataConfig.ts`
- [x] `backend/functions/api/routes/dataProfile.ts`
- [x] `backend/functions/api/routes/adminUsers.ts`
- [x] `backend/functions/api/routes/adminAgencies.ts`
- [x] `backend/functions/api/app.ts`

Taches:
- [x] Passer de `registerXxxRoutes(app)` a `const xxxRoutes = new Hono().post(...); export default xxxRoutes;`.
- [x] Utiliser `zValidator` dans chaque route.
- [x] Recomposer `app.ts` avec `.route(...)` chainees.
- [x] Exporter `AppType` depuis l'objet `routes` compose.

Critere G2 PASS:
- [x] `AppType` reflete les routes reelles.
- [x] Toutes routes valident via `zValidator`.
- [x] `deno lint/check/test` vert.

Rollback G2:
- [ ] Revenir au pattern `registerXxxRoutes` si blocage type massif.
- [ ] Garder `zValidator` meme en rollback (faible risque, gain net).

---

## Gate G3 - User-scoped DB + defense RLS

### G3.1 Clarifier politique metier config
- [x] Valider explicitement si edition config reste super_admin-only.
- [x] Si oui: ne pas ajouter migration d'ouverture agency_admin.
- [ ] Si non: creer migration RLS dediee, explicitement revue produit/securite.

### [Compte rendu G3.1]

Date: 2026-02-17
Decision explicite: conserver l'edition config en `super_admin-only` (alignement D4, sans ouverture `agency_admin`).

Preuves:
- Frontend: `frontend/src/App.tsx` conserve `canEditSettings = userRole === 'super_admin'`.
- DB (repo): les migrations RLS config (`backend/migrations/202601181200_config_readonly.sql`, `backend/migrations/20260201133500_add_interaction_types_and_relations.sql`) imposent `is_super_admin()` sur `INSERT/UPDATE/DELETE` des tables de config.
- DB (prod via MCP `execute_sql`): policies actives des tables `agency_statuses`, `agency_services`, `agency_entities`, `agency_families`, `agency_interaction_types` confirment `with_check/using = is_super_admin()` sur ecritures.

Impact:
- Aucune migration d'ouverture des droits `agency_admin` n'est ajoutee dans ce scope.

### G3.2 Ajouter `userDb` dans le contexte backend
Fichiers:
- [x] `backend/functions/api/types.ts`
- [x] `backend/functions/api/middleware/auth.ts`

Taches:
- [x] Ajouter `userDb?: DbClient` dans `AppEnv`.
- [x] Ajouter factory `createUserScopedClient` (anon key + bearer token).
- [x] Dans `requireAuth`, injecter `db` (service role) + `userDb`.
- [x] `requireSuperAdmin` reste service-role only.
- [x] Ne pas injecter `userDb` dans `requireSuperAdmin` (routes admin hors scope userDb).

### [Compte rendu G3.2]

Date: 2026-02-17
Statut global G3.2: complete.

Implementation:
- `AppEnv` expose maintenant `userDb?: DbClient` dans le contexte Hono.
- `createUserScopedClient(accessToken)` est ajoute dans `middleware/auth.ts` avec client Supabase `anon` + header `Authorization: Bearer <token>` + `persistSession=false`, `autoRefreshToken=false`, `detectSessionInUrl=false`.
- `requireAuth` injecte desormais les deux clients:
  - `db` (service role) pour les chemins admin/privilegies existants.
  - `userDb` (scoped token utilisateur) pour la bascule progressive des routes data.
- `requireSuperAdmin` reste strictement sur `db` service role; aucun `userDb` n'y est injecte.

### G3.3 Basculer routes data sur `userDb`
Fichiers:
- [x] `backend/functions/api/routes/dataEntityContacts.ts`
- [x] `backend/functions/api/routes/dataInteractions.ts`
- [x] `backend/functions/api/routes/dataConfig.ts`
- [x] `backend/functions/api/routes/dataProfile.ts`
- [x] `backend/functions/api/routes/dataEntities.ts`

Taches:
- [x] Utiliser `userDb` pour actions data classiques.
- [x] Conserver `db` service_role pour `dataEntities.action === 'reassign'`.
- [x] `dataConfig` passe aussi sur `userDb` pour respecter D4 et faire appliquer `is_super_admin()` par RLS.
- [ ] Si decision produit future = agency_admin peut ecrire la config, alors creer une migration RLS dediee et documentee avant de changer `dataConfig`.

### [Compte rendu G3.3]

Date: 2026-02-17
Statut global G3.3: complete.

Implementation:
- `dataEntityContacts`, `dataInteractions`, `dataConfig`, `dataProfile` utilisent desormais `c.get('userDb')` pour les actions data.
- `dataEntities` utilise `userDb` par defaut et conserve `db` (service role) uniquement pour `action === 'reassign'`.
- Aucun changement de service metier ou de policy SQL dans ce scope (bascule route-only conforme G3.3).

Preuves:
- `backend/functions/api/routes/dataEntityContacts.ts`: appel service via `userDb`.
- `backend/functions/api/routes/dataInteractions.ts`: appel service via `userDb`.
- `backend/functions/api/routes/dataConfig.ts`: appel service via `userDb`.
- `backend/functions/api/routes/dataProfile.ts`: appel service via `userDb`.
- `backend/functions/api/routes/dataEntities.ts`: selection conditionnelle `reassign -> db`, sinon `userDb`.

### G3.4 Garder defense en profondeur applicative
Fichiers:
- [x] `backend/functions/api/services/dataAccess.ts`
- [x] `backend/functions/api/services/dataEntities.ts`
- [x] `backend/functions/api/services/dataEntityContacts.ts`
- [x] `backend/functions/api/services/dataInteractions.ts`
- [x] `backend/functions/api/services/dataConfig.ts`

Taches:
- [x] Conserver `ensureAgencyAccess`, `ensureOptionalAgencyAccess`, `ensureReassignSuperAdmin`.
- [x] Ne pas supprimer les checks metier sous pretexte de RLS.

### [Compte rendu G3.4]

Date: 2026-02-17
Statut global G3.4: complete.

Preuves (checks applicatifs conserves):
- `dataAccess.ts` conserve les gardes `ensureAgencyAccess` et `ensureOptionalAgencyAccess`.
- `dataEntities.ts` conserve l'usage de `ensureAgencyAccess`, `ensureOptionalAgencyAccess`, et `ensureReassignSuperAdmin` selon l'action.
- `dataEntityContacts.ts` conserve `ensureOptionalAgencyAccess` sur `save` et `delete`.
- `dataInteractions.ts` conserve `ensureAgencyAccess` (`save`) et `ensureOptionalAgencyAccess` (`add_timeline_event`).
- `dataConfig.ts` conserve `ensureAgencyAccess` avant synchronisation config.

Impact:
- Aucun check metier retire. La defense en profondeur applicative reste active en complement de la RLS.

### G3.5 Tests
- [x] Ajouter/adapter tests backend pour userDb path.
- [x] Verifier cross-agency denies en non-super-admin.
- [x] Verifier `reassign` fonctionne toujours (service_role path).

### [Compte rendu G3.5]

Date: 2026-02-17
Statut global G3.5: complete.

Implementation:
- Ajout de `backend/functions/api/routes/dataEntities_test.ts` pour verifier la selection de client DB par route:
  - actions data classiques -> `userDb`
  - action `reassign` -> `db` service_role
- Renforcement de `backend/functions/api/services/dataAccess_test.ts` pour verifier explicitement le code `AUTH_FORBIDDEN` sur deny cross-agency non-super-admin.
- Conservation des tests existants `backend/functions/api/services/dataEntities_test.ts` pour le flux `reassignEntity` et le garde `ensureReassignSuperAdmin`.

Preuves:
- Cible G3.5: `deno test --allow-env --no-check --config backend/deno.json backend/functions/api/services/dataAccess_test.ts backend/functions/api/services/dataEntities_test.ts backend/functions/api/routes/dataEntities_test.ts` -> `12 passed`, `0 failed`.
- Suite backend complete: `deno test --allow-env --no-check --config backend/deno.json backend/functions/api` -> `68 passed`, `0 failed`, `9 ignored` (integration opt-in sans `RUN_API_INTEGRATION=1`).

Critere G3 PASS:
- [x] Routes data executees avec token utilisateur scope.
- [x] Routes admin non impactees.
- [x] Tests backend verts.

Rollback G3:
- [ ] Fallback par route de `userDb` vers `db` service_role en cas d'incident.
- [ ] Option feature flag runtime `USE_USER_SCOPED_DB` recommandee.

---

## Gate G4 - Fondations frontend RPC

### G4.1 Setup dependances et typing
Fichiers:
- [x] `frontend/package.json`
- [x] `frontend/tsconfig.json`
- [x] `shared/api/generated/rpc-app.ts` (genere)
- [x] `frontend/scripts/generate-rpc-types.mjs` (generation type RPC)

Taches:
- [x] Ajouter dependance `hono` cote frontend.
- [x] Ne pas ajouter `jose` cote frontend pour ce chantier.
- [x] Choisir et figer la strategie de pont de types: generation automatique depuis `app.ts` + `routes/*.ts`.
- [x] Generer un contrat partage `shared/api/generated/rpc-app.ts` (types + mapping des routes POST).
- [x] Ajouter une task (ex: `generate:rpc-types`) et l'integrer au workflow avant `frontend typecheck`.
- [x] Importer `AppType` frontend depuis le fichier genere, pas depuis `backend/functions/api/**` en direct.

Note importante:
- [x] Eviter `include` global de `../backend/functions/api/**` dans le tsconfig frontend.
- [x] Option B (contrat manuel shared) reste fallback si la generation `.d.ts` echoue.

### [Compte rendu G4.1]

Date: 2026-02-17
Statut global G4.1: complete.

Implementation:
- Ajout de la dependance frontend `hono` (sans ajout de `jose` cote frontend).
- Ajout d'un script `node ./scripts/generate-rpc-types.mjs` (frontend) qui genere `shared/api/generated/rpc-app.ts`.
- Integration de la generation avant typecheck frontend via `pretypecheck` + script `generate:rpc-types` dans `frontend/package.json`.
- Abandon du build type-only backend (`tsconfig.rpc-types`) au profit d'une generation explicite depuis les routes.
- Durcissement `frontend/tsconfig.json` pour exclure `../backend/functions/api/**` et eviter un include global backend dans le frontend.

Preuves:
- `npm run typecheck` (frontend) execute `pretypecheck` puis `generate:rpc-types` avant `tsc --noEmit`.
- Fichier genere present: `shared/api/generated/rpc-app.ts`.
- Verification import frontend:
  - `rg -n \"from ['\\\"][^'\\\"]*backend/functions/api\" frontend/src` -> aucun resultat.

### G4.2 Client RPC + wrapper d'erreurs
Fichiers:
- [x] `frontend/src/services/api/rpcClient.ts` (nouveau)
- [x] `frontend/src/services/api/safeRpc.ts` (nouveau)

Taches:
- [x] Creer client RPC type-safe base sur le contrat genere (`AppType` importe depuis `shared/api/generated`).
- [x] Reutiliser logique refresh token fiable existante.
- [x] Conserver mapping erreur via `mapEdgeError`.
- [x] Supporter les 2 patterns services existants:
  - ResultAsync
  - throw AppError

### [Compte rendu G4.2]

Date: 2026-02-17
Statut global G4.2: complete.

Implementation:
- Ajout de `frontend/src/services/api/rpcClient.ts`:
  - client `rpcClient` base sur `shared/api/generated/rpc-app` (sans cast `unknown`).
  - injection dynamique du header `Authorization` via `buildRpcRequestInit()` avec refresh session pre-emptif (fenetre de securite 30s), aligne sur la logique deja utilisee.
  - conservation du header `apikey` optionnel.
- Ajout de `frontend/src/services/api/safeRpc.ts`:
  - `invokeRpc(...)` pour le pattern throw `AppError`.
  - `safeRpc(...)` pour le pattern `ResultAsync<T, AppError>`.
  - mapping d'erreurs Edge conserve via `mapEdgeError`.
  - normalisation reseau via `createAppError({ code: 'NETWORK_ERROR', ... })`.
- Ajustement `frontend/tsconfig.json`:
  - mapping `paths` pour `hono`/`hono/*` vers `frontend/node_modules` afin d'eviter un conflit de types entre resolutions `hono` (racine vs frontend) lors du `typecheck`.

Preuves:
- `npm run typecheck` (frontend) passe avec generation RPC (`pretypecheck`) puis compilation TS stricte.
- `npm run lint -- --max-warnings=0`, `npm run test:run`, `npm run check:error-compliance`, `npm run build` passent.

### [Rectificatif G4 - 2026-02-18]

Constat corrige:
- L'ancienne generation ecrivait un stub `AppType = Hono` (type trop generique), et `rpcClient` utilisait un cast manuel.

Correction appliquee:
- Generation automatique du contrat RPC depuis `backend/functions/api/app.ts` + `backend/functions/api/routes/*.ts`.
- Sortie generee: `shared/api/generated/rpc-app.ts` avec:
  - `RPC_POST_PATHS` (mapping des routes POST),
  - `AppType` derive de ce mapping.
- `frontend/src/services/api/rpcClient.ts` n'utilise plus `hono/client` ni cast `as unknown as RpcClient`.

Preuves:
- `rg -n \"AppType = Hono|as unknown as RpcClient|hono/client\" shared/api/generated frontend/src/services/api/rpcClient.ts frontend/src/services/api/safeRpc.ts` -> aucun resultat.
- `npm run typecheck` (frontend) regenere `rpc-app.ts` puis compile sans erreur.

Critere G4 PASS:
- [x] Client RPC compile.
- [x] Aucun regress auth header.

---

## Gate G5 - Migration services frontend par vagues

### Vague 1 - Profil
Fichiers:
- [x] `frontend/src/services/auth/setProfilePasswordChanged.ts`

Checklist:
- [x] Migrer vers `api.data.profile.$post`.
- [x] Conserver comportement erreur.

### Vague 2 - Config
Fichiers:
- [x] `frontend/src/services/config/saveAgencyConfig.ts`

Checklist:
- [x] Migrer vers `api.data.config.$post`.
- [x] Verifier flux read-only vs canEdit.

### Vague 3 - Entity contacts
Fichiers:
- [x] `frontend/src/services/entities/saveEntityContact.ts`
- [x] `frontend/src/services/entities/deleteEntityContact.ts`

### Vague 4 - Entities
Fichiers:
- [x] `frontend/src/services/entities/saveEntity.ts`
- [x] `frontend/src/services/clients/saveClient.ts`
- [x] `frontend/src/services/clients/setClientArchived.ts`
- [x] `frontend/src/services/entities/convertEntityToClient.ts`
- [x] `frontend/src/services/entities/reassignEntity.ts`

### Vague 5 - Interactions
Fichiers:
- [x] `frontend/src/services/interactions/saveInteraction.ts`
- [x] `frontend/src/services/interactions/updateInteractionOptimistic.ts`

### Vague 6 - Admin users
Fichiers:
- [x] `frontend/src/services/admin/adminUsersCreate.ts`
- [x] `frontend/src/services/admin/adminUsersSetRole.ts`
- [x] `frontend/src/services/admin/adminUsersUpdateIdentity.ts`
- [x] `frontend/src/services/admin/adminUsersSetMemberships.ts`
- [x] `frontend/src/services/admin/adminUsersResetPassword.ts`
- [x] `frontend/src/services/admin/adminUsersArchive.ts`
- [x] `frontend/src/services/admin/adminUsersUnarchive.ts`
- [x] `frontend/src/services/admin/adminUsersDelete.ts`

### Vague 7 - Admin agencies
Fichiers:
- [x] `frontend/src/services/admin/adminAgenciesCreate.ts`
- [x] `frontend/src/services/admin/adminAgenciesRename.ts`
- [x] `frontend/src/services/admin/adminAgenciesArchive.ts`
- [x] `frontend/src/services/admin/adminAgenciesUnarchive.ts`
- [x] `frontend/src/services/admin/adminAgenciesHardDelete.ts`

Regles de migration par vague:
- [x] Migrer 1 vague a la fois.
- [x] Lancer tests associes apres chaque vague.
- [x] Ne pas toucher les services de lecture Supabase directe hors scope.

Critere G5 PASS:
- [x] Plus aucun appel `safeInvoke` dans services cibles.
- [x] Tests frontend verts apres chaque vague.

Rollback G5:
- [ ] Revenir au service precedent par fichier (rollback fin et rapide).

---

## Gate G6 - Nettoyage legacy + QA final + validation prod

### G6.1 Nettoyage code obsolete
Fichiers:
- [x] `frontend/src/services/api/client.ts`
- [x] `frontend/src/services/admin/invokeAdminFunction.ts`

Checklist:
- [x] Supprimer `safeInvoke` si plus reference.
- [x] Supprimer `invokeAdminFunction` si plus reference.
- [x] Supprimer parseurs ad-hoc devenus inutiles.

### G6.2 QA runbook complet
- [x] Phase A `git status --short`
- [x] Phase B front: typecheck/lint/test:run/check:error-compliance/build
- [x] Phase C back: deno lint/check/test
- [x] Phase D: grep hard-rules (`throw new Error`, `console.error`, `toast.error`, `any`, `@ts-ignore`)
- [x] Phase E: coherence error pipeline
- [x] Phase F: probes Supabase runtime

### G6.3 Validation MCP post-deploy
- [x] `list_edge_functions` conforme (api active, entrypoint, import map, verify_jwt)
- [x] `list_migrations` aligne repo
- [x] `execute_sql` hard_delete_agency privileges verrouilles
- [x] probes POST/OPTIONS routes data sans 404 et CORS conforme

Critere G6 PASS:
- [x] Rapport QA manuel complet fourni.
- [x] Aucun blocker ouvert.

---

## 6) Matrice risques / mitigations

- [ ] Risque R1: Couplage type frontend-backend trop fort
  - Mitigation: pont type-only stable, limiter import runtime backend.

- [ ] Risque R2: Regressions auth token pendant migration RPC
  - Mitigation: conserver logique refresh existante, tests mutation sensibles.

- [ ] Risque R3: Regressions RLS userDb
  - Mitigation: bascule progressive routes data, rollback par route, tests cross-agency.

- [ ] Risque R4: CORS prod casse des origins legitimes
  - Mitigation: inventorier origins avant whitelist, test origine autorisee/non autorisee.

- [ ] Risque R5: Changement de gouvernance settings involontaire
  - Mitigation: decision produit explicite avant migration RLS config.

---

## 7) Definition of Done (DoD)

- [x] Prod Supabase alignee avec le repo sur les migrations critiques.
- [x] `hard_delete_agency` non callable par `PUBLIC/anon/authenticated`.
- [x] CORS prod strict (pas de wildcard en prod).
- [x] Routes data executees via `userDb` (hors exceptions documentees comme `reassign`).
- [x] API frontend migree vers contrat RPC type-safe sur les services cibles.
- [x] Code legacy retire (`safeInvoke`, `invokeAdminFunction`) apres migration complete.
- [x] QA runbook complet vert + rapport final rempli.

---

## 8) Journal d'avancement (a cocher pendant implementation)

### Semaine / Sprint en cours
- [x] G0 termine
- [x] G1 termine
- [x] G2 termine
- [x] G3 termine
- [x] G4 termine
- [x] G5 termine
- [x] G6 termine

### Notes execution
- [ ] Incident(s) et rollback(s) traces
- [x] Decisions produit/security tracees
- [x] Liens vers evidence MCP ajoutes

---

## 9) References

- `AGENTS.md`
- `CLAUDE.md`
- `docs/qa-runbook.md`
- `docs/audit/2026-02-15_backend_frontend_audit.md`
- `backend/functions/api/app.ts`
- `backend/functions/api/middleware/auth.ts`
- `frontend/src/services/api/client.ts`
- `frontend/src/services/admin/invokeAdminFunction.ts`
- `frontend/scripts/generate-rpc-types.mjs`
- `shared/api/generated/rpc-app.ts`
