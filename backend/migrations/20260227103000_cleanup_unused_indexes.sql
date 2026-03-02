-- COUCHE 1.5 - Cleanup unused indexes (idx_scan = 0) excluding PK/FK-backed indexes.
-- Baseline source: pg_stat_user_indexes + pg_constraint classification.

DROP INDEX IF EXISTS public.agencies_name_unique_idx;
DROP INDEX IF EXISTS public.entities_client_number_key;
DROP INDEX IF EXISTS public.idx_profiles_active_agency_id;
DROP INDEX IF EXISTS public.interaction_drafts_agency_id_idx;
DROP INDEX IF EXISTS public.idx_interactions_contact_id;
DROP INDEX IF EXISTS public.idx_interactions_created_by;
DROP INDEX IF EXISTS public.idx_interactions_entity_id;
DROP INDEX IF EXISTS public.idx_interactions_status_id_only;
DROP INDEX IF EXISTS public.idx_interactions_updated_by;
DROP INDEX IF EXISTS public.idx_audit_logs_archive_actor_id;
DROP INDEX IF EXISTS public.idx_audit_logs_archive_agency_id;

-- No missing agency_id indexes were detected during audit:
-- all public tables exposing agency_id already have an index path.
