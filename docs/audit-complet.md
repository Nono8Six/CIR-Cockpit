# Audit complet — CIR Cockpit

> Date : 2026-02-11 | Perimetre : backend + frontend + SQL + shared

---

## Table des matieres

1. [Synthese executive](#1-synthese-executive)
2. [Audit Backend](#2-audit-backend)
3. [Audit SQL & Schema Supabase](#3-audit-sql--schema-supabase)
4. [Inventaire des fonctions legacy](#4-inventaire-des-fonctions-legacy)
5. [Audit Frontend](#5-audit-frontend)
6. [Bugs & problemes de securite](#6-bugs--problemes-de-securite)
7. [Roadmap d'actions](#7-roadmap-dactions)

---

## 1. Synthese executive

### Scores

| Domaine | Score | Commentaire |
|---------|-------|-------------|
| Backend (Edge Functions) | **B+** (8.2/10) | Solide mais seulement 2 routes ; pas de routes donnees metier |
| Frontend (Services/Hooks) | **A-** (8.8/10) | Pipeline erreurs exemplaire, patterns TanStack Query propres |
| Frontend (Composants) | **B+** (8.3/10) | Bonne decomposition sauf ClientList/ProspectList |
| SQL / Schema | **A** (9.0/10) | RLS robuste, indexes complets, triggers bien penses |
| Securite globale | **B+** (8.4/10) | Bon modele multi-tenant ; quelques failles ponctuelles |
| Tests | **B-** (7.5/10) | Couverture unitaire OK, zero test d'integration |

### Top 5 problemes critiques

| # | Severite | Probleme | Localisation |
|---|----------|----------|--------------|
| 1 | HAUTE | String interpolation SQL dans `applyMemberships` | `backend/.../adminUsers.ts:233` |
| 2 | HAUTE | `hard_delete` agence sans transaction (5 etapes sequentielles) | `backend/.../adminAgencies.ts:162-166` |
| 3 | HAUTE | 10 services frontend font des mutations Supabase directes (pas d'Edge Function) | `frontend/src/services/clients/`, `entities/`, `interactions/`, `config/` |
| 4 | MOYENNE | HTTP 403 pour `AUTH_REQUIRED` (devrait etre 401) | `backend/.../auth.ts:106` |
| 5 | MOYENNE | Messages d'erreur en anglais dans `adminAgencies.ts` (catalog en francais) | `backend/.../adminAgencies.ts` |

### Top 5 points forts

| # | Point fort | Detail |
|---|-----------|--------|
| 1 | Pipeline d'erreurs | `normalizeError -> reportError -> notifyError` unifie front/back avec catalog francais |
| 2 | RLS multi-tenant | Toutes les tables filtrees par `agency_id`, helpers `STABLE` + `search_path = ''` |
| 3 | Audit logging | 7 tables auditees automatiquement via trigger `log_audit_event()` |
| 4 | TypeScript strict | Zero `any`, zero `!`, zero `@ts-ignore` dans tout le projet |
| 5 | Rate limiting | Infrastructure complete avec RPC fail-closed + configurable par env |

---

## 2. Audit Backend

### 2.1 Architecture actuelle

```
backend/functions/api/
  index.ts          -> Entrypoint Deno.serve
  app.ts            -> Config Hono, CORS, middleware chain
  types.ts          -> AppEnv, DbClient
  middleware/
    requestId.ts    -> UUID propagation
    auth.ts         -> JWT verification, Supabase clients, requireSuperAdmin
    errorHandler.ts -> httpError() factory, handleError() global
  routes/
    adminUsers.ts   -> POST /admin/users
    adminAgencies.ts -> POST /admin/agencies
  services/
    adminUsers.ts   -> CRUD utilisateurs, password, memberships
    adminAgencies.ts -> CRUD agences, hard delete cascade
    rateLimit.ts    -> RPC check_rate_limit wrapper
```

**Chaine de middleware :**
```
Request -> requestId -> CORS -> onError -> requireSuperAdmin -> Route -> Response
```

### 2.2 Fichier par fichier

---

#### `index.ts` (5 lignes)

```typescript
Deno.serve((req) => app.fetch(req));
```

- Entrypoint minimal, correct.
- Pas de configuration serveur (port, host) : gere par Supabase Edge Runtime.

**Verdict :** OK

---

#### `app.ts` (38 lignes)

**Responsabilites :** Config Hono, CORS custom, registration routes.

**Observations :**
- CORS custom via middleware inline (lignes 21-29), pas via `hono/cors` standard.
- `Access-Control-Allow-Methods: POST, OPTIONS` — pas de GET, PUT, DELETE.
- `CORS_ALLOWED_ORIGIN` configurable (defaut `*`).
- `app.onError()` delegue a `handleError()`.

**Problemes :**
- Le CORS est implemente a la main au lieu d'utiliser le middleware officiel Hono.
- Seulement `POST` autorise : quand on ajoutera des routes GET pour les reads, il faudra etendre.

**Verdict :** Fonctionnel, a moderniser.

---

#### `types.ts` (13 lignes)

```typescript
export type AppEnv = {
  Variables: {
    requestId: string;
    callerId?: string;
    db?: DbClient;
  };
};
```

**Observations :**
- `callerId` et `db` optionnels car set uniquement par `requireSuperAdmin`.
- Pas de type pour un middleware `requireAuth` (non-admin).

**Problemes :**
- Quand on ajoutera `requireAuth` pour les routes donnees, il faudra un type `AuthEnv` avec `userId` non-optionnel.

**Verdict :** OK pour l'instant, a etendre.

---

#### `middleware/requestId.ts` (11 lignes)

- Accepte `x-request-id` du client ou genere un UUID.
- Stocke dans `c.set('requestId')` + header reponse.

**Verdict :** Parfait, rien a changer.

---

#### `middleware/auth.ts` (129 lignes)

**Responsabilites :** Extraction bearer token, verification JWT via Supabase, check role super_admin, injection `db` et `callerId` dans le contexte.

**Flow JWT :**
1. `getAccessTokenFromHeaders()` : priorise `x-client-authorization` (token utilisateur) puis `Authorization` (token gateway).
2. `getSupabaseAuthGateway().verifyAccessToken(token)` : appelle `supabase.auth.getUser(token)`.
3. Query `profiles.role` via admin client pour verifier `super_admin`.

**Problemes identifies :**

| Ligne | Probleme | Severite |
|-------|----------|----------|
| 44-82 | Singletons `supabaseAdmin` / `supabaseAuthGateway` sans lifecycle ni refresh | MOYENNE |
| 67-73 | Pas de validation JWT locale (delegation complete a Supabase API) | BASSE |
| 106 | `throw httpError(403, 'AUTH_REQUIRED', ...)` — devrait etre 401 (Unauthorized) | MOYENNE |
| 110 | `throw httpError(403, 'AUTH_REQUIRED', 'Session invalide.')` — meme probleme, 401 | MOYENNE |

**Detail ligne 106 :**
```typescript
// ACTUEL (incorrect)
throw httpError(403, 'AUTH_REQUIRED', 'Authentification requise.');

// CORRECT
throw httpError(401, 'AUTH_REQUIRED', 'Authentification requise.');
```

HTTP 401 = "pas authentifie" (token manquant/invalide). HTTP 403 = "authentifie mais pas autorise" (role insuffisant). La ligne 122 utilise correctement 403 pour `AUTH_FORBIDDEN`.

**Verdict :** Solide mais 2 fixes necessaires (401, singleton lifecycle).

---

#### `middleware/errorHandler.ts` (58 lignes)

**Responsabilites :** Factory `httpError()`, normalisation, handler global avec catalog lookup.

**Flow :**
1. `httpError(status, code, message, details?)` cree une `Error` enrichie.
2. `handleError()` normalise → lookup catalog → reponse JSON.

```typescript
// Reponse type
{
  "request_id": "uuid",
  "ok": false,
  "error": "Message du catalog",
  "code": "ERROR_CODE",
  "details": "optionnel"
}
```

**Problemes :**

| Ligne | Probleme | Severite |
|-------|----------|----------|
| 8 | `code: string` au lieu de `ErrorCode` — pas de type-safety | BASSE |
| 22 | `const maybe = err as HttpError` — cast sans type guard | BASSE |

**Recommandation :** Typer `code` en `ErrorCode` pour que le compilateur detecte les codes invalides.

**Verdict :** Bon pattern, ameliorations mineures.

---

#### `routes/adminUsers.ts` (31 lignes)

**Pattern RPC :**
```
POST /admin/users
  -> requireSuperAdmin middleware
  -> parse JSON body
  -> validate with adminUsersPayloadSchema (Zod)
  -> handleAdminUsersAction(db, callerId, requestId, parsed.data)
  -> return JSON result
```

**Actions supportees :** `create`, `set_role`, `set_memberships`, `reset_password`, `archive`, `unarchive`.

**Verdict :** Pattern propre et reutilisable.

---

#### `routes/adminAgencies.ts` (31 lignes)

Pattern identique a `adminUsers.ts`.

**Actions supportees :** `create`, `rename`, `archive`, `unarchive`, `hard_delete`.

**Verdict :** OK.

---

#### `services/adminUsers.ts` (420 lignes)

**Le plus gros fichier backend. 420 lignes = au-dessus du seuil recommande (~150 lignes).**

**Responsabilites :**
- Generation/validation mot de passe (`generateTempPassword`, `validatePasswordPolicy`, `ensurePassword`)
- Normalisation noms (`normalizePersonName`, `buildDisplayName`)
- CRUD utilisateurs (`createUserAccount`, `updateProfile`, `updateAuthPassword`, `updateAuthBan`)
- Gestion memberships (`applyMemberships` avec modes `replace`/`add`/`remove`)
- Orchestrateur `handleAdminUsersAction` (switch sur action)

**Points forts :**
- Pure functions exportees pour testing (`validatePasswordPolicy`, `normalizePersonName`, etc.)
- `ensureProfileAvailable()` avec polling (5 tentatives x 150ms) pour attendre le trigger DB.
- `ensureAgenciesExist()` verifie l'existence avant l'association.
- Rate limiting systematique.

**BUG CRITIQUE — Ligne 233 :**

```typescript
// ACTUEL (risque injection)
const inFilter = `(${agencyIds.map((id) => `"${id}"`).join(',')})`;
const { error } = await db
  .from('agency_members')
  .delete()
  .eq('user_id', userId)
  .not('agency_id', 'in', inFilter);

// CORRECT (API PostgREST native)
const { error } = await db
  .from('agency_members')
  .delete()
  .eq('user_id', userId)
  .not('agency_id', 'in', `(${agencyIds.join(',')})`);
```

Les `agencyIds` sont valides via `normalizeAgencyIds()` + `ensureAgenciesExist()`, donc le risque reel est faible. Mais le pattern de string interpolation est un anti-pattern qu'il faut corriger par principe.

**Autres observations :**
- Ligne 342 : `must_change_password: state === 'created' ? true : undefined` — pourrait etre simplifie.
- `handleAdminUsersAction` retourne `Record<string, unknown>` — pourrait etre type plus strictement.

**Verdict :** Fonctionnel et bien teste, 1 fix securite necessaire. A decouper si le fichier grandit encore.

---

#### `services/adminAgencies.ts` (173 lignes)

**Responsabilites :** CRUD agences + hard delete cascade.

**Problemes :**

| Ligne | Probleme | Severite |
|-------|----------|----------|
| 19, 27, 35-36, 48, etc. | Messages en anglais ("Agency not found", "Failed to lookup agency") | MOYENNE |
| 162-166 | `hard_delete` : 5 etapes sequentielles sans transaction | HAUTE |

**Detail hard_delete :**

```typescript
case 'hard_delete': {
  await ensureAgencyExists(db, data.agency_id);      // 1. Verifier existence
  await clearAgencyReferences(db, data.agency_id);    // 2. Nullifier profiles + entities
  await deleteAgencyDependencies(db, data.agency_id); // 3. Supprimer membres + config
  await deleteAgency(db, data.agency_id);             // 4. Supprimer agence
  // Si l'etape 3 echoue, l'etape 2 a deja modifie les profiles/entities
  // -> Etat inconsistant sans rollback possible
}
```

**Solution recommandee :** Wrapper dans une transaction Supabase :

```typescript
const { error } = await db.rpc('hard_delete_agency', { p_agency_id: agencyId });
```

Ou utiliser le pattern Supabase `db.rpc()` avec une function PL/pgSQL transactionnelle.

**Verdict :** Fonctionnel, 2 fixes necessaires (messages FR + transaction).

---

#### `services/rateLimit.ts` (32 lignes)

```typescript
export const checkRateLimit = async (prefix: string, callerId: string): Promise<boolean> => {
  const rateLimitKey = `${prefix}:${callerId}:${RATE_LIMIT_WINDOW_SECONDS}`;
  const { data } = await getSupabaseAdmin().rpc('check_rate_limit', { ... });
  return data === true;
};
```

- Defaults: 10 requetes / 300 secondes (configurable via env).
- RPC `check_rate_limit` est fail-closed (retourne false en cas d'erreur).

**Verdict :** Parfait.

---

### 2.3 Tests backend

| Fichier | Tests | Couverture |
|---------|-------|-----------|
| `adminUsers_test.ts` | 20 | Helpers purs (password, noms, schemas) |
| `auth_test.ts` | 7 | Extraction bearer token |
| `errorHandler_test.ts` | 8 | Error mapping, catalog lookup |
| `adminAgencies_test.ts` | 1 | Verification export uniquement |
| `rateLimit_test.ts` | 2 | Validation constantes |

**Total : 38 tests unitaires.**

**Gaps critiques :**
- Zero test d'integration (route -> middleware -> service -> DB)
- Zero test pour `hard_delete` cascade
- Zero test pour `applyMemberships` modes replace/add/remove avec DB
- `adminAgencies_test.ts` ne teste que l'existence de l'export

---

## 3. Audit SQL & Schema Supabase

### 3.1 Vue d'ensemble

- **51 fichiers de migration** (2026-01-15 a 2026-02-10)
- **16 tables** principales
- **22 fonctions** PL/pgSQL
- **35+ triggers**
- **51+ indexes** (dont 5 partiels)
- **Schema multi-tenant** : tout filtre par `agency_id` via RLS

### 3.2 Tables principales

| Table | Colonnes cles | RLS | Audit |
|-------|---------------|-----|-------|
| `agencies` | id, name, archived_at | is_member / is_super_admin | Oui |
| `profiles` | id, email, role, first_name, last_name, must_change_password | auth.uid() | Non (trigger specifique) |
| `agency_members` | user_id, agency_id | is_member / is_super_admin | Oui |
| `entities` | id, entity_type, name, agency_id, client_number, account_type | is_member / is_super_admin / creator | Oui |
| `entity_contacts` | id, entity_id, first_name, last_name, email, phone | via entity.agency_id | Oui |
| `interactions` | id, entity_id, contact_id, status, status_id, timeline, channel | is_member / creator | Oui |
| `interaction_drafts` | id, user_id, agency_id, form_type, data | user_id = auth.uid() | Non |
| `agency_statuses` | id, agency_id, label, category, is_terminal, sort_order | is_member | Oui |
| `agency_services` | id, agency_id, label | is_member | Oui |
| `agency_entities` | id, agency_id, label | is_member | Oui |
| `agency_families` | id, agency_id, label | is_member | Oui |
| `agency_interaction_types` | id, agency_id, label | is_member | Non |
| `audit_logs` | id, entity_table, entity_id, action, actor_id, agency_id, metadata | has_role(['super_admin', 'agency_admin']) | Non |
| `rate_limits` | key, count, window_start | service_role uniquement | Non |

### 3.3 Fonctions helper (securite)

| Fonction | Volatilite | Security Definer | Search Path |
|----------|-----------|-----------------|-------------|
| `is_super_admin()` | STABLE | OUI | `''` |
| `is_member(uuid)` | STABLE | OUI | `''` |
| `has_agency_role(uuid, user_role[])` | STABLE | OUI | `''` |
| `has_role(user_role[])` | STABLE | OUI | `''` |
| `user_role()` | STABLE | OUI | `''` |
| `check_rate_limit(text, int, int)` | - | OUI | `''` |
| `audit_actor_id()` | STABLE | - | `''` |

Toutes les fonctions SECURITY DEFINER sont protegees contre l'injection de search_path (corrige dans migrations 202601231400, 202601231520).

### 3.4 RLS policies — Pattern type

```sql
-- SELECT : membre de l'agence OU super_admin OU createur
CREATE POLICY "entities_select" ON entities FOR SELECT USING (
  is_member(agency_id) OR is_super_admin() OR created_by = auth.uid()
  OR agency_id IS NULL  -- entites sans agence accessibles a tous
);

-- INSERT : membre de l'agence OU super_admin
-- UPDATE/DELETE : meme pattern avec contraintes supplementaires
```

**Escape hatch `agency_id IS NULL` :**
- Intentionnel : permet les entites partagees (fournisseurs generiques).
- Risque maitrise : tout utilisateur authentifie peut lire ces entites.
- Recommandation : documenter les regles de gouvernance.

### 3.5 Indexes — Couverture FK

**Resultat : 100% des cles etrangeres ont un index.** Aucun manque detecte.

**Indexes partiels (performance) :**

| Table | Colonnes | Condition | Usage |
|-------|----------|-----------|-------|
| `interactions` | (agency_id, last_action_at DESC) | `status_is_terminal = false` | Interactions actives |
| `entities` | (lower(client_number)) | `client_number IS NOT NULL` | Unicite numero client |
| `entities` | (archived_at) | - | Filtre actif/archive |
| `entity_contacts` | (archived_at) | - | Filtre actif/archive |

### 3.6 Triggers — Vue d'ensemble

| Categorie | Nombre | Tables concernees |
|-----------|--------|-------------------|
| `set_updated_at` | 12 | Toutes les tables metier |
| `log_audit_event` | 9 | agencies, entities, entity_contacts, interactions, agency_members, agency_statuses, agency_services, agency_entities, agency_families |
| Prevention identite/role | 3 | profiles (role, email, created_at) |
| Prevention agency_id | 2 | entities, clients (legacy) |
| Sync status | 2 | interactions (status<->status_id), agency_statuses (label) |
| Champs audit interaction | 1 | interactions (updated_by, last_action_at) |
| Auth sync | 2 | auth.users -> profiles (create, email update) |

### 3.7 Problemes SQL identifies

| # | Severite | Probleme | Detail |
|---|----------|----------|--------|
| 1 | MOYENNE | Cout RLS avec sous-queries imbriquees | `interactions` et `entity_contacts` font `EXISTS(SELECT 1 FROM entities WHERE is_member(...))` par ligne |
| 2 | MOYENNE | Croissance illimitee `audit_logs` | Pas de politique de retention definie |
| 3 | BASSE | Champs denormalises (status, status_is_terminal) | Depends des triggers ; divergence si trigger echoue |
| 4 | BASSE | `interactions.agency_id` nullable | Derive de `entity.agency_id` ; queries directes sans JOIN manquent ces lignes |
| 5 | INFO | `audit_logs.entity_table` polymorphe (text) | Pas de type-safety cote DB, mais OK cote app |

### 3.8 Evolution du schema

| Phase | Date | Changement |
|-------|------|-----------|
| Init | 2026-01-15 | Schema initial : agencies, profiles, interactions, config tables, RLS |
| Securite | 2026-01-15→23 | Rate limiting, search_path hardening, RLS optimization |
| Status | 2026-01-23 | status_id FK, triggers sync, is_terminal pour Kanban |
| Clients | 2026-01-26 | Tables clients/contacts, role enum, drop legacy is_super_admin |
| Drafts | 2026-02-01 | interaction_drafts, interaction_types, account_type enum |
| Entities | 2026-02-03 | Refactoring clients -> entities unifie (Client/Prospect/Supplier) |
| Profils | 2026-02-10 | first_name/last_name avec backfill |

---

## 4. Inventaire des fonctions legacy

### 4.1 Definition "legacy"

Une fonction **legacy** est un service frontend qui fait une **mutation directe** vers Supabase (insert/update/delete via PostgREST) au lieu de passer par une Edge Function Hono. Les lectures directes via PostgREST sont considerees **normales** (protegees par RLS).

### 4.2 Mutations directes (a migrer)

| # | Fichier | Operation | Table | Risque | Priorite |
|---|---------|-----------|-------|--------|----------|
| 1 | `services/clients/saveClient.ts` | insert/update | `entities` | Pas de validation serveur | HAUTE |
| 2 | `services/clients/setClientArchived.ts` | update | `entities` | Pas d'audit log serveur | MOYENNE |
| 3 | `services/entities/saveEntity.ts` | insert/update | `entities` | Pas de validation serveur | HAUTE |
| 4 | `services/entities/saveEntityContact.ts` | insert/update | `entity_contacts` | Pas de validation serveur | HAUTE |
| 5 | `services/entities/deleteEntityContact.ts` | delete | `entity_contacts` | Pas d'audit log serveur | MOYENNE |
| 6 | `services/entities/convertEntityToClient.ts` | update | `entities` | Logique metier critique | HAUTE |
| 7 | `services/interactions/saveInteraction.ts` | upsert | `interactions` | Pas de validation serveur | HAUTE |
| 8 | `services/interactions/updateInteractionOptimistic.ts` | update | `interactions` | Optimistic locking cote client | MOYENNE |
| 9 | `services/interactions/addTimelineEvent.ts` | update (via #8) | `interactions` | Integrite timeline | MOYENNE |
| 10 | `services/config/saveAgencyConfig.ts` | upsert/delete | `agency_*` | Config critique multi-table | HAUTE |
| 11 | `services/auth/setProfilePasswordChanged.ts` | update | `profiles` | Securite (flag mot de passe) | HAUTE |

### 4.3 Mutations directes (a garder)

| # | Fichier | Operation | Table | Justification |
|---|---------|-----------|-------|---------------|
| 1 | `services/interactions/saveInteractionDraft.ts` | upsert | `interaction_drafts` | Donnees temporaires, auto-save frequent |
| 2 | `services/interactions/deleteInteractionDraft.ts` | delete | `interaction_drafts` | Cleanup de draft, non critique |
| 3 | `services/agency/setProfileActiveAgencyId.ts` | update | `profiles` | Preference utilisateur simple, RLS suffit |

### 4.4 Lectures directes (normales, pas de migration)

| Fichier | Table | Pattern |
|---------|-------|---------|
| `services/clients/getClients.ts` | `entities` | SELECT via RLS |
| `services/clients/getClientById.ts` | `entities` | SELECT via RLS |
| `services/entities/getProspects.ts` | `entities` | SELECT via RLS |
| `services/entities/getEntityContacts.ts` | `entity_contacts` | SELECT via RLS |
| `services/entities/getEntitySearchIndex.ts` | `entities` | SELECT via RLS |
| `services/interactions/getInteractions.ts` | `interactions` | SELECT via RLS |
| `services/interactions/getInteractionDraft.ts` | `interaction_drafts` | SELECT via RLS |
| `services/agency/getAgencies.ts` | `agencies` | SELECT via RLS |
| `services/agency/getActiveAgencyId.ts` | `profiles` | SELECT via RLS |
| `services/agency/getAgencyMemberships.ts` | `agency_members` | SELECT via RLS |
| `services/config/getAgencyConfig.ts` | `agency_*` tables | SELECT via RLS |
| `services/admin/getAdminUsers.ts` | `profiles` + `agency_members` | SELECT admin |
| `services/admin/getAuditLogs.ts` | `audit_logs` | SELECT admin |

---

## 5. Audit Frontend

### 5.1 Client API Edge Function

**`services/api/client.ts`** — Pattern exemplaire.

```
safeInvoke(path, body, parseResponse)
  -> fetch(url, { method: 'POST', headers, body })
  -> parse JSON response
  -> mapEdgeError si erreur
  -> parseResponse callback
```

Headers geres :
- `Authorization` : gateway JWT (si configure)
- `x-client-authorization` : user access token
- `apikey` : Supabase anon key (si pas publishable)

**Verdict :** Excellent, pret pour les nouvelles routes.

### 5.2 Pipeline d'erreurs

```
                       ┌─────────────┐
                       │ Source erreur│
                       │ (Supabase,  │
                       │  Edge, Zod) │
                       └──────┬──────┘
                              │
                    ┌─────────▼─────────┐
                    │  normalizeError() │  Unifie en AppError
                    └─────────┬─────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │ reportError │   │ notifyError │   │   return    │
    │ (journal +  │   │ (Sonner     │   │  AppError   │
    │  reporter)  │   │  toast)     │   │  au caller  │
    └─────────────┘   └─────────────┘   └─────────────┘
```

**Mappers specialises :**
- `mapPostgrestError` : status 401/403/404/409/429/502/503 -> ErrorCode
- `mapEdgeError` : payload API -> ErrorCode
- `mapSupabaseAuthError` : codes auth Supabase -> ErrorCode
- `mapAdminDomainError` : erreurs admin -> ErrorCode action-specific
- `mapSettingsDomainError` : erreurs config -> ErrorCode action-specific

**Verdict :** Architecture d'erreurs exemplaire.

### 5.3 Services — Patterns observes

**Pattern A : Edge Function (admin) — MODERNE**
```typescript
// services/admin/adminUsersCreate.ts
export const adminUsersCreate = (payload) =>
  invokeAdminFunction<Response>('admin-users', { action: 'create', ...payload }, 'Erreur...');
```

**Pattern B : Supabase direct (donnees) — LEGACY**
```typescript
// services/clients/saveClient.ts
export const saveClient = (payload) =>
  safeAsync((async () => {
    const supabase = requireSupabaseClient();
    const { data, error } = await supabase.from('entities').update({...}).select('*').single();
    if (error) throw mapPostgrestError(error, { operation: 'write', resource: 'le client', status });
    return data;
  })(), (error) => normalizeError(error, '...'));
```

Le Pattern B est bien structure (ResultAsync, error mapping, normalisation) mais ne beneficie pas de la validation serveur ni du rate limiting.

### 5.4 Hooks — Audit

**71 hooks custom.** Patterns releves :

| Pattern | Hooks concernes | Verdict |
|---------|----------------|---------|
| `useQuery` + `useNotifyError` | useAgencyConfig, useClientsPanelState, useDashboardState | OK |
| `useMutation` + `handleUiError` | useSaveClient, useSaveProspect, useArchiveUser, etc. | OK |
| `useQuery` sans error handling | - | Non detecte (tous geres) |
| `useState` pour server state | - | Non detecte (TanStack Query partout) |

**Probleme mineur dans `useAgencyConfig.ts` :**
```typescript
// Ligne 30-37 : double mapping
const appError = mapSettingsDomainError(query.error, {...});
handleUiError(appError, appError.message, {...});
// handleUiError appelle normalizeError qui re-detecte isAppError -> pas de double normalisation
// MAIS reportError est appele deux fois si l'erreur etait deja reportee
```

Impact reel : faible (dedup par fingerprint dans le journal).

### 5.5 State management

| Couche | Technologie | Usage |
|--------|------------|-------|
| Server state | TanStack Query v5 | Cache, mutations, retry, invalidation |
| Session | React Context | User courant, agence active |
| Erreurs | Zustand | errorStore (journal, lastError) |
| Formulaires | React Hook Form v7 | Validation Zod, draft auto-save |

**Aucun state management superflu detecte.** Zero Redux, zero MobX.

### 5.6 Query client

```typescript
// queryClient.ts
const NON_RETRYABLE_CODES = new Set([
  'AUTH_REQUIRED', 'AUTH_INVALID_CREDENTIALS', 'AUTH_FORBIDDEN',
  'AUTH_WEAK_PASSWORD', 'AUTH_SAME_PASSWORD',
  'VALIDATION_ERROR', 'NOT_FOUND', 'CONFLICT'
]);
// retry: max 3, exponential backoff (1s, 2s, 4s, cap 10s)
// mutations: retry 0
```

**Verdict :** Configuration solide et reflechie.

### 5.7 Composants — Points d'attention

| Composant | Lignes | Probleme |
|-----------|--------|----------|
| `ClientList.tsx` | ~246 | Depasse 150 lignes ; virtualisation + TanStack Table inline |
| `ProspectList.tsx` | ~234 | Meme pattern que ClientList (duplication) |
| `UserMembershipDialog.tsx` | ~158 | Borderline |
| Autres composants | <150 | Conformes |

**Recommandation :** Extraire un composant `VirtualizedDataGrid<T>` reutilisable pour `ClientList` et `ProspectList`.

### 5.8 Schemas Zod partages

| Schema | Location | Usage front | Usage back |
|--------|----------|-------------|------------|
| `auth.schema.ts` | `shared/schemas/` | Login form validation | - |
| `user.schema.ts` | `shared/schemas/` | Admin user forms | `adminUsers.ts` route validation |
| `agency.schema.ts` | `shared/schemas/` | Admin agency forms | `adminAgencies.ts` route validation |
| `client.schema.ts` | `shared/schemas/` | Client forms | Non utilise backend (legacy) |
| `prospect.schema.ts` | `shared/schemas/` | Prospect forms | Non utilise backend (legacy) |
| `contact.schema.ts` | `shared/schemas/` | Contact forms | Non utilise backend (legacy) |
| `interaction.schema.ts` | `shared/schemas/` | Interaction forms | Non utilise backend (legacy) |
| `interactionSchema.ts` | `frontend/src/schemas/` | Draft validation RHF | - |

**Observation :** Les schemas `client`, `prospect`, `contact`, `interaction` ne sont utilises que cote frontend. Quand les routes Edge Function seront creees, il faudra les brancher cote backend aussi.

### 5.9 Config (vite, tsconfig, eslint)

| Fichier | Statut | Observations |
|---------|--------|-------------|
| `tsconfig.json` | OK | strict: true, noUnusedLocals, noUnusedParameters |
| `eslint.config.js` | OK | --max-warnings=0, jsx-a11y configure |
| `vite.config.ts` | OK | Code splitting optimise, path aliases `@/*` |
| `package.json` | OK | Dependencies a jour, scripts corrects |

---

## 6. Bugs & problemes de securite

### 6.1 Par severite

#### HAUTE

| # | Fichier:Ligne | Description | Impact | Fix |
|---|---------------|-------------|--------|-----|
| H1 | `backend/.../adminUsers.ts:233` | String interpolation pour filtre `NOT IN` | Injection SQL theorique (attenue par validation amont) | Utiliser l'API PostgREST native `.not('agency_id', 'in', `(${ids.join(',')})`)` |
| H2 | `backend/.../adminAgencies.ts:162-166` | `hard_delete` 5 etapes sans transaction | Etat inconsistant si une etape echoue | Creer une RPC PL/pgSQL transactionnelle `hard_delete_agency(uuid)` |
| H3 | `frontend/src/services/` (10 fichiers) | Mutations directes Supabase sans Edge Function | Pas de validation serveur, pas de rate limiting, pas d'audit log cote serveur | Migrer vers nouvelles routes Edge Function |

#### MOYENNE

| # | Fichier:Ligne | Description | Impact | Fix |
|---|---------------|-------------|--------|-----|
| M1 | `backend/.../auth.ts:106,110` | HTTP 403 au lieu de 401 pour `AUTH_REQUIRED` | Semantique HTTP incorrecte | Changer en `httpError(401, ...)` |
| M2 | `backend/.../adminAgencies.ts` | Messages d'erreur en anglais | Inconsistance avec le catalog francais | Traduire tous les messages |
| M3 | `backend/.../auth.ts:44-82` | Singletons Supabase clients sans lifecycle | Connexions potentiellement perimees en long-running | Ajouter un mecanisme de recreation periodique |
| M4 | SQL `audit_logs` | Pas de politique de retention | Croissance illimitee de la table | Implementer archivage > 1 an |
| M5 | SQL `interactions.agency_id` nullable | Queries sans JOIN manquent des lignes | Resultats incomplets possibles | Documenter le pattern ou ajouter une VIEW |

#### BASSE

| # | Fichier:Ligne | Description |
|---|---------------|-------------|
| B1 | `backend/.../errorHandler.ts:8` | `code: string` au lieu de `ErrorCode` (pas de type-safety) |
| B2 | `backend/.../errorHandler.ts:22` | `as HttpError` cast sans type guard |
| B3 | `shared/errors/types.ts:68` | `ErrorCode = ... | (string & {})` permet n'importe quel string |
| B4 | `frontend/.../useAgencyConfig.ts:30-37` | Double mapping erreur (impact mineur via dedup fingerprint) |
| B5 | SQL champs denormalises | `interactions.status`, `status_is_terminal` depends de triggers |

---

## 7. Roadmap d'actions

### Phase 1 — Fixes securite & coherence (1-2 jours)

| # | Action | Fichier(s) | Effort |
|---|--------|-----------|--------|
| 1.1 | Fix string interpolation `inFilter` | `adminUsers.ts:233` | 15 min |
| 1.2 | Creer RPC `hard_delete_agency()` transactionnelle | Nouvelle migration SQL + `adminAgencies.ts` | 2h |
| 1.3 | Corriger HTTP 401 vs 403 | `auth.ts:106,110` | 15 min |
| 1.4 | Traduire messages EN -> FR dans adminAgencies | `adminAgencies.ts` (8 messages) | 30 min |
| 1.5 | Typer `httpError.code` en `ErrorCode` | `errorHandler.ts` | 30 min |
| 1.6 | Migrer `setProfilePasswordChanged` vers Edge Function | Nouvelle route + service backend | 2h |

### Phase 2 — Nouvelles routes Edge Function donnees (3-5 jours)

**Objectif :** Deplacer les mutations metier du frontend vers le backend.

| # | Action | Nouvelles routes | Services frontend a adapter |
|---|--------|------------------|-----------------------------|
| 2.1 | Creer middleware `requireAuth` | `middleware/auth.ts` | - |
| 2.2 | Route `POST /data/entities` | actions: `save`, `archive`, `convert_to_client` | `saveClient`, `saveEntity`, `setClientArchived`, `convertEntityToClient` |
| 2.3 | Route `POST /data/entity-contacts` | actions: `save`, `delete` | `saveEntityContact`, `deleteEntityContact` |
| 2.4 | Route `POST /data/interactions` | actions: `save`, `add_timeline_event` | `saveInteraction`, `addTimelineEvent` |
| 2.5 | Route `POST /data/config` | actions: `save` | `saveAgencyConfig` |
| 2.6 | Adapter services frontend | Remplacer `requireSupabaseClient()` par `safeInvoke()` | 10 fichiers |
| 2.7 | Brancher schemas Zod cote backend | Utiliser `shared/schemas/` dans les nouvelles routes | 4 schemas |

**Architecture cible :**

```
backend/functions/api/
  app.ts                    <- ajouter registration nouvelles routes
  middleware/
    auth.ts                 <- ajouter requireAuth (non-admin)
  routes/
    adminUsers.ts           (existant)
    adminAgencies.ts        (existant)
    dataEntities.ts         (NOUVEAU)
    dataEntityContacts.ts   (NOUVEAU)
    dataInteractions.ts     (NOUVEAU)
    dataConfig.ts           (NOUVEAU)
  services/
    adminUsers.ts           (existant)
    adminAgencies.ts        (existant)
    dataEntities.ts         (NOUVEAU)
    dataEntityContacts.ts   (NOUVEAU)
    dataInteractions.ts     (NOUVEAU)
    dataConfig.ts           (NOUVEAU)
    rateLimit.ts            (existant)
```

**Middleware `requireAuth` :**
```
1. Extraire bearer token
2. Verifier via Supabase auth
3. Verifier is_member(agency_id) OU is_super_admin()
4. Set c.set('callerId'), c.set('db'), c.set('agencyId')
```

### Phase 3 — Ameliorations & tests (2-3 jours)

| # | Action | Detail |
|---|--------|--------|
| 3.1 | Ajouter tests d'integration backend | Routes + middleware + service (mock DB ou test DB) |
| 3.2 | Ajouter politique retention audit_logs | Migration SQL : archivage > 1 an |
| 3.3 | Extraire `VirtualizedDataGrid<T>` | Composant reutilisable pour ClientList/ProspectList |
| 3.4 | Ajouter error boundaries par feature | Dashboard, ClientsPanel, InteractionsPanel |
| 3.5 | Moderniser CORS (middleware Hono standard) | `app.ts` |
| 3.6 | Documenter le pattern `agency_id IS NULL` | CLAUDE.md ou docs/ |

### Phase 4 — Suppression code legacy (1 jour)

Apres validation des nouvelles routes en Phase 2 :

| # | Action | Fichier(s) a supprimer/simplifier |
|---|--------|-----------------------------------|
| 4.1 | Supprimer les imports `requireSupabaseClient` des services migres | 10 fichiers |
| 4.2 | Supprimer les helpers `normalizePayload` dupliques | `saveClient.ts`, `saveEntity.ts`, `saveEntityContact.ts` (la validation est cote backend) |
| 4.3 | Simplifier `updateInteractionOptimistic` | Deleguer l'optimistic locking au backend |
| 4.4 | Nettoyer les fichiers vides | Verifier qu'aucun import ne reference les anciens patterns |

---

> **Fin de l'audit.** Ce document doit etre mis a jour apres chaque phase de la roadmap.

---

## 8. Relecture Codex (corrections factuelles + completions)

> Date de revalidation : 2026-02-11  
> Cette section fait foi en cas d'ecart avec les sections precedentes.

### 8.1 Corrections factuelles (repo + MCP Supabase)

| Sujet | Valeur initiale dans ce document | Valeur reverifiee |
|---|---:|---:|
| Tests backend Deno | 38 | **40** |
| Migrations appliquees (projet Supabase) | 51 | **50** |
| Fichiers migrations locaux (repo) | non precise | **53** |
| Tables `public` | 16 | **14** |
| Fonctions `public` | 22 | **23** |
| Triggers | 35+ | **30 objets trigger** (`52` lignes `information_schema.triggers`) |

Preuves (MCP/commandes executees) :
1. `mcp__supabase__list_migrations` -> 50 versions appliquees.
2. `mcp__supabase__execute_sql` -> `public_table_count=14`, `public_function_count=23`, `trigger_object_count=30`.
3. `rg -n "Deno\\.test\\(" backend/functions/api` + `deno test ...` -> 40 tests.
4. `Get-ChildItem backend/migrations -File | Measure-Object` -> 53 fichiers locaux.

### 8.2 Etat Edge Functions et legacy (etat runtime)

Fonctions deployees et actives sur le projet :
1. `api` (v6)
2. `admin-users` (v3)
3. `admin-agencies` (v3)
4. `create-user-and-membership` (v5)

Point important :
1. Le frontend admin actuel appelle `functions/v1/api/...` via `frontend/src/services/admin/invokeAdminFunction.ts`.
2. Les slugs legacy existent encore au runtime, mais ne sont plus le chemin principal frontend admin.

### 8.3 Mutations frontend directes (inventaire corrige)

Le comptage precedent "10 services" etait incomplet.  
Scan actuel (`rg` sur `.insert/.update/.upsert/.delete`) :

1. 13 fichiers de mutation metier directe Supabase (hors `notify.ts` et `memoryStorage.ts`).
2. Repartition recommandee:
   - A migrer en priorite Edge API:
     - `frontend/src/services/clients/saveClient.ts`
     - `frontend/src/services/clients/setClientArchived.ts`
     - `frontend/src/services/entities/saveEntity.ts`
     - `frontend/src/services/entities/saveEntityContact.ts`
     - `frontend/src/services/entities/deleteEntityContact.ts`
     - `frontend/src/services/entities/convertEntityToClient.ts`
     - `frontend/src/services/interactions/saveInteraction.ts`
     - `frontend/src/services/interactions/updateInteractionOptimistic.ts`
     - `frontend/src/services/config/saveAgencyConfig.ts`
     - `frontend/src/services/auth/setProfilePasswordChanged.ts`
   - A conserver en direct (choix explicite):
     - `frontend/src/services/interactions/saveInteractionDraft.ts`
     - `frontend/src/services/interactions/deleteInteractionDraft.ts`
     - `frontend/src/services/agency/setProfileActiveAgencyId.ts`

### 8.4 Nuance securite sur `applyMemberships` (adminUsers)

Le point signale sur `adminUsers.ts` est valide comme **anti-pattern de construction de filtre**, mais :
1. Le risque d'injection est fortement reduit car les IDs sont valides en UUID et verifies (`zod` + checks agence).
2. Le niveau retenu ici devient **MOYEN** (qualite/securite defensive), et non blocant critique immediat.
3. Une correction reste recommandee pour robustesse et lisibilite.

### 8.5 JWT / verify_jwt : position pro 2026 (corrigee)

Constat docs Supabase (MCP + Context7) :
1. Le mode `verify_jwt` historique reste supporte, mais les patterns modernes recommandent une verification explicite dans le code de la fonction.
2. L'approche enterprise ciblee est :
   - `verify_jwt=false` pour la fonction `api`,
   - middleware applicatif explicite (verification JWT via `auth.getClaims` ou JWKS `jose`),
   - suppression du contournement `VITE_SUPABASE_EDGE_GATEWAY_JWT` en frontend.

Etat actuel du projet :
1. Mode operationnel avec `verify_jwt=true` + header `x-client-authorization`.
2. Ce mode est stable, mais **pas le design final le plus propre** a long terme.

### 8.6 Recommandation d'architecture (Hono) corrigee

La modularite ne doit pas imposer d'emblee plusieurs slugs Edge Functions.  
Selon les bonnes pratiques Hono (`app.route()`), la trajectoire recommandee est :

1. **Conserver un slug unique `api`** pour limiter la complexite de deploiement/auth/CORS.
2. Decouper en sous-routeurs Hono :
   - `/auth/*`
   - `/admin/*`
   - `/data/*`
   - `/config/*`
3. N'envisager des slugs separes qu'apres preuves de besoin (isolation de SLA, scaling ou blast radius).

### 8.7 Completion: findings live Supabase (advisors)

Security advisor:
1. `auth_leaked_password_protection` = WARN (constat conserve, accepte hors scope produit intranet B2B depuis le 2026-02-22).
2. Remediation officielle:  
   https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Performance advisor:
1. Plusieurs indexes "unused" signales (INFO uniquement).
2. Action recommandee: verifier `pg_stat_user_indexes` sur periode representative avant suppression.

### 8.8 Roadmap corrigee (pragmatique)

1. ~~**P0**: corriger les messages EN de `backend/functions/api/services/adminAgencies.ts` en FR + harmoniser `ACTION_REQUIRED`.~~ **FAIT** (7 messages traduits EN→FR)
2. ~~**P0**: rendre `hard_delete` transactionnel (RPC SQL unique ou strategy compensating stricte).~~ **FAIT** (RPC `hard_delete_agency` + migration SQL)
3. ~~**P1**: migrer les 10 mutations metier directes vers `api` routeurs `/data/*`.~~ **FAIT** (5 routes + 5 services backend + 10 services frontend migres + error mapper + code mort supprime)
4. **P1**: decommission legacy (`admin-users`, `admin-agencies`, `create-user-and-membership`) apres verification des appels restants.
5. **P2**: passer a auth middleware explicite (cible `verify_jwt=false`) et retirer `VITE_SUPABASE_EDGE_GATEWAY_JWT`.
6. **P2**: ajouter tests d'integration backend route->service->db sur les actions critiques.

---

## 9. Journal d'implementation

| Date | Action | Fichier(s) | Statut |
|------|--------|-----------|--------|
| 2026-02-11 | P0.1 Messages EN→FR adminAgencies | `services/adminAgencies.ts` | FAIT |
| 2026-02-11 | P0.4 Fix HTTP 401 vs 403 | `middleware/auth.ts` | FAIT |
| 2026-02-11 | P0.2 Fix inFilter string interpolation | `services/adminUsers.ts:233` | FAIT |
| 2026-02-11 | P0.3 RPC hard_delete_agency transactionnelle | `migrations/20260211120000_hard_delete_agency_rpc.sql` + `services/adminAgencies.ts` | FAIT |
| 2026-02-11 | P0.5 Tests backend P0 | 40/40 tests passent | FAIT |
| 2026-02-11 | P1.1 Middleware requireAuth | `middleware/auth.ts` | FAIT |
| 2026-02-11 | P1.2 Schemas data payload | `shared/schemas/data.schema.ts` + `shared/schemas/index.ts` | FAIT |
| 2026-02-11 | P1.3 Routes + services backend data | `routes/data*.ts` + `services/data*.ts` (5 paires) | FAIT |
| 2026-02-11 | P1.4 Enregistrer routes dans app.ts | `app.ts` (5 imports + 5 registrations) | FAIT |
| 2026-02-11 | P1.5 Adapter 10 services frontend | `saveClient`, `setClientArchived`, `saveEntity`, `saveEntityContact`, `deleteEntityContact`, `convertEntityToClient`, `saveInteraction`, `updateInteractionOptimistic`, `addTimelineEvent`, `saveAgencyConfig`, `setProfilePasswordChanged` | FAIT |
| 2026-02-11 | P1.5 Creer mapDataDomainError | `services/errors/mapDataDomainError.ts` | FAIT |
| 2026-02-11 | P1.5 Fix z.record Zod v4 | `shared/schemas/data.schema.ts:93` — `z.record(z.unknown())` → `z.record(z.string(), z.unknown())` | FAIT |
| 2026-02-11 | P1.5 Verification | typecheck: 0 erreurs, lint: 0 warnings, vitest: 101/101, deno test: 40/40 | FAIT |
| 2026-02-11 | P2.4 Nettoyage code mort | Supprime `saveAgencyConfig.helpers.ts`, verifie 0 imports morts dans les 10 services migres | FAIT |

---

## 10. Verification factuelle (Codex)

> Date de verification : 2026-02-11  
> Cette section verifie les notes d'implementation par execution reelle (repo + MCP Supabase).

### 10.1 Statut des claims P0/P1/P2.4

| Claim | Statut | Preuve |
|---|---|---|
| P0.1 Messages EN->FR `adminAgencies.ts` | OK | `backend/functions/api/services/adminAgencies.ts` (messages FR lignes 18, 27, 34, 48, 68, 77, 89, 115) |
| P0.2 Fix interpolation `inFilter` | OK | `backend/functions/api/services/adminUsers.ts:233-240` (pattern `currentIds` + `.in('agency_id', toDelete)`) |
| P0.3 RPC `hard_delete_agency` implementee en local | OK (local) | `backend/migrations/20260211120000_hard_delete_agency_rpc.sql` + `backend/functions/api/services/adminAgencies.ts:75` |
| P0.4 HTTP 401 vs 403 dans auth | OK | `backend/functions/api/middleware/auth.ts:106,111,125,130` en 401; `AUTH_FORBIDDEN` reste 403 |
| P0.5 Backend tests 40/40 | OK | `deno test --allow-env --no-check --config backend/deno.json backend/functions/api` |
| P1.1 Middleware `requireAuth` | OK | `backend/functions/api/middleware/auth.ts:100-117` |
| P1.2 `shared/schemas/data.schema.ts` | PARTIEL | 5 payload schemas presents, mais **4** `discriminatedUnion` + **1** `object` (`dataConfigPayloadSchema`) |
| P1.3 5 routes + 5 services data | OK (local) | `backend/functions/api/routes/data*.ts` + `backend/functions/api/services/data*.ts` |
| P1.4 Enregistrement routes dans `app.ts` | OK | `backend/functions/api/app.ts:40-44` |
| P1.5 Migration services frontend vers `safeInvoke` | OK (local) | 11 fichiers verifies (clients/entities/interactions/config/profile) sans `requireSupabaseClient` |
| P2.4 Suppression code mort helper config | OK | `frontend/src/services/config/saveAgencyConfig.helpers.ts` supprime |

### 10.2 Ecarts bloquants detectes

| Sujet | Statut | Detail |
|---|---|---|
| Conformite erreurs frontend (`check:error-compliance`) | OK | 7 services migres corriges (`createAppError`), scan conforme et script `check:error-compliance` vert |
| Deploiement Supabase routes `/data/*` | KO (non deploye) | Appels `POST /functions/v1/api/data/*` repondent `404 Route introuvable.` sur l'environnement `rbjtrcorlezvocayluok` |
| Migration SQL `hard_delete_agency` appliquee sur Supabase | OK | Migration `20260211150816 hard_delete_agency_rpc` appliquee + `to_regprocedure('public.hard_delete_agency(uuid)')` resolu |

### 10.3 Validation commandes executees

1. `pnpm --dir frontend run typecheck` -> OK
2. `pnpm --dir frontend run lint -- --max-warnings=0` -> OK
3. `pnpm --dir frontend run test -- --run` -> OK (101/101)
4. `pnpm --dir frontend run check:error-compliance` -> OK
5. `deno test --allow-env --no-check --config backend/deno.json backend/functions/api` -> OK (40/40)

### 10.4 Conclusion operationnelle

1. Le chantier est **largement implemente en local** (P0/P1/P2.4).
2. Le statut "tout fait et verifie" n'est **pas encore vrai en environnement Supabase deploye**.
3. Avant de declarer termine:
   - deployer la fonction `api` mise a jour,
   - decommissionner les fonctions legacy (`admin-users`, `admin-agencies`, `create-user-and-membership`) apres verification stricte.

### 10.5 Contre-verification runtime (MCP + HTTP live)

> Execution de verification supplementaire : 2026-02-11 (apres section 10.4)

#### 10.5.1 Backend/API deploye vs local

| Point | Resultat | Preuve |
|---|---|---|
| Fonction `api` deployee | OK | `mcp__supabase__list_edge_functions` -> slug `api` actif, version `6` |
| Fonctions legacy encore actives | KO (decommission non fait) | `mcp__supabase__list_edge_functions` -> `admin-users`, `admin-agencies`, `create-user-and-membership` encore `ACTIVE` |
| Sous-routes `/data/*` en production | KO | `curl POST /functions/v1/api/data/{profile,entities,entity-contacts,interactions,config}` -> `404 Not Found` |
| Endpoint admin historique | OK | `curl POST /functions/v1/api/admin/users` -> reponse HTTP (403 avec token anon, endpoint existe) |

#### 10.5.2 JWT, CORS et middleware

| Point | Resultat | Preuve |
|---|---|---|
| `verify_jwt` sur les fonctions actives | A corriger (cible archi P2 non atteinte) | `mcp__supabase__list_edge_functions` -> `verify_jwt=true` pour `api` et fonctions legacy |
| Preflight CORS `OPTIONS` sur `/api/admin/users` | OK (non bloquant au moment du test) | `curl -X OPTIONS ...` avec/sans `Authorization` -> `200 OK` + headers CORS |
| Pattern cible enterprise 2026 (docs Supabase) | A appliquer | Context7 `/supabase/supabase`: recommandation de verification JWT explicite dans la fonction (`auth.getClaims`/JWKS), `verify_jwt=false` configurable par fonction |

#### 10.5.3 Base de donnees et profils

| Point | Resultat | Preuve |
|---|---|---|
| Colonnes `profiles.first_name/last_name` presentes | OK | `mcp__supabase__list_tables` -> table `public.profiles` contient `first_name`, `last_name` |
| Migration `add_profiles_first_last_name` | OK (deployee) | `mcp__supabase__list_migrations` -> `20260210190712 add_profiles_first_last_name` |
| Requete REST profils (select avec `first_name,last_name`) | OK au moment du test | `curl GET /rest/v1/profiles?...` -> `200 OK` |
| Migration RPC `hard_delete_agency` | OK | `mcp__supabase__list_migrations` -> `20260211150816 hard_delete_agency_rpc` + `to_regprocedure('public.hard_delete_agency(uuid)')` non null |

#### 10.5.4 Validations qualite executees

1. `pnpm --dir frontend run typecheck` -> OK
2. `pnpm --dir frontend run lint -- --max-warnings=0` -> OK
3. `pnpm --dir frontend run test -- --run` -> OK (101/101)
4. `pnpm --dir frontend run test:e2e` -> OK (14 passed, 2 skipped)
5. `pnpm --dir frontend run check:error-compliance` -> OK
6. `deno test --allow-env --no-check --config backend/deno.json backend/functions/api` -> OK (40/40)

#### 10.5.5 Verdict consolide

1. **Etat local**: implementation avancee et tests globalement verts.
2. **Etat production Supabase**: incomplet sur l'axe API modulaire (`/data/*`) + decommission legacy.
3. **Point bloquant release**: deploiement effectif de la fonction `api` (routes `/data/*` toujours `404`).

### 10.6 Reverification prod apres redeploiement API (2026-02-11)

#### 10.6.1 Statut final cible P0 -> P1.5 (prod)

| Sujet | Statut final | Preuves |
|---|---|---|
| Deploiement `/functions/v1/api/data/*` | OK | `mcp__supabase__list_edge_functions` -> `api` version `13`, hash `466380feaf6c60b2afde095c62ca8988eed264160d891cb5d6cb3a54ddfac654`, entrypoint `source/supabase/functions/api/index.ts`; `curl POST /api/data/{entities,entity-contacts,interactions}` -> `401 AUTH_REQUIRED` (plus de `404`) |
| RPC `hard_delete_agency(uuid)` | OK | `mcp__supabase__list_migrations` -> `20260211150816 hard_delete_agency_rpc`; `select to_regprocedure('public.hard_delete_agency(uuid)')` -> `hard_delete_agency(uuid)` |
| Conformite erreurs frontend | OK | `pnpm --dir frontend run check:error-compliance` -> `Error compliance check passed.` |
| Decommission legacy (`admin-users`, `admin-agencies`, `create-user-and-membership`) | OK | `mcp__supabase__list_edge_functions` -> seul slug `api` actif; legacy absentes |

#### 10.6.2 Runtime HTTP/CORS (prod)

1. Verification routes POST:
   - `POST /functions/v1/api/admin/users` -> `401 Unauthorized` (`Missing authorization header`) avec endpoint resolu.
   - `POST /functions/v1/api/admin/agencies` -> `401 Unauthorized` (`Missing authorization header`) avec endpoint resolu.
   - `POST /functions/v1/api/data/entities` -> `401 Unauthorized` (`Missing authorization header`) avec endpoint resolu.
   - `POST /functions/v1/api/data/entity-contacts` -> `401 Unauthorized` (`Missing authorization header`) avec endpoint resolu.
   - `POST /functions/v1/api/data/interactions` -> `401 Unauthorized` (`Missing authorization header`) avec endpoint resolu.
   - `POST /functions/v1/api/data/config` -> `401 Unauthorized` (`Missing authorization header`) avec endpoint resolu.
   - `POST /functions/v1/api/data/profile` -> `401 Unauthorized` (`Missing authorization header`) avec endpoint resolu.
2. Verification preflight:
   - `OPTIONS /functions/v1/api/{admin/users,admin/agencies,data/*}` -> `200 OK`.
   - Headers CORS presents: `Access-Control-Allow-Origin: *` et `Access-Control-Allow-Methods: POST, OPTIONS`.
3. Configuration fonction:
   - `verify_jwt=false` confirme sur `api` (MCP Supabase).

#### 10.6.3 Validations techniques executees (re-run 2026-02-12)

1. `pnpm --dir frontend run typecheck` -> OK
2. `pnpm --dir frontend run lint -- --max-warnings=0` -> OK
3. `pnpm --dir frontend run test -- --run` -> OK (101/101)
4. `pnpm --dir frontend run test:e2e` -> OK (14 passed, 2 skipped)
5. `pnpm --dir frontend run check:error-compliance` -> OK
6. `rg -n "console\\.error\\(|toast\\.error\\(|throw new Error\\(" frontend/src` -> 5 matches attendus (tests + `notify.ts` autorise)
7. `rg -n -s "<select(\\s|>)" frontend/src` -> `NO_NATIVE_SELECT_MATCH`
8. `deno test --allow-env --no-check --config backend/deno.json backend/functions/api` -> OK (40/40)
9. Probe authentifiee (session super_admin) :
   - `POST /functions/v1/api/{admin/users,admin/agencies,data/entities,data/entity-contacts,data/interactions,data/config,data/profile}` avec body `{}` -> `400 INVALID_PAYLOAD` (coherent, aucune route `404`/`500` restante)

#### 10.6.4 Conclusion de stabilisation

1. **Corrige en prod**: blocage principal `/functions/v1/api/data/*` en `404` elimine.
2. **Reste non-bloquant constate**:
   - les tests e2e `admin-settings-p07` restent `skipped` (selecteur de tab admin), alors que les endpoints admin sont bien resolves en runtime (`/admin/users`, `/admin/agencies` -> `400 INVALID_PAYLOAD` avec session valide).

### 10.7 Avancement P2 auth explicite + integration backend (2026-02-14)

#### 10.7.1 Implementations P2

1. Backend auth migre vers verification JWT explicite `jose + JWKS` dans `backend/functions/api/middleware/auth.ts`.
2. Priorite headers mise a jour: `Authorization` prioritaire, fallback `x-client-authorization`.
3. Frontend simplifie: suppression de `VITE_SUPABASE_EDGE_GATEWAY_JWT` et envoi direct du token utilisateur (`Authorization`).
4. Suite integration backend ajoutee (mode opt-in) dans `backend/functions/api/integration/api_integration_test.ts`:
   - CORS `OPTIONS` sur toutes les routes
   - `401 AUTH_REQUIRED` sans token
   - `403 AUTH_FORBIDDEN` utilisateur non-admin sur `/admin/*`
   - `400 INVALID_PAYLOAD` avec token valide + body invalide
   - parcours valides `/data/*` (profile/entities/entity-contacts/interactions/config)
5. Execution locale documentee pour l'integration backend (sans dependance GitHub Actions).

#### 10.7.2 Validations executees

1. `pnpm --dir frontend run typecheck` -> OK
2. `pnpm --dir frontend run lint -- --max-warnings=0` -> OK
3. `pnpm --dir frontend run test -- --run` -> OK (101/101)
4. `pnpm --dir frontend run test:e2e` -> OK (14 passed, 2 skipped)
5. `pnpm --dir frontend run check:error-compliance` -> OK
6. `deno test --allow-env --no-check --config backend/deno.json backend/functions/api` -> OK (43 passed, 7 ignored)

### 10.8 Revalidation P0 fiabilite/lint (2026-02-15)

#### 10.8.1 Correctifs appliques

1. **Dette `deno lint` eliminee** sur `backend/functions/api`:
   - imports inline (`https://`, `jsr:`) remplaces par imports bare specifier;
   - import maps alignees dans `deno.json` et `backend/deno.json`;
   - alias ajoutes: `@hono/hono`, `@supabase/supabase-js`, `@supabase/functions-js/`, `std/assert`.
2. **Suppression des castings faibles dans les routes data**:
   - retrait de `as any` sur `upsert` interactions;
   - retrait des `as unknown as Record<string, unknown>` dans `dataEntities` et `dataInteractions`;
   - normalisation explicite des updates optimistes interactions (`status`, `status_id`, `order_ref`, `reminder_at`, `notes`, `entity_id`, `contact_id`, `status_is_terminal`, `mega_families`).
3. **Nettoyage lint no-unused-vars**:
   - parametres non utilises renommes en `_callerId` dans `dataEntities`, `dataEntityContacts`, `dataConfig`.

#### 10.8.2 Verifications executees (2026-02-15)

1. Backend:
   - `deno lint backend/functions/api` -> **OK** (`Checked 27 files`)
   - `deno check --config backend/deno.json backend/functions/api/index.ts` -> **OK**
   - `deno test --allow-env --no-check --config backend/deno.json backend/functions/api` -> **OK** (`43 passed, 0 failed, 7 ignored`)
2. Frontend:
   - `pnpm --dir frontend run typecheck` -> **OK**
   - `pnpm --dir frontend run lint -- --max-warnings=0` -> **OK**
   - `pnpm --dir frontend run test:run` -> **OK** (`106/106`)
   - `pnpm --dir frontend run test:e2e` -> **OK** (`14 passed, 2 skipped`)
   - `pnpm --dir frontend run check:error-compliance` -> **OK**
   - `pnpm --dir frontend run build` -> **OK**
3. Securite dependances:
   - `cd frontend && pnpm audit --audit-level=high --omit=dev` -> **0 vuln**
   - `pnpm audit --audit-level=high` (racine) -> **0 vuln**

#### 10.8.3 Runtime Supabase (controle de coherence)

1. `mcp__supabase__list_edge_functions`:
   - slug actif: `api`
   - version: `18`
   - `verify_jwt=false`
   - entrypoint: `source/supabase/functions/api/index.ts`
2. Probes HTTP anonymes:
   - `POST /functions/v1/api/{admin/users,admin/agencies,data/*}` -> `401` attendu (auth requise)
   - `OPTIONS /functions/v1/api/{admin/users,admin/agencies,data/*}` -> `200` + CORS (`Access-Control-Allow-Origin=*`, `Allow-Methods=POST, OPTIONS`)

#### 10.8.4 Statut roadmap (focus P0)

1. **P0.1/P0.2/P0.3/P0.4/P0.5**: maintenus **OK**.
2. **Nouveau P0 ferme**: gate `deno lint` backend passe.
3. Prochain jalon recommande: attaquer **P1 integration backend sans CI** (runbook strict + execution manuelle des tests integration en environnement dedie).

### 10.9 Mode sans CI active (2026-02-15)

1. Politique active: quality gate manuel obligatoire via `docs/qa-runbook.md`.
2. `AGENTS.md` impose la lecture du runbook avant chaque prompt de travail LLM.
3. Chaque livraison doit contenir un "Rapport QA Manuel (Sans CI)" avec PASS/FAIL explicite.

### 10.10 Cloture P2 - Contrat auth strict + E2E admin (2026-02-15)

> Cette section complete les points historiques precedents et fait foi pour l'etat final P2.

#### 10.10.1 Contrat auth HTTP final

1. Backend `requireAuth` et `requireSuperAdmin` n'acceptent plus le fallback `x-client-authorization`.
2. Le header supporte pour l'auth applicative est `Authorization: Bearer <token>`.
3. CORS API aligne:
   - `Access-Control-Allow-Headers` n'expose plus `x-client-authorization`.
4. Frontend `safeInvoke` n'envoie plus `x-client-authorization`.

#### 10.10.2 Couverture integration backend

La suite `backend/functions/api/integration/api_integration_test.ts` couvre desormais explicitement:
1. `OPTIONS` CORS sur toutes les routes, avec verification absence de `x-client-authorization` dans les headers autorises.
2. `401 AUTH_REQUIRED` sans token.
3. `401 AUTH_REQUIRED` avec seul `x-client-authorization`.
4. `403 AUTH_FORBIDDEN` utilisateur non-admin sur `/admin/*`.
5. `400 INVALID_PAYLOAD` avec token valide + payload invalide.
6. Parcours valides `/data/*` (profile/entities/entity-contacts/interactions/config).

#### 10.10.3 E2E admin dedie

1. `frontend/e2e/admin-settings-p07.spec.ts` utilise un compte admin dedie:
   - `E2E_ADMIN_EMAIL`
   - `E2E_ADMIN_PASSWORD`
2. Le `skip` conditionnel sur absence d'acces admin dans la spec a ete retire.
3. Le pre-requis est explicite: les variables admin doivent etre configurees dans `frontend/.env.e2e`.

#### 10.10.4 Statut roadmap P2

1. P2 auth explicite: **FAIT**.
2. P2 suppression fallback legacy `x-client-authorization`: **FAIT**.
3. P2 integration backend route->service->db renforcee: **FAIT**.
4. P2 durcissement E2E admin (compte dedie, plus de skip role silencieux): **FAIT**.

### 10.11 Avancement P3.1/P3.2/P3.3 - durcissement multi-tenant + contrat erreur strict (2026-02-15)

#### 10.11.1 Durcissement auth/data backend

1. `requireAuth` hydrate desormais un `authContext` complet (`userId`, `role`, `agencyIds`, `isSuperAdmin`) en plus de `callerId`.
2. Les routes `/data/*` consomment `authContext` (plus seulement `callerId`).
3. Nouveau module `backend/functions/api/services/dataAccess.ts`:
   - `ensureAgencyAccess` / `ensureOptionalAgencyAccess` (controle d'appartenance agence),
   - `ensureDataRateLimit` (rate limit data par action),
   - resolution agence de ressource (`getEntityAgencyId`, `getContactEntityId`).
4. Services data durcis:
   - `dataEntities`: blocage cross-agence sur `save/archive/convert_to_client`.
   - `dataEntityContacts`: blocage cross-agence sur `save/delete`.
   - `dataInteractions`: blocage cross-agence sur `save/add_timeline_event`.
   - `dataConfig`: blocage cross-agence sur sync config.
   - `dataProfile`: rate limit applique.

#### 10.11.2 Contrat d'erreur edge strict partage front/back

1. Ajout schema partage `shared/schemas/edge-error.schema.ts`.
2. `handleError()` backend aligne sur ce contrat et valide le payload erreur via schema.
3. `mapEdgeError()` frontend parse desormais le payload via schema partage (fallback status map si payload legacy/invalide).
4. `safeInvoke()` frontend passe le payload brut au mapper, avec detection stricte des reponses invalides.
5. Script `frontend/scripts/check-error-compliance.mjs` etendu:
   - verification que tous les `httpError('<CODE>')` backend existent dans `shared/errors/types.ts` et `shared/errors/catalog.ts`.

#### 10.11.3 Couverture tests renforcee

1. Integration backend:
   - ajout test `POST data routes forbid cross-agency mutations for non super-admin users`.
   - enrichissement du scenario valid data:
     - `archive` entity,
     - `convert_to_client`,
     - `add_timeline_event`,
     - validation `CONFIG_INVALID` categorie status invalide.
2. Unit backend:
   - ajout `backend/functions/api/services/dataAccess_test.ts`.
3. Unit frontend:
   - mise a jour `mapEdgeError.test.ts` + cas payload legacy hors contrat.

#### 10.11.4 Verification execution (runbook manuel sans CI)

1. Backend:
   - `deno lint backend/functions/api` -> OK.
   - `deno check --config backend/deno.json backend/functions/api/index.ts` -> OK.
   - `deno test --allow-env --no-check --config backend/deno.json backend/functions/api` -> OK (49 pass, 0 fail, 9 ignored).
2. Frontend:
   - `pnpm run typecheck` -> OK.
   - `pnpm run lint -- --max-warnings=0` -> OK.
   - `pnpm run test:run` -> OK (107/107).
   - `pnpm run check:error-compliance` -> OK.
   - `pnpm run build` -> OK.
   - `pnpm run test:e2e` -> OK (16/16).
3. Runtime Supabase:
   - deploy `api` effectue via CLI (`version 20`, `verify_jwt=false`).
   - probes:
     - `POST /functions/v1/api/data/{entities,entity-contacts,interactions}` -> `401` (pas de `404`),
     - `OPTIONS /functions/v1/api/data/entities` -> `200` + CORS,
     - `POST` avec seul `x-client-authorization` -> `401 AUTH_REQUIRED`.
4. Integration opt-in runtime:
   - `RUN_API_INTEGRATION=1 deno test .../integration/api_integration_test.ts` -> OK (9/9).

### 10.12 Avancement P3.4/P3.6/P3.7 - stack 2026 + hardening DB retention (2026-02-15)

#### 10.12.1 P3.4 Modernisation stack

1. Frontend upgrades:
   - `react` / `react-dom` -> `19.2.4`
   - `@tanstack/react-query` -> `5.90.21`
   - `zod` -> `4.3.6`
   - `@supabase/supabase-js` -> `2.95.3`
2. Deno import maps synchronisees:
   - `deno.json`
   - `backend/deno.json`
3. Cohesion schema timeline:
   - `shared/schemas/data.schema.ts` impose `id/date/type/content` sur les events timeline.
   - test integration backend ajuste (`add_timeline_event` avec `id` UUID).

#### 10.12.2 P3.6 Hardening RLS `agency_system_users`

1. Migration ajoutee:
   - `backend/migrations/20260215150000_agency_system_users_rls_policies.sql`
2. Policies explicites en place:
   - `SELECT`, `INSERT`, `UPDATE`, `DELETE` reservees au `super_admin`.
3. Verification SQL:
   - plus aucune table `public` avec RLS active et 0 policy.

#### 10.12.3 P3.7 Retention `audit_logs` (> 1 an)

1. Migration ajoutee:
   - `backend/migrations/20260215153000_audit_logs_retention_policy.sql`
2. Implementations:
   - table archive `public.audit_logs_archive`,
   - policy `audit_logs_archive_select` alignee au pattern admin/super_admin,
   - fonction batch `public.archive_audit_logs_older_than(...)`,
   - fonction orchestratrice `public.run_audit_logs_retention(...)`,
   - grant d'execution limite a `service_role` (pas `anon` / pas `authenticated`),
   - job `pg_cron` quotidien `audit_logs_retention_daily` (`20 3 * * *`).
3. Verification runtime DB (MCP Supabase):
   - migration `audit_logs_retention_policy` appliquee,
   - extension `pg_cron` installee,
   - job `cron.job` present,
   - execution manuelle `select public.run_audit_logs_retention()` -> `0` ligne archivee (etat courant).

#### 10.12.4 QA runbook executee (sans CI)

1. Frontend:
   - `pnpm run typecheck` -> OK
   - `pnpm run lint -- --max-warnings=0` -> OK
   - `pnpm run test:run` -> OK (107/107)
   - `pnpm run check:error-compliance` -> OK
   - `pnpm run build` -> OK
   - `pnpm run test:e2e` -> OK (16/16)
2. Backend:
   - `deno lint backend/functions/api` -> OK
   - `deno check --config backend/deno.json backend/functions/api/index.ts` -> OK
   - `deno test --allow-env --no-check --config backend/deno.json backend/functions/api` -> OK (49 pass, 0 fail, 9 ignored)
   - integration runtime opt-in:
     - chargement env `backend/.env`
     - `RUN_API_INTEGRATION=1 deno test .../integration/api_integration_test.ts` -> OK (9/9)
3. Runtime API:
   - `POST /functions/v1/api/data/entities` -> `401` (pas de `404`)
   - `OPTIONS /functions/v1/api/data/entities` -> `200`
   - `POST` avec seul `x-client-authorization` -> `401`
   - `list_edge_functions` -> `api` actif, `verify_jwt=false`, version `21`.

#### 10.12.5 Reste P3 recommande

1. Conserver la preuve `WARN` advisor pour `auth_leaked_password_protection` comme risque accepte hors scope (intranet B2B, decision 2026-02-22).
2. Revue indexes "unused" sur fenetre d'observation representative avant suppression (advisor performance en `INFO`).
