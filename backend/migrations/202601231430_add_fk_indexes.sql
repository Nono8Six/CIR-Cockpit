-- Add missing indexes for foreign keys (performance)

CREATE INDEX IF NOT EXISTS idx_interactions_created_by
  ON public.interactions (created_by);

CREATE INDEX IF NOT EXISTS idx_interactions_updated_by
  ON public.interactions (updated_by);
