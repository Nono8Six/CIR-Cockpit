# Audit complet : CIR Cockpit Backend, Interactions Frontend-Backend & Securite

**Date** : 2026-02-15
**Scope** : Architecture backend, communication frontend-backend, modele de securite, middleware, JWT, schemas, tests, multi-tenancy

---

## Table des matieres

1. [Audit Architecture Backend](#1-audit-architecture-backend)
2. [Audit Interactions Frontend-Backend](#2-audit-interactions-frontend-backend)
3. [Audit Securite](#3-audit-securite)
4. [Synthese & Plan d'action](#4-synthese--plan-daction)

---

# 1. Audit Architecture Backend

## 1.1 Entry Point & Hono App Setup

### `backend/functions/api/index.ts`

**Structure** : `Deno.serve()` wraps l'app Hono avec une couche de normalisation de chemin.

- `PATH_PREFIXES` gere `/functions/v1/api` (production Supabase) et `/api` (dev local). Strip le prefix et forward un path propre a Hono.
- `normalizeRequestPath` clone la request avec `new Request(normalizedUrl.toString(), req)` -- forward correctement tous les headers, method et body.
- Utilise `as const` pour l'immutabilite.

**Constats** :
- La normalisation ne gere pas les trailing slashes (OK car Hono gere les deux).
- **Pas de graceful shutdown**. `Deno.serve()` retourne un `Deno.HttpServer` mais le handle n'est pas capture. Pas de mecanisme de drain des requetes inflight lors d'un redeploy.

### `backend/functions/api/app.ts`

**Chaine middleware** (ordre critique) :
1. `requestId` -- sur chaque requete (`*`)
2. CORS handler (middleware inline anonyme) -- sur chaque requete (`*`)
3. `onError` -- handler d'erreur global
4. Enregistrement des routes (7 groupes)

7 groupes de routes : `/admin/users`, `/admin/agencies`, `/data/entities`, `/data/entity-contacts`, `/data/interactions`, `/data/config`, `/data/profile`

**Export `AppType`** : `export type AppType = typeof app` -- permet l'inference de type Hono RPC cote frontend. **Mais le frontend ne l'utilise PAS** (opportunite manquee).

### `supabase/functions/api/index.ts`

Wrapper de re-export minimal : `import '../../../backend/functions/api/index.ts'`. Conforme au CLAUDE.md.

### `supabase/config.toml`

2 lignes : `[functions.api]` et `verify_jwt = false`. Auth geree dans le code applicatif.

---

## 1.2 Analyse des Middlewares

### requestId (`middleware/requestId.ts`)

- Accepte le header `x-request-id` entrant, fallback sur `crypto.randomUUID()`.
- Trim la valeur entrante et verifie les chaines vides.
- Set la variable de contexte Hono ET le header de reponse.

**Constat** : Pas de validation longueur/format sur le `x-request-id` entrant. Un client malveillant pourrait envoyer une valeur tres longue. Un guard max-length (ex: 128 chars) serait plus sur. **Severite : LOW**

### CORS (`app.ts` inline)

```typescript
const allowedOrigin = Deno.env.get('CORS_ALLOWED_ORIGIN') ?? '*';
```

- `Access-Control-Allow-Methods: POST, OPTIONS` (correct pour API RPC)
- `Access-Control-Expose-Headers: x-request-id` (bonne observabilite)

**Constat [CRITICAL]** : Default `*` si env non set. En production, n'importe quelle origine peut appeler l'API. C'est **fail-open** au lieu de fail-closed. Doit etre l'URL exacte du frontend en production.

**Constat [MEDIUM]** : Headers de securite manquants : `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`.

### Error Handler (`middleware/errorHandler.ts`)

- `httpError()` factory cree des objets Error enrichis avec `status`, `code` et `details`.
- `normalizeError()` gere les instances `Error` (avec proprietes HttpError potentielles) et les valeurs non-Error (default 500).
- `handleError()` fait un catalog lookup : si le code est dans le catalog, utilise le message catalog (francais, user-facing). Fallback sur `REQUEST_FAILED`.
- **Validation du contrat** : `edgeErrorPayloadSchema.parse(body)` avant retour -- excellent.

**Constat** : La fonction `normalizeError` utilise un cast `as HttpError` (ligne 23). Le check `instanceof Error` est le type guard, mais le cast etend au-dela de ce que `instanceof` garantit. Exception pragmatique. **Severite : LOW**

**Constat** : Risque theorique de boucle infinie si `edgeErrorPayloadSchema.parse()` echoue dans l'error handler. En pratique peu probable. **Severite : LOW**

### **CRITIQUE : Pas de handler 404**

Quand une route n'existe pas, Hono retourne son 404 plain-text par defaut **sans headers CORS** et **sans le format JSON structure**. Cela casse le contrat d'erreur pour le frontend.

**Fix necessaire** : Ajouter `app.notFound()` avec le meme format que `handleError`. **Severite : HIGH**

---

## 1.3 Auth Middleware (`middleware/auth.ts`)

### Flux de verification JWT

```
Request -> getBearerToken() -> decode protected header -> check alg allowlist + kid present
        -> jwtVerify() via JWKS (jose) -> validate issuer + audience
        -> resolveAuthContext() -> query profiles + agency_members
        -> set authContext on Hono context
```

**Points forts (excellent)** :
- **Algorithm allowlist ES256 uniquement** -- bloque l'attaque `alg: none`, confusion HS256/RSA
- **Pre-flight header check** : decode le header AVANT de contacter JWKS -- reduit les appels JWKS inutiles
- **JWKS cache avec TTL** (10 min, configurable via env) -- performance + securite
- **Issuer + audience valides** -- empeche l'utilisation de tokens d'autres services
- Seul le header `Authorization` standard est accepte ; `x-client-authorization` est rejete (confirme par test d'integration)

**Claims verifies** :
- `sub` (user ID) -- requis, trimme
- `iss` (issuer) -- valide contre l'URL auth Supabase
- `aud` (audience) -- valide contre `"authenticated"`
- `exp` (expiry) -- implicitement verifie par `jwtVerify()` de jose
- `alg` (algorithm) -- check explicite allow-list (ES256)
- `kid` (key ID) -- doit etre present et non-vide

**Validation de config** : `assertSupabaseConfig()` verifie toutes les vars env requises. Config manquante throw 500 `CONFIG_MISSING`. Approche fail-closed correcte.

**Constats** :

1. **Pas de check `banned_at`/`archived_at` dans `resolveAuthContext()`** [HIGH] : Le JWT d'un utilisateur banni continue de fonctionner jusqu'a expiration. Le ban via `updateAuthBan()` empeche le refresh, mais le token existant reste actif. **Recommandation** : Ajouter un check de `banned_until` ou `archived_at` dans le lookup profile et rejeter avec 403.

2. **2 requetes DB sequentielles par requete authentifiee** [MEDIUM] : Queries `profiles` + `agency_members` a chaque requete. Sous charge, c'est un goulot d'etranglement. **Recommandation** : Creer une RPC `get_auth_context(p_user_id)` retournant role + memberships en un seul appel, ou utiliser un lateral JOIN.

3. **Singletons mutables au niveau module** (lignes 103-109) [LOW] : `let supabaseAdmin`, `let jwksResolver`, etc. Standard en serverless Deno mais potentiellement problematique si l'isolate est partage entre requetes concurrentes.

4. **Duplication de code entre `requireAuth` et `requireSuperAdmin`** [LOW] : Les 10 premieres lignes sont identiques. Extraire un helper partage `resolveAndSetAuth()`.

5. **Invalidation cache JWKS time-based uniquement** [LOW] : Si Supabase effectue une rotation des cles, breve fenetre ou des tokens valides sont rejetes. Acceptable mais a documenter.

6. **Pas de check explicite `nbf` (not-before)** [LOW] : `jwtVerify()` de jose verifie `nbf` par defaut, donc couvert, mais pas configure explicitement.

### `requireAuth` vs `requireSuperAdmin`

- Les deux extraient le token, verifient, resolvent le contexte auth.
- `requireSuperAdmin` ajoute le check `isSuperAdmin`.
- Routes admin utilisent `requireSuperAdmin` ; routes data utilisent `requireAuth`.

---

## 1.4 Analyse des Routes

Les 7 fichiers de routes suivent un pattern identique :

```
registerXRoutes(app) -> app.post('/path', authMiddleware, async handler)
```

**Pattern consistant sur toutes les routes** :
1. Extraction `requestId`, `db`, `authContext`/`callerId` du contexte
2. Guard contre les variables de contexte manquantes (`if (!db || !authContext)`)
3. Parse du body JSON avec `.catch()` pour JSON malformed
4. Validation avec schema Zod `.safeParse()`
5. Delegation a la fonction service
6. Return `c.json(result)`

**Routes admin** (`/admin/users`, `/admin/agencies`) : Utilisent `requireSuperAdmin` -- niveau d'autorisation correct.

**Routes data** (`/data/entities`, `/data/entity-contacts`, `/data/interactions`, `/data/config`, `/data/profile`) : Utilisent `requireAuth` -- tout utilisateur authentifie. Controle d'acces agence dans la couche service.

**Observations** :
- Toutes les routes sont POST-only. API style RPC (action-based), pas REST. Design consistant.
- **Aucune route GET**. Les lectures passent par Supabase PostgREST directement (client frontend). Seules les mutations passent par les Edge Functions.
- Inconsistance mineure : la route `dataConfig` passe `parsed.data.agency_id` comme parametre separe alors que les autres routes passent le payload complet.

**Constat [MEDIUM]** : Pas de limite de taille du body. Un client malveillant pourrait envoyer un body JSON tres volumineux. Hono/Deno a peut-etre une limite par defaut, mais une limite explicite serait defensive.

**Constat [LOW]** : Duplication du code des handlers de route. Les 7 fichiers ont le meme pattern de ~25 lignes. Pourrait etre extrait dans un handler factory partage.

---

## 1.5 Analyse des Services

### rateLimit.ts

- Lit `RATE_LIMIT_MAX` (default 10) et `RATE_LIMIT_WINDOW_SECONDS` (default 300) depuis l'env au chargement du module.
- Delegue a la fonction RPC PostgreSQL `check_rate_limit`.
- Format de cle : `{prefix}:{callerId}:{windowSeconds}`.
- **Fail-closed sur erreur** : Si l'appel RPC echoue, throw `RATE_LIMIT_CHECK_FAILED` (500).
- Granularite par action : differentes actions ont des rate limits independants.

**Constats** :
- Rate limits independants par action : un utilisateur pourrait faire 10 saves d'entite ET 10 archives ET 10 saves d'interaction dans la meme fenetre. Pas de rate limit global par utilisateur. **Severite : LOW**
- Algorithme fenetre fixe peut permettre un burst de trafic aux limites de fenetre (jusqu'a 2x la limite). **Severite : LOW**

### dataAccess.ts

- `ensureAgencyAccess()` : Valide agency_id non-vide, puis check super_admin OU agence dans les memberships. Propre.
- `ensureOptionalAgencyAccess()` : Autorise agency_id null uniquement pour super_admin.
- `getEntityAgencyId()` et `getContactEntityId()` : Fonctions de lookup pour la chaine de propriete (contact -> entity -> agency).

### dataEntities.ts

Trois actions : `save`, `archive`, `convert_to_client`.

- `saveEntity` : Gere insert et update. Utilise des ensembles de champs differents pour Client vs Prospect.
- `archiveEntity` : Set/clear `archived_at`.
- `convertToClient` : Change entity_type avec guard `.neq('entity_type', 'Client')` contre la double-conversion.

**Constat [LOW]** : Dans `saveEntity`, lors de l'update, pas de verification de propriete au-dela du check d'acces agence. L'agency_id dans le payload pourrait theoriquement differer de celui de l'entite existante, permettant a un super_admin de "deplacer" une entite entre agences.

### dataEntityContacts.ts

Deux actions : `save`, `delete`. Avant save/delete, verifie la chaine de propriete : contact -> entity -> agency -> membership utilisateur. Delete verifie la propriete avant suppression.

### dataInteractions.ts

Deux actions : `save`, `add_timeline_event`.

- `saveInteraction` : Utilise `upsert` avec `onConflict: 'id'` -- bon pour la creation optimiste.
- `addTimelineEvent` : **Controle de concurrence optimiste** via `expected_updated_at`. Si modifie depuis le dernier fetch, retourne 409 CONFLICT. Excellent pattern.

**Constats** :
- Champ `updates` type `z.record(z.string(), z.unknown())` -- tres permissif. `normalizeInteractionUpdates` fait un whitelist manuel, ce qui est une defense correcte, mais le schema laisse passer n'importe quelle cle. **Severite : MEDIUM**
- `status` set a chaine vide `''` dans `saveInteraction` (ligne 91), depend du trigger DB pour sync depuis `status_id`. Couplage application-database. **Severite : LOW**

### dataConfig.ts

Sync de la configuration agence : statuts, services, entites, familles, interaction_types.

- `normalizeLabelList` : Deduplique les labels case-insensitivement.
- `syncLabelTable` : Upsert des labels desires, supprime les retires. Utilise `onConflict: 'agency_id,label'`.
- `syncStatuses` : Plus complexe avec `id`, `category`, `is_terminal`, `is_default`.

**Constats** :
- `STATUS_CATEGORIES` hardcode comme `['todo', 'in_progress', 'done']`. Si l'enum DB change, accepte silencieusement des valeurs invalides. **Severite : LOW**
- Premier statut toujours set comme `is_default: index === 0`. Regle metier ancree dans le code service. **Severite : LOW**

### dataProfile.ts

Action unique : `password_changed` -- set `must_change_password: false`. Utilise `authContext.userId` pour scoper l'update a l'utilisateur courant. Sur.

### adminUsers.ts (869 lignes -- plus gros fichier service)

**Generation de mot de passe** :
- `generateTempPassword` : Utilise `crypto.getRandomValues()` pour CSPRNG. Garantit au moins 1 chiffre, 1 symbole, 1 lettre. Shuffle Fisher-Yates.
- **Preoccupation mineure** : `randomInt(max)` utilise `Uint32Array[0] % max` qui a un leger biais modulo pour les valeurs non-puissance-de-2. Acceptable pour la generation de mots de passe. **Severite : LOW**

**Flux de creation utilisateur** :
1. Verifier si l'email existe deja -> retourner l'utilisateur existant (idempotent)
2. Creer l'utilisateur auth Supabase
3. Attendre le profil via `ensureProfileAvailable` : 5 retries a 150ms (750ms max)
4. Mettre a jour le profil avec role, nom, etc.
5. Appliquer les memberships agence

**Constat [MEDIUM]** : Polling `ensureProfileAvailable` (5 x 150ms = 750ms max) fragile sous charge. Si le trigger prend plus de temps, echoue avec un faux `PROFILE_CREATE_FAILED`.

**Flux de suppression utilisateur** :
1. Guard auto-suppression
2. Anonymiser les interactions (reassigner aux utilisateurs systeme par agence)
3. Supprimer l'utilisateur auth

**Positif** : Le systeme d'anonymisation provisionne des utilisateurs systeme par agence et un utilisateur systeme orphelin, puis reassigne toutes les interactions avant suppression. Preserve l'integrite des donnees. Les utilisateurs systeme sont bannis (`BANNED_UNTIL = '9999-12-31T00:00:00.000Z'`), ont `is_system: true`, et utilisent le domaine email `@cir.invalid`.

**Securite** : `reset_password` genere un mot de passe temporaire et force `must_change_password: true`. Mot de passe temporaire retourne dans la reponse (attendu pour les resets admin). `archive` bannit l'utilisateur via Supabase auth.

### adminAgencies.ts

Cinq actions : `create`, `rename`, `archive`, `unarchive`, `hard_delete`.

- `handleAgencyNameConflict` detecte les violations de contrainte unique (code erreur PostgreSQL `23505`).
- `hard_delete` delegue a la fonction RPC `hard_delete_agency`. Operation dangereuse protegee par l'auth super_admin au niveau route.

## 1.6 Types & Config

### `backend/functions/api/types.ts`

- `DbClient` : Client Supabase type avec generics Database.
- `UserRole` : Derive du type enum Database.
- `AuthContext` : `userId`, `role`, `agencyIds[]`, `isSuperAdmin`.
- `AppEnv` : Variables d'environnement Hono -- `requestId`, `callerId?`, `authContext?`, `db?`.

**Constat [LOW]** : `callerId`, `authContext` et `db` sont tous optionnels (`?`). Chaque handler de route doit les null-check apres que le middleware auth a tourne. Les rendre non-optionnels dans un type post-auth separe serait plus propre.

### `backend/deno.json`

- `nodeModulesDir: "auto"` -- mode compatibilite Node de Deno.
- Versions pinnees : Hono 4.11.9, Supabase JS 2.95.3, jose 5.9.6, Zod 4.3.6.
- Triple import mapping Zod (`zod`, `zod/v4`, `zod/`) pour compatibilite Edge Function.

### `deno.json` (racine)

Miroir du `deno.json` backend sans `nodeModulesDir`. Utilise pour `supabase functions deploy --import-map deno.json`.

---

# 2. Audit Interactions Frontend-Backend

## 2.1 Client API (`frontend/src/services/api/client.ts`)

**Architecture** : Le frontend utilise une fonction custom `safeInvoke` -- PAS Hono RPC. Malgre l'export de `AppType` depuis `app.ts`, le frontend n'utilise pas le client type de Hono. Il utilise des appels `fetch` bruts.

**Fonctionnement** :
- `getApiBaseUrl()` construit `{VITE_SUPABASE_URL}/functions/v1/api` depuis la var env
- `getOptionalApiKeyHeader()` lit `VITE_SUPABASE_ANON_KEY` et l'envoie comme header `apikey`
- `getUserAccessToken()` recupere le token de session Supabase courant, le rafraichit si proche de l'expiration (fenetre de securite 30 secondes), et l'envoie comme `Authorization: Bearer <token>`
- Tous les appels sont `POST` avec body JSON
- Reponse parsee en JSON, validee : verifie `response.ok`, verifie que le payload est un record, verifie `ok !== false`
- Erreurs mappees via `mapEdgeError`

**Logique de refresh token** (lignes 26-30) : `isSessionExpiredOrNearExpiry` verifie si `expires_at <= now + 30s`. Si expire ou proche, appelle `supabase.auth.refreshSession()`. Strategie de refresh proactive.

**Constat [MEDIUM]** : Si `refreshSession()` echoue (erreur reseau, etc.), fallback silencieux sur le token de session existant (ou chaine vide). Pourrait mener a des erreurs 401 de l'Edge Function plutot qu'une erreur auth claire au niveau reseau.

**Constat [HIGH -- Architecture]** : Opportunite manquee pour la type safety end-to-end Hono RPC. Actuellement les paths et payloads sont des strings/objets non type-checked. Un changement de route backend casse silencieusement le frontend.

## 2.2 Client Supabase (`frontend/src/services/supabase/`)

**Fichiers** :
- `frontend/src/services/supabase/getSupabaseClient.ts`
- `frontend/src/services/supabase/requireSupabaseClient.ts`
- `frontend/src/services/supabase/memoryStorage.ts`

**Initialisation** : Singleton au niveau module cree via `createClient<Database>` avec :
- `autoRefreshToken: true`
- `persistSession: true`
- `detectSessionInUrl: true`
- `storage: memoryStorage` -- `Map<string, string>()` custom en memoire

**Implications memoryStorage** :
- Sessions perdues au refresh/reload de page (pas de persistance localStorage)
- Les onglets NE partagent PAS les sessions
- Intentionnel selon la regle CLAUDE.md ("Zero localStorage pour les donnees metier")
- Plus securise contre les attaques XSS lisant le localStorage
- Chaque refresh de page necessite une re-authentification ou `getSession()` retourne null

**`requireSupabaseClient()`** : Throw `CLIENT_NOT_CONFIGURED` AppError si le client est null (vars env manquantes).

## 2.3 Flux Auth (`frontend/src/services/auth/`)

**Fichiers** : `signInWithPassword.ts`, `signOut.ts`, `getSession.ts`, `onAuthStateChange.ts`, `updateUserPassword.ts`, `getCurrentUserId.ts`, `getCurrentUserLabel.ts`, `getProfile.ts`, `setProfilePasswordChanged.ts`

**Flux de login** :
1. `signInWithPassword(email, password)` -> appelle `supabase.auth.signInWithPassword`
2. Erreurs mappees via `mapSupabaseAuthError`
3. Retourne `Session` en cas de succes

**Gestion de session** (`useAppSessionState.ts`) :
1. Au mount : appelle `getSession()` pour verifier la session existante, set `authReady=true`
2. S'abonne a `onAuthStateChange` pour les evenements auth real-time
3. Ignore `TOKEN_REFRESHED` si meme utilisateur (evite les re-renders inutiles)
4. Sur session : charge le profil via `getProfile()` (appelle `supabase.auth.getUser()` + `supabase.from('profiles').select(...)`)
5. Sur profil charge (si pas de changement de mot de passe requis) : charge le contexte agence

**Flux de changement de mot de passe** :
- `updateUserPassword()` appelle `supabase.auth.updateUser({ password })`
- `setProfilePasswordChanged()` appelle l'Edge Function `POST /data/profile` avec `action: 'password_changed'`
- L'app bloque toute navigation jusqu'a ce que `must_change_password` soit false

**Constat** : `getCurrentUserLabel` a un cache en memoire (`cachedLabel`, `cachedUserId`) et lit directement depuis la table `profiles` via Supabase.

**Constat** : `getProfile` effectue DEUX appels : `supabase.auth.getUser()` puis `supabase.from('profiles').select(...)`. Appel Supabase direct.

## 2.4 Services Admin (`frontend/src/services/admin/`)

Tous les services de mutation admin passent par l'Edge Function via `invokeAdminFunction` :

**`invokeAdminFunction`** (`frontend/src/services/admin/invokeAdminFunction.ts`) :
- Mappe les noms de fonctions vers les paths API : `'admin-users' -> '/admin/users'`, `'admin-agencies' -> '/admin/agencies'`
- Utilise `safeInvoke`
- Retourne `ResultAsync<T, AppError>` (neverthrow)

**Mutations admin via Edge Function** :

| Service | Path Edge Function | Action |
|---|---|---|
| `adminUsersCreate` | `POST /admin/users` | `create` |
| `adminUsersSetRole` | `POST /admin/users` | `set_role` |
| `adminUsersArchive` | `POST /admin/users` | `archive` |
| `adminUsersUnarchive` | `POST /admin/users` | `unarchive` |
| `adminUsersDelete` | `POST /admin/users` | `delete` |
| `adminUsersResetPassword` | `POST /admin/users` | `reset_password` |
| `adminUsersSetMemberships` | `POST /admin/users` | `set_memberships` |
| `adminUsersUpdateIdentity` | `POST /admin/users` | `update_identity` |
| `adminAgenciesCreate` | `POST /admin/agencies` | `create` |
| `adminAgenciesRename` | `POST /admin/agencies` | `rename` |
| `adminAgenciesArchive` | `POST /admin/agencies` | `archive` |
| `adminAgenciesUnarchive` | `POST /admin/agencies` | `unarchive` |
| `adminAgenciesHardDelete` | `POST /admin/agencies` | `hard_delete` |

**Services de LECTURE admin (Supabase direct)** :

| Service | Methode |
|---|---|
| `getAdminUsers` | Supabase direct : `profiles.select(...)` + `agency_members.select(...)` |
| `getAuditLogs` | Supabase direct : `audit_logs.select(...)` avec join profiles/agencies |

## 2.5 Classification complete des services

### Services appelant les Edge Functions (via `safeInvoke`) :

| Service | Fichier | Path Edge | Action |
|---|---|---|---|
| `saveClient` | `clients/saveClient.ts` | `/data/entities` | `save` |
| `setClientArchived` | `clients/setClientArchived.ts` | `/data/entities` | `archive` |
| `saveEntity` | `entities/saveEntity.ts` | `/data/entities` | `save` |
| `convertEntityToClient` | `entities/convertEntityToClient.ts` | `/data/entities` | `convert_to_client` |
| `saveEntityContact` | `entities/saveEntityContact.ts` | `/data/entity-contacts` | `save` |
| `deleteEntityContact` | `entities/deleteEntityContact.ts` | `/data/entity-contacts` | `delete` |
| `saveInteraction` | `interactions/saveInteraction.ts` | `/data/interactions` | `save` |
| `updateInteractionOptimistic` | `interactions/updateInteractionOptimistic.ts` | `/data/interactions` | `add_timeline_event` |
| `saveAgencyConfig` | `config/saveAgencyConfig.ts` | `/data/config` | (body direct) |
| `setProfilePasswordChanged` | `auth/setProfilePasswordChanged.ts` | `/data/profile` | `password_changed` |

### Services appelant Supabase DIRECTEMENT (bypasse les Edge Functions) :

| Service | Fichier | Table(s) | Operation |
|---|---|---|---|
| `getClients` | `clients/getClients.ts` | `entities` | SELECT |
| `getClientById` | `clients/getClientById.ts` | `entities` | SELECT single |
| `getProspects` | `entities/getProspects.ts` | `entities` | SELECT |
| `getEntityContacts` | `entities/getEntityContacts.ts` | `entity_contacts` | SELECT |
| `getEntitySearchIndex` | `entities/getEntitySearchIndex.ts` | `entities` + `entity_contacts` | SELECT (parallel) |
| `getInteractions` | `interactions/getInteractions.ts` | `interactions` | SELECT |
| `getKnownCompanies` | `interactions/getKnownCompanies.ts` | via `getInteractions` | SELECT |
| `saveInteractionDraft` | `interactions/saveInteractionDraft.ts` | `interaction_drafts` | UPSERT |
| `getInteractionDraft` | `interactions/getInteractionDraft.ts` | `interaction_drafts` | SELECT |
| `deleteInteractionDraft` | `interactions/deleteInteractionDraft.ts` | `interaction_drafts` | DELETE |
| `getAgencies` | `agency/getAgencies.ts` | `agencies` | SELECT |
| `getAgencyMemberships` | `agency/getAgencyMemberships.ts` | `agency_members` | SELECT with join |
| `getProfileActiveAgencyId` | `agency/getProfileActiveAgencyId.ts` | `profiles` | SELECT |
| `setProfileActiveAgencyId` | `agency/setProfileActiveAgencyId.ts` | `profiles` | UPDATE |
| `getAgencyConfig` | `config/getAgencyConfig.ts` | 5 tables config | SELECT (parallel) |
| `getAdminUsers` | `admin/getAdminUsers.ts` | `profiles` + `agency_members` | SELECT |
| `getAuditLogs` | `admin/getAuditLogs.ts` | `audit_logs` | SELECT avec joins |
| `getProfile` | `auth/getProfile.ts` | `profiles` | SELECT |
| `getCurrentUserLabel` | `auth/getCurrentUserLabel.ts` | `profiles` | SELECT |
| Realtime subscription | `useRealtimeInteractions.ts` | `interactions` | Canal Realtime |

### Services qui doivent rester en Supabase direct (by design) :
- Drafts : `saveInteractionDraft`, `getInteractionDraft`, `deleteInteractionDraft`
- Preference agence active : `getProfileActiveAgencyId`, `setProfileActiveAgencyId`
- Realtime : `useRealtimeInteractions` (doit utiliser Supabase Realtime directement)

### 10 services de lecture a migrer vers les Edge Functions :
1. `getClients` -- Supabase direct `entities` SELECT
2. `getClientById` -- Supabase direct `entities` SELECT single
3. `getProspects` -- Supabase direct `entities` SELECT
4. `getEntityContacts` -- Supabase direct `entity_contacts` SELECT
5. `getEntitySearchIndex` -- Supabase direct `entities` + `entity_contacts` SELECT
6. `getInteractions` -- Supabase direct `interactions` SELECT
7. `getAgencyConfig` -- Supabase direct 5 tables config SELECT
8. `getAdminUsers` -- Supabase direct `profiles` + `agency_members` SELECT
9. `getAuditLogs` -- Supabase direct `audit_logs` SELECT
10. `getAgencies` -- Supabase direct `agencies` SELECT

**Impact** : Ces 10 lectures directes bypasse le middleware requestId, le rate limiting et l'audit logging. Le RLS est la **seule** protection.

## 2.6 Infrastructure Query (`frontend/src/services/query/`)

**`queryClient.ts`** :
- `staleTime: 30_000` (30 secondes)
- Retry : max 3 tentatives avec backoff exponentiel (1s, 2s, 4s... cap a 10s)
- Codes non-retryables : `AUTH_REQUIRED`, `AUTH_INVALID_CREDENTIALS`, `AUTH_FORBIDDEN`, `AUTH_WEAK_PASSWORD`, `AUTH_SAME_PASSWORD`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`
- Mutations : `retry: 0` (pas de retry)
- `refetchOnWindowFocus: false`

**`queryKeys.ts`** : Utilise des tuples `as const` pour la type safety. Cles parametrees par `agencyId`, `includeArchived`, `orphansOnly`. Permet une isolation correcte du cache par agence (correction multi-tenant).

## 2.7 Pipeline d'erreurs (`frontend/src/services/errors/`)

**Pipeline complet** : `normalizeError()` -> `reportError()` -> `notifyError()`, combine dans `handleUiError()`.

**Fichiers** :
- `AppError.ts` - Cree AppError avec `_tag: 'AppError'`, enrichit depuis le catalog
- `normalizeError.ts` - Convertit toute erreur en AppError (ZodError, reseau, Error generique, unknown)
- `handleUiError.ts` - Orchestrateur : normalize + report + notify
- `reportError.ts` - Log dans le journal (IndexedDB), appelle le reporter externe si set, console.debug en dev
- `notify.ts` - Toast Sonner avec dedup (fenetre 1.5s), push vers le store Zustand
- `journal.ts` - Journal d'erreurs base sur IndexedDB, exportable
- `source.ts` - Valide/normalise les chaines source d'erreur

**Mappers d'erreurs** (6 specifiques au domaine) :

| Mapper | Fichier | Mappe depuis |
|---|---|---|
| `mapEdgeError` | `mapEdgeError.ts` | Reponses HTTP Edge Function |
| `mapPostgrestError` | `mapPostgrestError.ts` | Erreurs PostgREST Supabase |
| `mapSupabaseAuthError` | `mapSupabaseAuthError.ts` | Erreurs SDK Auth Supabase |
| `mapAdminDomainError` | `mapAdminDomainError.ts` | Echecs actions admin |
| `mapDataDomainError` | `mapDataDomainError.ts` | Echecs actions data |
| `mapSettingsDomainError` | `mapSettingsDomainError.ts` | Echecs settings/config |

**Points forts** :
- Pipeline consistant : normalize -> report -> notify
- Deduplication toast (fenetre 1.5s)
- Journal d'erreurs dans IndexedDB pour le debug
- Reporter externe pluggable (`setErrorReporter`)
- Codes d'erreur non-retryables correctement configures dans queryClient
- `request_id` preserve end-to-end pour la tracabilite

## 2.8 Consistance de la couche Hooks

**Trois styles de gestion d'erreur detectes** :

**Style A - `handleUiError` dans onError** (utilise par `useSaveClient`, `useSaveProspect`, `useCreateAdminUser`, etc.) :
```typescript
onError: (error) => handleUiError(error, fallbackMessage, { source })
```

**Style B - normalize+report+notify manuel** (utilise par `useSaveInteraction`) :
```typescript
onError: (err) => { normalizeError + reportError + notifyError }
```

**Style C - Pas de onError** (utilise par `useAddTimelineEvent`) :
La mutation n'a PAS de handler d'erreur. Erreurs visibles uniquement par l'appelant.

**Constat [MEDIUM]** : `useAddTimelineEvent` manque un callback `onError`. Les echecs d'evenements timeline sont silencieusement avales sauf si le composant appelant gere l'erreur explicitement.

**Constat [LOW]** : `useSaveInteraction` utilise le pipeline manuel au lieu de `handleUiError`. Fonctionnellement equivalent mais style inconsistant.

**Pattern de deballage ResultAsync** : Les services retournant `ResultAsync` sont deballes dans `mutationFn` via `.match(ok => ok, err => { throw err })`. Cet aller-retour (Result -> throw -> catch dans onError) ajoute de la complexite sans benefice clair par rapport a un simple throw depuis le service.

## 2.9 Gestion d'etat de session

**`useAppSessionState`** (`frontend/src/hooks/useAppSessionState.ts`) :
- Gere : session, profil, contexte agence, memberships
- Trois chaines `useEffect` en cascade : init session -> chargement profil -> chargement contexte agence
- Fournit : `refreshProfile`, `retryProfile`, `changeActiveAgency`, `signOutUser`
- `canLoadData = Boolean(session && profile && !mustChangePassword && activeAgencyId)` -- gate tout le chargement de donnees
- `signOutUser` clear tout y compris `queryClient.clear()`

**Constat [MEDIUM]** : Caches au niveau module dans `getActiveAgencyContext`, `getAgencyMemberships`, et `getCurrentUserLabel` non invalides au signout au niveau service. Seul `queryClient.clear()` gere le cache TanStack Query. Les caches module-level (`cachedContext`, `cachedMemberships`, `cachedLabel`) sont cleared implicitement quand userId change au prochain login, mais pourraient servir des donnees stale dans des edge cases.

## 2.10 Conditions de course et problemes d'etat

1. **Cascade contexte agence** : Trois hooks `useEffect` chaines (session -> profil -> contexte agence) creent un waterfall : le chargement initial necessite 3 operations async sequentielles. Chacun a des guards `mounted` pour le cleanup.

2. **Auto-save draft debounce** : `useInteractionDraft` utilise un `setTimeout` de 800ms. Le cleanup clear correctement le timeout au unmount, mais aucune garantie que le dernier save pending se termine avant le unmount (fire-and-forget).

3. **Realtime + updates optimistes** : `useRealtimeInteractions` et `useSaveInteraction` mettent a jour le meme cache key de query. Une course entre un update optimiste local et un evenement realtime pour la meme interaction pourrait causer du flickering. Mitigue par `upsertInteractionInList` qui deduplique par ID.

## 2.11 Anti-pattern performance : `getKnownCompanies`

Fetch TOUTES les interactions via `getInteractions()` juste pour extraire les noms d'entreprise uniques. Charge toute la table interactions en memoire cote client, quand un simple `SELECT DISTINCT company_name FROM interactions WHERE agency_id = $1` suffirait. **Severite : MEDIUM**

## 2.12 Mapping des routes frontend

`invokeAdminFunction` hardcode `FUNCTION_PATHS` mapping. Si les routes backend changent, le frontend doit etre mis a jour manuellement. Hono RPC eliminerait ce couplage.

---

# 3. Audit Securite

## 3.1 Erreurs partagees (`shared/errors/`)

**Fichiers** : `types.ts`, `catalog.ts`, `fingerprint.ts`, `index.ts`

**Evaluation : SOLIDE**

**Points forts** :
- 64+ codes d'erreur couvrant auth, validation, database, reseau, rate limiting, domaines agency/user/membership
- Tous types via union type `ErrorCode`
- Fingerprinting via hash FNV-1a deterministe et favorable a la deduplication
- `_tag: 'AppError'` discriminant permet un narrowing sur
- Messages concis, user-facing, en francais (pas de fuite d'internals)

**Constats** :
- Echappatoire `(string & {})` sur `ErrorCode` (ligne 75 de `types.ts`) affaiblit les checks d'exhaustivite compile-time. N'importe quelle chaine arbitraire devient valide. **Severite : LOW**
- Pas de code d'erreur pour `CONTENT_TYPE_INVALID` (prospectif pour les requetes non-JSON). **Severite : LOW**
- Pas d'entree catalog pour `TOKEN_EXPIRED` specifiquement (expiration de session couverte par `AUTH_SESSION_EXPIRED` mais pas de distinction entre token expire vs. revoque). **Severite : LOW**

## 3.2 Schemas partages (`shared/schemas/`)

**Fichiers** : `auth.schema.ts`, `client.schema.ts`, `prospect.schema.ts`, `interaction.schema.ts`, `client-contact.schema.ts`, `convert-client.schema.ts`, `user.schema.ts`, `agency.schema.ts`, `data.schema.ts`, `edge-error.schema.ts`, `index.ts`

**Evaluation : FORT avec lacunes mineures**

**Points forts** :
- Partages entre frontend et backend assurant une validation consistante
- UUIDs valides avec `z.string().uuid()`
- Email trimme, lowercased, valide
- Mot de passe : 8+ chars, 1 chiffre, 1 symbole
- Numeros clients : regex `^\d{1,10}$`
- Codes postaux : exactement 5 chiffres
- `z.union()` correctement utilise quand discriminateur partage
- `z.discriminatedUnion()` utilise pour contacts, interactions, profil

**Constats** :

| Champ | Schema actuel | Recommandation | Severite |
|-------|--------------|----------------|----------|
| `siret` | `z.string().trim().optional().nullable()` (pas de check format) | Regex 14 chiffres + check Luhn | LOW |
| `contact_phone` | `z.string().optional().or(z.literal(''))` (pas de format) | Regex format telephone | LOW |
| `notes` | `z.string()` pas de max | `.max(10000)` | MEDIUM |
| `subject` | `z.string()` pas de max | `.max(500)` | MEDIUM |
| `timeline.content` | `z.string().trim().min(1)` pas de max | `.max(5000)` | MEDIUM |
| `updates` (timeline) | `z.record(z.string(), z.unknown())` | Schema explicite des champs autorises | MEDIUM |
| `company_name` | `z.string()` pas de max | `.max(200)` | LOW |

## 3.3 Ecart schema frontend vs backend

**Frontend `interactionSchema.ts`** etend `interactionBaseSchema` avec logique metier :
- `entity_id` requis quand `entity_type === 'Client'` (superRefine)
- Validation enum channel
- Telephone requis pour les sollicitations

**Backend `data.schema.ts`** NE replique PAS ces regles. Un appelant API direct pourrait soumettre une interaction pour un entity_type "Client" sans entity_id et le backend l'accepterait.

**Severite : LOW-MEDIUM**. Recommandation : Ajouter la validation croisee des champs au `saveInteractionSchema` backend.

## 3.4 Modele de securite JWT/Auth

**Comment `verify_jwt=false` fonctionne** : Le gateway API Supabase NE valide PAS le JWT avant le forward. Le backend effectue sa propre validation avec la librairie `jose` et JWKS.

**Chaine de validation complete** :
1. `getBearerToken()` extrait le token du header `Authorization: Bearer <token>`
2. `createJwtAuthGateway()` -> `verifyAccessToken()` :
   - Decode le protected header pour checker `alg` et `kid`
   - Valide l'algorithme contre l'allow-list (defaut : ES256 uniquement)
   - Verifie la signature JWT avec `jwtVerify()` de jose via JWKS
   - Valide l'issuer (URL issuer Auth Supabase)
   - Valide l'audience (defaut : `"authenticated"`)
   - Extrait `sub` (user ID)
3. `resolveAuthContext()` query `profiles` pour le role, `agency_members` pour les memberships

**Refresh token (frontend)** :
- Fenetre de securite 30 secondes de refresh proactif
- Double chemin de refresh : Supabase JS client `autoRefreshToken` (background) + `getUserAccessToken` (check par appel API)

**Points forts** :
- Allow-listing d'algorithme empeche les attaques de confusion d'algorithme
- JWKS fetch depuis le well-known endpoint Supabase avec cache TTL 10 minutes
- Pas de token stocke dans localStorage (memoryStorage uniquement)
- Cle service role utilisee uniquement cote serveur
- Header `x-client-authorization` NON accepte (confirme par test d'integration)

**Constats critiques** :

1. **Pas de check de revocation de token** [HIGH] : Une fois le JWT emis, reste valide jusqu'a expiration. Pas de blacklist cote serveur. Les tokens des utilisateurs archives/bannis continuent de fonctionner. **Recommandation** : Checker `banned_until`/`archived_at` dans le lookup profil pendant `resolveAuthContext()` et rejeter avec 403.

2. **Invalidation cache JWKS time-based uniquement** [LOW] : Si Supabase effectue une rotation des cles, breve fenetre ou des tokens valides sont rejetes. Acceptable mais a documenter.

## 3.5 Configuration CORS

**Fichier** : `backend/functions/api/app.ts`

```typescript
const allowedOrigin = Deno.env.get('CORS_ALLOWED_ORIGIN') ?? '*';
```

**Evaluation : PROBLEME DE SECURITE [HIGH]**

CORS defaut `*` (wildcard). Bien que l'API utilise l'authentification JWT (donc les cookies ne sont pas un facteur), le CORS wildcard permet a n'importe quel site web de faire des requetes fetch a l'API. Pas de defense-in-depth contre les scenarios d'exfiltration de token.

**Headers exposes** :
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
- `Access-Control-Allow-Methods: POST, OPTIONS` (correctement restreint)
- `Access-Control-Expose-Headers: x-request-id`

**Headers de securite manquants** :
- Pas de `Strict-Transport-Security` (HSTS)
- Pas de `X-Content-Type-Options: nosniff`
- Pas de `X-Frame-Options`
- Pas de `Content-Security-Policy`

**Recommandations** :
1. Set `CORS_ALLOWED_ORIGIN` au domaine exact du frontend production
2. Ajouter `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
3. Considerer `Strict-Transport-Security` si pas set par l'infrastructure edge Supabase

## 3.6 Rate Limiting

**Evaluation : BON avec limitations de design**

**Implementation** :
- Fonction PostgreSQL `check_rate_limit(p_key, p_limit, p_window_seconds)`
- Defaut : 10 requetes par 300 secondes (5 minutes) par scope+utilisateur
- Approche fenetre fixe avec UPSERT pour l'atomicite
- Table rate limits avec RLS active, tous privileges revoques de `public`, seul `service_role` peut executer

**Couverture** : Chaque endpoint data appelle `ensureDataRateLimit()`. Les endpoints admin appellent `checkRateLimit()` directement.

**Points forts** :
- Fail-closed : erreur DB throw 500
- Configurable via vars env
- Granularite par utilisateur, par scope

**Constats** :
- **Pas de rate limiting base IP** [MEDIUM] : Uniquement par utilisateur authentifie. Les requetes non-authentifiees (ex: tentatives de login) ne sont pas rate-limitees au niveau applicatif. Supabase Auth a des limites built-in pour les endpoints auth.
- **Algorithme fenetre fixe** [LOW] : Peut permettre un burst de trafic aux limites (jusqu'a 2x la limite)
- **Pas de nettoyage de la table rate limits** [LOW] : La table `rate_limits` accumule des entrees stale. Pas de job de nettoyage periodique ou purge basee sur TTL.
- **Pas de rate limit global par utilisateur** [LOW] : Les utilisateurs ont des limites separees par type d'action, pas de cap agrege.

## 3.7 Multi-tenancy (enforcement `agency_id`)

**Evaluation : FORT**

**Couche RLS (Database)** :
- Toutes les tables business ont RLS active
- Fonction `is_super_admin()` check `profiles.is_super_admin` via `SECURITY DEFINER`
- Fonction `is_member(agency_id)` check la table `agency_members`
- Entites avec `agency_id IS NULL` visibles par tous les utilisateurs authentifies (by design)
- Tables config agence restreintes a `super_admin` pour les ecritures
- Trigger `prevent_entity_agency_change` empeche les non-super_admin de changer agency_id

**Couche applicative (Edge Function)** :
- `ensureAgencyAccess()` check super_admin OU agency_id dans les memberships
- `ensureOptionalAgencyAccess()` gere les agency_id nullable (super_admin uniquement)
- `getEntityAgencyId()` fetch l'agency_id de l'entite avant de checker l'acces (empeche IDOR)

**Modele multi-tenancy en couches** :
```
Couche 1: RLS PostgreSQL (agency_id sur toutes les tables)
Couche 2: ensureAgencyAccess() dans les services backend
Couche 3: Trigger prevent_entity_agency_change
Couche 4: queryKeys parametres par agencyId (cache TanStack isole par agence)
```

**Lacune** : La couche 2 est bypassee pour les lectures Supabase directes. Seule la couche 1 protege.

**Risques potentiels de fuite tenant** :

1. **Entites avec `agency_id IS NULL`** [MEDIUM] : Visibles par TOUS les utilisateurs authentifies a travers tous les tenants. By design pour les entites pre-assignation, mais tout utilisateur authentifie peut voir les entites orphelines de n'importe quelle agence.

2. **`getInteractions.ts` (frontend)** query avec `.or(`agency_id.eq.${agencyId},agency_id.is.null`)`. Les utilisateurs voient les interactions sans agence de n'importe quel tenant. Le RLS enforce cela au niveau DB aussi, donc consistant, mais a revoir.

3. **RPC `hard_delete_agency`** [HIGH] : A `SECURITY DEFINER` mais PAS de GRANT/REVOKE explicite. Peut etre appele par n'importe quel role avec le privilege `EXECUTE`. En pratique uniquement invoque via route admin avec `requireSuperAdmin`, mais si appele directement via Supabase PostgREST (`supabase.rpc('hard_delete_agency', {...})`), n'importe quel utilisateur authentifie pourrait l'appeler. **Recommandation** : Ajouter `REVOKE ALL ON FUNCTION public.hard_delete_agency(uuid) FROM public; GRANT EXECUTE ON FUNCTION public.hard_delete_agency(uuid) TO service_role;`

## 3.8 Validation des inputs

**Evaluation : FORT**

Chaque route backend suit le meme pattern :
1. Parse du body JSON (avec catch pour JSON invalide)
2. Validation via schema Zod partage avec `safeParse()`
3. Passage des donnees validees a la fonction service
4. La fonction service re-valide l'acces agence et les rate limits

**Aucune validation manquante detectee sur aucun endpoint.**

| Route | Schema utilise | Auth requise |
|-------|---------------|--------------|
| `/admin/users` | `adminUsersPayloadSchema` | `requireSuperAdmin` |
| `/admin/agencies` | `adminAgenciesPayloadSchema` | `requireSuperAdmin` |
| `/data/entities` | `dataEntitiesPayloadSchema` | `requireAuth` |
| `/data/entity-contacts` | `dataEntityContactsPayloadSchema` | `requireAuth` |
| `/data/interactions` | `dataInteractionsPayloadSchema` | `requireAuth` |
| `/data/config` | `dataConfigPayloadSchema` | `requireAuth` |
| `/data/profile` | `dataProfilePayloadSchema` | `requireAuth` |

## 3.9 Injection SQL / Bypass RLS

**Evaluation : RISQUE FAIBLE**

**Pas de SQL brut dans le code applicatif.** Toutes les operations utilisent le client Supabase avec des requetes parametrees (`.eq()`, `.in()`, `.update()`, `.insert()`, `.select()`).

**Appels RPC** :
- `check_rate_limit(p_key, p_limit, p_window_seconds)` -- parametres generes cote serveur, pas controles par l'utilisateur. Sur.
- `hard_delete_agency(p_agency_id)` -- parametre UUID depuis schema valide. Sur.

**Usage service role** : Le backend utilise `getSupabaseAdmin()` (cle service role) qui **bypass toutes les policies RLS**. Utilise pour les operations admin, les queries cross-agency, les checks rate limit, la resolution du contexte auth.

**Constat [MEDIUM]** : Comme l'Edge Function utilise service_role pour TOUTES les operations DB (routes admin et data), le RLS est effectivement desactive pour tout le backend. Le controle d'acces applicatif dans `dataAccess.ts` est la SEULE protection. S'il y a un bug dans `ensureAgencyAccess()` ou `ensureOptionalAgencyAccess()`, des donnees d'autres tenants pourraient etre exposees.

**Recommandation** : Pour les routes data, creer un client Supabase par requete utilisant le token JWT de l'utilisateur au lieu de service_role. Cela active le RLS comme seconde couche de protection.

## 3.10 Revue securite des migrations

**53 fichiers de migration audites** dans `backend/migrations/`

**Mesures de securite cles** :
- RLS active sur TOUTES les tables
- Fonctions `SECURITY DEFINER` avec `SET search_path` explicite pour empecher l'injection de search_path
- Table rate limits : `REVOKE ALL FROM public` + `GRANT EXECUTE TO service_role`
- Triggers d'audit logging sur toutes les tables business
- Trigger `prevent_entity_agency_change`
- Contraintes uniques sur les numeros clients, combinaisons agency+label
- Contraintes CHECK pour l'integrite des donnees (checks trim, checks format)

**Ameliorations de securite a travers l'historique des migrations** :
- `202601151900` -- Restriction des tables config au super_admin uniquement
- `202601181200` -- Tables config totalement readonly pour non-super_admin
- `202601181240` -- Ajout RLS a la table rate_limits
- `202601181250` -- Comportement fail-closed rate limits
- `202601231400` -- Fix search_path sur toutes les fonctions
- `202601231410` -- Optimisation helpers RLS
- `202601231520` -- Renforcement definer search_path

**Constat** : La RPC `hard_delete_agency` (migration `20260211120000`) manque de GRANT/REVOKE.

## 3.11 Couverture OWASP Top 10

| Categorie OWASP | Statut | Notes |
|---|---|---|
| A01 Broken Access Control | **BON** | RLS + checks applicatifs, mais voir hard_delete_agency, utilisateurs bannis, bypass service_role |
| A02 Cryptographic Failures | **EXCELLENT** | JWT avec ES256, JWKS, pas de secrets en frontend |
| A03 Injection | **EXCELLENT** | Toutes les queries parametrees, pas de SQL brut |
| A04 Insecure Design | **BON** | Multi-tenant by design, mais entites null agency_id visibles par tous |
| A05 Security Misconfiguration | **MEDIUM** | CORS wildcard, headers manquants |
| A06 Vulnerable Components | **BON** | Versions de dependances pinnees |
| A07 Auth Failures | **BON** | Validation JWT forte, mais tokens non-revocables |
| A08 Data Integrity Failures | **BON** | Validation Zod des deux cotes, mais champs permissifs |
| A09 Logging & Monitoring | **BON** | Logs d'audit, journal d'erreurs, request IDs |
| A10 SSRF | **N/A** | Pas de fetch URL cote serveur |

---

# 4. Synthese & Plan d'action

## 4.1 Priorite HIGH (Fixes securite immediats)

| # | Constat | Fichier(s) | Effort |
|---|---------|------------|--------|
| 1 | CORS wildcard `*` par defaut en production | `backend/functions/api/app.ts` + env prod | 5 min |
| 2 | RPC `hard_delete_agency` manque REVOKE (callable par tout utilisateur authentifie via PostgREST) | Nouvelle migration | 10 min |
| 3 | Utilisateurs bannis/archives gardent un JWT valide jusqu'a expiration -- pas de check dans `resolveAuthContext()` | `backend/functions/api/middleware/auth.ts` | 30 min |
| 4 | Pas de handler 404 (casse CORS + contrat d'erreur JSON) | `backend/functions/api/app.ts` | 15 min |
| 5 | Headers de securite manquants (nosniff, frame-options) | `backend/functions/api/app.ts` middleware CORS | 10 min |

## 4.2 Priorite MEDIUM (Ameliorations architecture -- Court terme)

| # | Constat | Impact |
|---|---------|--------|
| 6 | Max-length sur tous les champs texte dans les schemas (notes, subject, timeline content, noms entreprise) | Defense contre les attaques payload |
| 7 | Schema explicite pour `addTimelineEvent.updates` au lieu de `z.record(z.string(), z.unknown())` | Validation defense-in-depth |
| 8 | Max-length sur `x-request-id` (128 chars) | Empecher l'injection de header |
| 9 | Middleware limite taille body (1MB) | Proteger la memoire de l'isolate Edge Function |
| 10 | Repliquer les validations metier frontend dans les schemas backend | Consistance frontend-backend |
| 11 | `useAddTimelineEvent` ajouter handler `onError` | Erreurs actuellement avaleees silencieusement |
| 12 | Toutes les operations DB backend utilisent service_role bypasse le RLS | `ensureAgencyAccess()` est la seule protection |
| 13 | Le frontend n'utilise PAS Hono RPC malgre l'export `AppType` | Type-safety end-to-end manquee |
| 14 | `getKnownCompanies` charge TOUTES les interactions en memoire | Anti-pattern performance |
| 15 | 2 requetes DB sequentielles par requete authentifiee (profil + memberships) | Goulot d'etranglement latence auth |
| 16 | Pas de rate limiting base IP pour les requetes non-authentifiees | Exposition brute-force login |

## 4.3 Priorite LOW (Renforcement)

| # | Constat |
|---|---------|
| 17 | Type `ErrorCode` echappatoire `(string & {})` affaiblit la securite compile-time |
| 18 | Validations metier frontend-only non repliquees dans le backend |
| 19 | Champ SIRET manque de validation de format (14 chiffres + Luhn) |
| 20 | Champ numero de telephone manque de validation de format |
| 21 | Pas de mecanisme de nettoyage de la table rate limits (entrees stale s'accumulent) |
| 22 | `auth_leaked_password_protection` toujours pas active dans Supabase |
| 23 | Biais modulo `randomInt(max)` dans la generation de mot de passe |
| 24 | `STATUS_CATEGORIES` hardcode, pas synchronise avec l'enum DB |
| 25 | Variables optionnelles `AppEnv` devraient etre non-optionnelles post-auth |
| 26 | Duplication code handlers de route (les 7 routes partagent un pattern de ~25 lignes) |
| 27 | `status` set a chaine vide dans `saveInteraction` dependant du trigger DB |
| 28 | Polling `ensureProfileAvailable` (750ms max) fragile sous charge |
| 29 | Caches au niveau module non invalides au signout |
| 30 | Echec silencieux du refresh token dans le frontend `getUserAccessToken()` |
| 31 | Duplication de code entre `requireAuth` et `requireSuperAdmin` |
| 32 | Pas de code d'erreur `CONTENT_TYPE_INVALID` dans le catalog |
| 33 | `useSaveInteraction` utilise le pipeline d'erreur manuel au lieu de `handleUiError` |

## 4.4 Patterns positifs (Points forts)

- **Algorithm allowlist JWT avec pre-flight header check** -- excellente defense contre les attaques de confusion d'algorithme
- **Controle de concurrence optimiste** pour les evenements timeline via `expected_updated_at` -> 409 CONFLICT
- **Rate limiting sur chaque route** avec comportement fail-closed en cas d'echec du check
- **Validation Zod a la couche route** avec schemas partages entre frontend et backend
- **Catalog d'erreurs avec reponses d'erreur structurees** validees par schema
- **Systeme d'anonymisation de suppression utilisateur** avec utilisateurs systeme par agence (`@cir.invalid`)
- **Tests d'integration couvrent la frontiere de securite complete** : CORS, auth, authz, acces cross-agency
- **Slug Edge Function unique** avec sous-routing Hono -- deploiement propre
- **Couche service orientee fonctions pures** avec client DB injecte -- testable
- **Service role Supabase** utilise uniquement cote serveur, jamais expose au frontend
- **memoryStorage** pour les tokens -- plus securise que localStorage contre XSS
- **Deduplication toast** (fenetre 1.5s via Sonner)
- **Journal d'erreurs** dans IndexedDB, exportable
- **Reporter externe pluggable** (`setErrorReporter` pour Sentry/LogRocket)
- **`request_id` preserve end-to-end** pour la tracabilite
- **queryKeys parametres par agencyId** -- cache TanStack isole par tenant
- **Generation de mot de passe CSPRNG** avec shuffle Fisher-Yates
- **Configuration fail-closed** -- vars env manquantes throw 500
- **Defense-in-depth** : RLS + checks d'acces applicatifs + trigger guards

## 4.5 Recommandations avancees 2026

1. **Client Supabase par requete scope par JWT utilisateur** : Au lieu de `getSupabaseAdmin()` partout, creer `getSupabaseForUser(jwt)` utilisant le token de l'utilisateur. Le RLS s'active automatiquement. Reserver service_role pour les ops admin uniquement.

2. **Pre-warming JWKS** : Au cold start, pre-fetch JWKS en background plutot qu'a la premiere requete. Reduit la latence P99.

3. **Concurrence structuree avec Deno** : Utiliser `AbortController` lie a `Deno.serve` pour annuler les requetes inflight pendant le shutdown.

4. **Zod v4 `pipe()` pour les transformations** : Au lieu de `z.string().trim()` + post-processing, utiliser `z.string().pipe(z.transform(...))` pour les champs SIRET, telephone.

5. **Edge Function streaming** : Pour les gros exports (logs d'audit), utiliser `ReadableStream` au lieu de tout charger en memoire.

6. **Revocation de token via check DB** : Stocker un timestamp `token_revoked_at` sur le profil. Dans `resolveAuthContext()`, si `iat < token_revoked_at`, rejeter le token. Permet une revocation instantanee sans attendre l'expiration du JWT.

7. **Coalescence de requetes** : Pour `resolveAuthContext()`, si 2 requetes arrivent avec le meme userId dans la meme milliseconde, dedupliquer la requete DB.

## 4.6 Couverture de tests

### Tests Backend

| Fichier de test | Tests | Couverture |
|-----------------|-------|------------|
| `adminUsers_test.ts` | 15 | Politique mot de passe, normalisation nom, display name |
| `auth_test.ts` | 5 | JWT valide/invalide, issuer, algorithme, extraction bearer |
| `dataAccess_test.ts` | 6 | Acces agence member/super_admin, edge cases |
| `errorHandler_test.ts` | 3 | Catalog lookup, fallback, request_id |
| `rateLimit_test.ts` | 4 | Config par defaut, type safety |
| `adminAgencies_test.ts` | 1 | Existence export uniquement |
| `api_integration_test.ts` | ~30 | CORS, auth, authz, CRUD complet, cross-agency |

**Total** : ~64 tests backend

### Lacunes de tests

1. `adminAgencies` : 1 test uniquement (existence export). Zero test unitaire de fonctions pures.
2. `dataConfig` : Pas de test unitaire pour `normalizeLabelList`, `syncStatuses`.
3. `dataInteractions` : Pas de test unitaire pour `normalizeInteractionUpdates` (la fonction critique de whitelist).
4. `dataEntities` : Pas de test unitaire pour la logique de conversion.
5. Test d'integration conditionne par `RUN_API_INTEGRATION=1` -- probablement pas execute en CI.

## 4.7 Commandes de verification

```bash
# Tests backend
deno test --allow-env --no-check --config backend/deno.json backend/functions/api

# Tests frontend
cd frontend && npx vitest run

# Lint + types
cd frontend && npm run lint && npm run typecheck

# Test d'integration (avec Supabase local)
RUN_API_INTEGRATION=1 deno test --allow-env --no-check --config backend/deno.json backend/functions/api

# Verifier CORS en prod (devrait etre rejete pour une origine malveillante)
curl -H "Origin: https://evil.com" -X OPTIONS <api-url>

# Verifier handler 404 (devrait retourner JSON structure avec headers CORS)
curl <api-url>/nonexistent
```
