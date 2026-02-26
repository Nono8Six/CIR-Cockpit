-- Couche 13: restore FK-covering indexes after unused-index cleanup.
-- Rationale:
-- - Keep "remove unused" objective for pure search/secondary indexes.
-- - Preserve foreign key maintenance performance and avoid unindexed FK regressions.

CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_actor_id
  ON public.audit_logs_archive USING btree (actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_agency_id
  ON public.audit_logs_archive USING btree (agency_id);

CREATE INDEX IF NOT EXISTS interaction_drafts_agency_id_idx
  ON public.interaction_drafts USING btree (agency_id);

CREATE INDEX IF NOT EXISTS idx_profiles_active_agency_id
  ON public.profiles USING btree (active_agency_id);

CREATE INDEX IF NOT EXISTS idx_interactions_contact_id
  ON public.interactions USING btree (contact_id);

CREATE INDEX IF NOT EXISTS idx_interactions_created_by
  ON public.interactions USING btree (created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_entity_id
  ON public.interactions USING btree (entity_id);

CREATE INDEX IF NOT EXISTS idx_interactions_status_id_only
  ON public.interactions USING btree (status_id);

CREATE INDEX IF NOT EXISTS idx_interactions_updated_by
  ON public.interactions USING btree (updated_by);
