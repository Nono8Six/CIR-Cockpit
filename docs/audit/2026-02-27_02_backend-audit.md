# Audit Backend - CIR Cockpit

Date: 2026-02-27
Perimetre: `backend/functions/api`, `backend/drizzle`, `backend/migrations`, coherence `shared/`
Methodes: lecture code, scans statiques, preuves QA existantes, revue tRPC/Drizzle avec skills
Skills utilises: `trpc-type-safety`, `drizzle-orm`, `cir-error-handling`
References externes: tRPC docs (Context7), React Query docs (Context7, usage client), pratiques Edge/Hono

## Phase 1 - Scorecard backend (notes /100)

| Axe | Note | Commentaire court |
|---|---:|---|
| Architecture API (Hono+tRPC) | 88 | Structure claire, middleware ordre coherent |
| Type safety end-to-end | 90 | Input/output schemas tRPC bien poses |
| Gestion des erreurs | 92 | `httpError` + formatter tRPC + messages FR |
| Auth/JWT hardening | 84 | Bonne base JWKS/alg whitelist, fichier trop dense |
| Drizzle integration | 84 | Migration engagee, schema encore dense |
| Qualite des services | 80 | Plusieurs services massifs a segmenter |
| Tests backend | 87 | Bon coverage fonctionnelle, integration monolithique |
| Maintainabilite long terme | 78 | Hotspots >300 lignes encore presents |
| **Moyenne backend** | **85** | **Back robuste mais dette de decoupage** |

## Phase 2 - Findings majeurs (ordonnes)

### B-1 (Majeur) - Service admin trop volumineux

- Evidence:
  - `backend/functions/api/services/adminUsers.ts` (~797 lignes)
- Observation: aggregation de multiples responsabilites (password policy, lifecycle user, memberships, anonymisation, etc.).
- Impact: relecture difficile, risque regressions transverses.
- Reco: split en modules de domaine:
  - `adminUsers/password.ts`
  - `adminUsers/memberships.ts`
  - `adminUsers/system-user.ts`
  - `adminUsers/lifecycle.ts`

### B-2 (Majeur) - Middleware auth dense et multi-role

- Evidence:
  - `backend/functions/api/middleware/auth.ts` (~326 lignes)
- Observation: config env, cache JWKS, verification JWT, contexte DB, middlewares runtime dans un seul fichier.
- Impact: cout de maintenance eleve, tests plus fragiles.
- Reco: split en 4 modules:
  - `auth/config.ts`
  - `auth/jwtGateway.ts`
  - `auth/contextResolver.ts`
  - `auth/middleware.ts`

### B-3 (Moyen) - Integration test unique trop gros

- Evidence:
  - `backend/functions/api/integration/api_integration_test.ts` (~533 lignes)
- Observation: scenarios multiples centralises.
- Impact: debuggage lent en cas d'echec, faible granularite de resultat.
- Reco: segmenter par domaine (`auth`, `data`, `admin`, `cors`).

### B-4 (Moyen) - Repetition try/catch tRPC

- Evidence:
  - `backend/functions/api/trpc/router.ts:44` a `:147`
- Observation: pattern repetition `try { ... } catch { handleProcedureError }` dans chaque mutation.
- Impact: bruit, surface de divergence future.
- Reco: helper `withProcedureErrorHandling(handler)` pour standardiser.

### B-5 (Moyen) - Drizzle schema encore centralise

- Evidence:
  - `backend/drizzle/schema.ts` (~158 lignes)
- Observation: acceptable aujourd'hui, mais va croitre avec le schema.
- Impact: probable friction evolutive.
- Reco: schema split par domaine (`core`, `interactions`, `agency`, `auth`).

## Phase 3 - Points forts confirms

- Montage middleware et tRPC propre:
  - `backend/functions/api/app.ts:14` a `:19`
- Contrat auth `Authorization` only respecte cote middleware:
  - `backend/functions/api/middleware/auth.ts:365`
- Formatter d'erreur tRPC coherent avec code applicatif:
  - `backend/functions/api/trpc/procedures.ts:105` a `:115`
