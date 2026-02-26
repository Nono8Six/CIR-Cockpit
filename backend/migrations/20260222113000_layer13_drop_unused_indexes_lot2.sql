-- Couche 13 (lot 2): remove remaining unused indexes on business tables.
-- Source: Supabase advisor unused_index + pg_stat_user_indexes (idx_scan = 0), 2026-02-22.

-- Unused partial index for active interactions.
DROP INDEX IF EXISTS public.idx_interactions_active;

-- Unused status lookup index (superseded by idx_interactions_status_id and query patterns).
DROP INDEX IF EXISTS public.idx_interactions_status;

-- Unused created_by index on interactions.
DROP INDEX IF EXISTS public.idx_interactions_created_by;

-- Unused status_id-only index (agency+status_id index is used).
DROP INDEX IF EXISTS public.idx_interactions_status_id_only;

-- Unused contact_id lookup index on interactions.
DROP INDEX IF EXISTS public.idx_interactions_contact_id;

-- Unused updated_by lookup index on interactions.
DROP INDEX IF EXISTS public.idx_interactions_updated_by;

-- Unused entity_id lookup index on interactions.
DROP INDEX IF EXISTS public.idx_interactions_entity_id;

-- Unused name search index on entities.
DROP INDEX IF EXISTS public.idx_entities_name_search;

-- Unused entity_type search index on entities.
DROP INDEX IF EXISTS public.idx_entities_entity_type;

-- Unused last_name search index on entity_contacts.
DROP INDEX IF EXISTS public.idx_entity_contacts_last_name_search;
