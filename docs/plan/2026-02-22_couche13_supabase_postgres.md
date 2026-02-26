# 2026-02-22 - Couche 13 Supabase Postgres (Baseline Perf + RLS)

## 1) Contexte

- Projet Supabase cible: `rbjtrcorlezvocayluok` (`CIR_Cockpit`)
- Mode execution: prod direct, sans branche Supabase
- Skills appliques:
  - `supabase-postgres-best-practices`
  - `systematic-debugging`
  - `pnpm`

## 2) Baseline avant changements

### 2.1 Runtime/API

- `list_edge_functions`:
  - slug `api`: `ACTIVE`
  - `verify_jwt=false`
  - entrypoint `source/supabase/functions/api/index.ts`

### 2.2 Advisors

- Security:
  - `auth_leaked_password_protection` = `WARN` (constate en baseline; accepte hors scope apres arbitrage produit intranet B2B du 2026-02-22)
- Performance:
  - 18 indexes `unused` identifies

### 2.3 Index stats

- `pg_stat_user_indexes` confirme `idx_scan=0` sur les 18 indexes cibles avant operation.

### 2.4 RLS/Grants

- Policies `agency_interaction_types_*` et `interaction_drafts_*` encore en role `public`.
- Routine `set_audit_actor(uuid)` executable par `PUBLIC/anon/authenticated/service_role/postgres`.

## 3) Migrations appliquees

### 3.1 SQL repo

1. `backend/migrations/20260222110000_layer13_drop_unused_indexes_lot1.sql`
2. `backend/migrations/20260222113000_layer13_drop_unused_indexes_lot2.sql`
3. `backend/migrations/20260222120000_layer13_rls_policy_and_grants_hardening.sql`
4. `backend/migrations/20260222121000_layer13_recreate_fk_safety_indexes.sql`

### 3.2 Migrations en prod (MCP apply_migration)

1. `20260222175617 / 20260222110000_layer13_drop_unused_indexes_lot1`
2. `20260222175755 / 20260222113000_layer13_drop_unused_indexes_lot2`
3. `20260222175830 / 20260222120000_layer13_rls_policy_and_grants_hardening`
4. `20260222180406 / 20260222121000_layer13_recreate_fk_safety_indexes`

## 4) Classification indexes unused (decision complete)

### 4.1 Supprimes et maintenus supprimes (9)

1. `idx_audit_logs_archive_created_at`
2. `interaction_drafts_user_id_idx`
3. `interaction_drafts_updated_at_idx`
4. `idx_rate_limits_window_start`
5. `idx_interactions_active`
6. `idx_interactions_status`
7. `idx_entities_name_search`
8. `idx_entities_entity_type`
9. `idx_entity_contacts_last_name_search`

Justification:
- indexes purement secondaires/search sans couverture FK necessaire;
- `idx_scan=0` confirme;
- rollback disponible (`docs/plan/2026-02-22_layer13_rollback_lot1.sql`, `docs/plan/2026-02-22_layer13_rollback_lot2.sql`).

### 4.2 Conserves (restaures) pour couverture FK (9)

1. `idx_audit_logs_archive_actor_id`
2. `idx_audit_logs_archive_agency_id`
3. `interaction_drafts_agency_id_idx`
4. `idx_profiles_active_agency_id`
5. `idx_interactions_contact_id`
6. `idx_interactions_created_by`
7. `idx_interactions_entity_id`
8. `idx_interactions_status_id_only`
9. `idx_interactions_updated_by`

Justification:
- apres suppression initiale, advisor performance remonte `unindexed_foreign_keys`;
- reintroduction immediate pour eviter regression sur maintenance FK;
- arbitrage: prioriser integrite/perf FK plutot que suppression mecanique.

## 5) Durcissement RLS/Grants

### 5.1 Policies

- `agency_interaction_types_*`: roles passes de `public` a `authenticated`.
- `interaction_drafts_*`: roles passes de `public` a `authenticated`.

### 5.2 Routines sensibles

- `set_audit_actor(uuid)`:
  - `REVOKE` sur `public`, `anon`, `authenticated`
  - `GRANT EXECUTE` uniquement a `service_role` (+ `postgres` owner)

### 5.3 Search path definer/functions

- verification `pg_proc.proconfig`:
  - fonctions `SECURITY DEFINER` critiques en `search_path=""`
  - `safe_uuid` / `jwt_sub` conservent aussi `search_path=""`

## 6) Verifications runtime roles (bloquant)

### 6.1 HTTP probes

1. `POST /functions/v1/api/data/entities` anonyme -> `401`
2. `POST /functions/v1/api/data/interactions` (membre) -> `409` attendu (conflit optimistic lock, auth OK)
3. `POST /functions/v1/api/data/interactions` (user temporaire non-membre) -> `403`
4. `POST /functions/v1/api/data/entities` avec seul `x-client-authorization` -> `401`
5. `OPTIONS /functions/v1/api/data/{entities,entity-contacts,interactions,config,profile}` -> `200`

### 6.2 Service role

- `pg_policies` confirme `rate_limits_service_access` role `service_role`.
- `routine_privileges` confirme routines sensibles restreintes selon attendu.

## 7) QA gate locale

- Commande: `pnpm run qa`
- Resultat global: `QA Gate PASS`
- Detail principal:
  - Front: typecheck/lint/test:coverage/check:error-compliance/build = PASS
  - Back: deno lint/check/test = PASS (`68 passed, 0 failed, 9 ignored`)

## 8) Risques restants

1. Security advisor `auth_leaked_password_protection` toujours `WARN` (accepte hors scope: intranet B2B, decision produit 2026-02-22).
2. Plusieurs indexes FK restent `unused` a date (normal vu faible volumetrie), conserves volontairement pour couverture FK.

## 9) Decision

- Couche 13: `TERMINEE`
- Passage couche 14: autorise