- Input + output schemas valides sur procedures:
  - `backend/functions/api/trpc/router.ts:41` a `:148`

## Phase 4 - Conformite au refactoring cible

- Couche tRPC (couche 9) visible et fonctionnelle.
- Couche Drizzle (couche 12) en place dans backend.
- Couche runtime Hono/Deno stabilisee (app + wrapper CLI presents).
- Contrat erreurs FR conforme sur la plupart des surfaces revues.

## Plan amelioration backend (priorise)

1. Segmenter `adminUsers.ts` (priorite haute).
2. Segmenter `auth.ts` en modules focused (priorite haute).
3. Refactor helper erreur tRPC pour supprimer duplication (priorite moyenne).
4. Segmenter integration tests backend (priorite moyenne).
5. Preparer split Drizzle schema avant prochaine vague migrations (priorite moyenne).

## Annexe - Scoring fichier par fichier
| Path | Lines | Score/100 | Note |
|---|---:|---:|---|
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\drizzle\config.ts | 3 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\drizzle\index.ts | 38 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\drizzle\relations.ts | 60 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\drizzle\schema.ts | 158 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\app.ts | 17 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\index.ts | 13 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\integration\api_integration_test.ts | 533 | 72 | Taille elevee, simplification/segmentation conseillee. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\middleware\auth_test.ts | 117 | 92 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\middleware\auth.ts | 326 | 76 | Taille elevee, simplification/segmentation conseillee. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\middleware\corsAndBodySize.ts | 72 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\middleware\errorHandler_test.ts | 154 | 84 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\middleware\errorHandler.ts | 54 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\middleware\requestId.ts | 9 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\middleware\zodValidator.ts | 34 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\services\adminAgencies_test.ts | 37 | 92 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\services\adminAgencies.ts | 140 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\services\adminUsers_test.ts | 118 | 92 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\services\adminUsers.ts | 797 | 70 | Taille elevee, simplification/segmentation conseillee. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\services\dataAccess_test.ts | 54 | 92 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\services\dataAccess.ts | 94 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\services\dataConfig_test.ts | 51 | 92 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\services\dataConfig.ts | 218 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\services\dataEntities_test.ts | 164 | 84 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\services\dataEntities.ts | 271 | 76 | Taille elevee, simplification/segmentation conseillee. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\services\dataEntityContacts.ts | 107 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\services\dataInteractions_test.ts | 48 | 92 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\services\dataInteractions.ts | 213 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\services\dataProfile.ts | 30 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\services\rateLimit_test.ts | 28 | 92 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\services\rateLimit.ts | 26 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\trpc\appRoutes_test.ts | 67 | 92 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\trpc\context.ts | 21 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\trpc\procedures.ts | 154 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\trpc\router_test.ts | 26 | 92 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\trpc\router.ts | 140 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\functions\api\types.ts | 21 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601151500_init_schema.sql | 519 | 70 | Taille elevee, simplification/segmentation conseillee. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601151900_security_hardening.sql | 85 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601152000_audit_logs.sql | 105 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601152030_interactions_audit_fields.sql | 35 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601152100_rate_limits.sql | 51 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601152200_remove_seed_defaults.sql | 4 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601161330_profiles_active_agency.sql | 20 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601161800_interaction_label_constraints.sql | 15 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601161900_reference_label_constraints.sql | 29 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601171000_auth_audit_improvements.sql | 151 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601181100_profiles_update_policy.sql | 17 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601181200_config_readonly.sql | 65 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601181230_audit_log_metadata.sql | 75 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601181240_rate_limits_rls.sql | 8 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601181250_rate_limits_fail_closed.sql | 46 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601181300_status_semantics.sql | 17 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601181320_interactions_cleanup.sql | 32 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601221300_audit_actor_fix.sql | 75 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601231200_rate_limits_privileges_fix.sql | 6 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601231210_updated_at_clock_timestamp.sql | 10 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601231400_fix_search_path.sql | 7 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601231410_optimize_rls_helpers.sql | 49 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601231420_optimize_rls_policies.sql | 52 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601231430_add_fk_indexes.sql | 5 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601231520_harden_definer_search_path.sql | 180 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601231530_interactions_status_id.sql | 91 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601231540_fix_sync_interaction_status_logic.sql | 61 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601231550_sync_status_label_on_update.sql | 26 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\202601231560_interactions_status_terminal_flag.sql | 92 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260126120000_create_clients.sql | 43 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260126120500_create_client_contacts.sql | 25 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260126121000_add_profiles_role_archived.sql | 4 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260126121500_backfill_profiles_role.sql | 22 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260126122000_update_helpers_triggers.sql | 163 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260126122500_drop_legacy_role_columns.sql | 5 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260126123000_update_agencies_archived.sql | 5 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260126123500_update_interactions_clients.sql | 76 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260126124000_audit_logs_nullable_agency.sql | 122 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260126124500_update_rls_policies.sql | 397 | 76 | Taille elevee, simplification/segmentation conseillee. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260126131000_fix_audit_log_agency_delete.sql | 107 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260126132000_add_interactions_contact_index_client_created_by.sql | 20 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260126203000_make_client_number_nullable.sql | 6 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260129130000_fix_profiles_update_policy.sql | 36 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260201120000_create_interaction_drafts.sql | 43 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260201133000_add_account_type_and_require_client_number.sql | 15 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260201133500_add_interaction_types_and_relations.sql | 85 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260201134000_add_contact_email_and_checks.sql | 34 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260201134500_fix_interaction_drafts_policies_and_indexes.sql | 24 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260201135000_add_interactions_status_id_index.sql | 3 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260201141000_add_agency_interaction_types_unique.sql | 4 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260203120000_entities_refactor.sql | 627 | 70 | Taille elevee, simplification/segmentation conseillee. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260210183000_profiles_first_last_name.sql | 73 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260211120000_hard_delete_agency_rpc.sql | 37 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260215123000_user_delete_anonymization_system_users.sql | 17 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260215150000_agency_system_users_rls_policies.sql | 23 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260215153000_audit_logs_retention_policy.sql | 145 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260216101000_harden_hard_delete_agency_rpc_privileges.sql | 5 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260216102000_strict_multi_tenant_rls.sql | 207 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260216103000_backfill_interaction_agency_id.sql | 7 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260222110000_layer13_drop_unused_indexes_lot1.sql | 18 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260222113000_layer13_drop_unused_indexes_lot2.sql | 22 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260222120000_layer13_rls_policy_and_grants_hardening.sql | 59 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\20260222121000_layer13_recreate_fk_safety_indexes.sql | 22 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\backend\migrations\README.md | 3 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\scripts\qa-gate.ps1 | 29 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\scripts\qa-gate.sh | 30 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\supabase\.temp\cli-latest | 0 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\supabase\config.toml | 2 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\supabase\functions\api\index.ts | 3 | 90 | RAS notable. |

