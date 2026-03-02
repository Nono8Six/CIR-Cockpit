-- Optimize client interaction history pagination by entity and activity date.
CREATE INDEX IF NOT EXISTS idx_interactions_entity_last_action
  ON public.interactions (entity_id, last_action_at DESC, created_at DESC)
  WHERE entity_id IS NOT NULL;
