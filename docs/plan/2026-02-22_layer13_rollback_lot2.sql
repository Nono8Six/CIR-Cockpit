-- Couche 13 rollback (lot 2): recreate dropped indexes.

CREATE INDEX IF NOT EXISTS idx_interactions_active
  ON public.interactions USING btree (agency_id, last_action_at DESC)
  WHERE (status_is_terminal = false);

CREATE INDEX IF NOT EXISTS idx_interactions_status
  ON public.interactions USING btree (agency_id, status);

CREATE INDEX IF NOT EXISTS idx_interactions_created_by
  ON public.interactions USING btree (created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_status_id_only
  ON public.interactions USING btree (status_id);

CREATE INDEX IF NOT EXISTS idx_interactions_contact_id
  ON public.interactions USING btree (contact_id);

CREATE INDEX IF NOT EXISTS idx_interactions_updated_by
  ON public.interactions USING btree (updated_by);

CREATE INDEX IF NOT EXISTS idx_interactions_entity_id
  ON public.interactions USING btree (entity_id);

CREATE INDEX IF NOT EXISTS idx_entities_name_search
  ON public.entities USING btree (lower(name));

CREATE INDEX IF NOT EXISTS idx_entities_entity_type
  ON public.entities USING btree (lower(entity_type));

CREATE INDEX IF NOT EXISTS idx_entity_contacts_last_name_search
  ON public.entity_contacts USING btree (lower(last_name));
