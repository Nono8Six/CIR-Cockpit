-- Couche 13 rollback (lot 1): recreate dropped indexes.

CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_actor_id
  ON public.audit_logs_archive USING btree (actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_created_at
  ON public.audit_logs_archive USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_agency_id
  ON public.audit_logs_archive USING btree (agency_id);

CREATE INDEX IF NOT EXISTS interaction_drafts_user_id_idx
  ON public.interaction_drafts USING btree (user_id);

CREATE INDEX IF NOT EXISTS interaction_drafts_agency_id_idx
  ON public.interaction_drafts USING btree (agency_id);

CREATE INDEX IF NOT EXISTS interaction_drafts_updated_at_idx
  ON public.interaction_drafts USING btree (updated_at);

CREATE INDEX IF NOT EXISTS idx_profiles_active_agency_id
  ON public.profiles USING btree (active_agency_id);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON public.rate_limits USING btree (window_start);
