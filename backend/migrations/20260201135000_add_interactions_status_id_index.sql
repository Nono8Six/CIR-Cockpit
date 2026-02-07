-- Add index to cover interactions.status_id foreign key

CREATE INDEX IF NOT EXISTS idx_interactions_status_id_only
  ON public.interactions (status_id);