## Annexe Shared (impact backend)

| Path | Lines | Score/100 | Note ||---|---:|---:|---|
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\api\generated\rpc-app.ts | 29 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\errors\__tests__\fingerprint.test.ts | 17 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\errors\catalog.ts | 240 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\errors\fingerprint.ts | 19 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\errors\index.ts | 3 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\errors\types.ts | 90 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\package.json | 6 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\schemas\__tests__\client-contact.schema.test.ts | 22 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\schemas\__tests__\client.schema.test.ts | 35 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\schemas\__tests__\convert-client.schema.test.ts | 18 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\schemas\__tests__\prospect.schema.test.ts | 28 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\schemas\agency.schema.ts | 35 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\schemas\api-responses.ts | 138 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\schemas\auth.schema.ts | 32 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\schemas\client-contact.schema.ts | 26 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\schemas\client.schema.ts | 23 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\schemas\convert-client.schema.ts | 7 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\schemas\data.schema.ts | 143 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\schemas\edge-error.schema.ts | 9 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\schemas\index.ts | 53 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\schemas\interaction.schema.ts | 190 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\schemas\prospect.schema.ts | 18 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\schemas\user.schema.ts | 112 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\shared\supabase.types.ts | 942 | 76 | Au-dela de 150 lignes, extraction possible. |

