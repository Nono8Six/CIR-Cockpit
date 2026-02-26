-- Couche 13 (lot 1): remove unused indexes with lowest functional risk first.
-- Source: Supabase advisor unused_index + pg_stat_user_indexes (idx_scan = 0), 2026-02-22.

-- Unused index on archive audit actor lookup.
DROP INDEX IF EXISTS public.idx_audit_logs_archive_actor_id;

-- Unused index on archive audit created_at ordering.
DROP INDEX IF EXISTS public.idx_audit_logs_archive_created_at;

-- Unused index on archive audit agency lookup.
DROP INDEX IF EXISTS public.idx_audit_logs_archive_agency_id;

-- Unused index on drafts user lookup (covered by unique composite index).
DROP INDEX IF EXISTS public.interaction_drafts_user_id_idx;

-- Unused index on drafts agency lookup.
DROP INDEX IF EXISTS public.interaction_drafts_agency_id_idx;

-- Unused index on drafts updated_at.
DROP INDEX IF EXISTS public.interaction_drafts_updated_at_idx;

-- Unused index on active agency pointer in profiles.
DROP INDEX IF EXISTS public.idx_profiles_active_agency_id;

-- Unused index on rate limits window timestamp.
DROP INDEX IF EXISTS public.idx_rate_limits_window_start;
