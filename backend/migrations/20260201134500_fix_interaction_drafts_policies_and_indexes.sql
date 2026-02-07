-- Fix RLS initplan for interaction_drafts and add FK index

CREATE INDEX IF NOT EXISTS idx_interactions_status_id
  ON public.interactions (status_id);

DROP POLICY IF EXISTS interaction_drafts_select ON public.interaction_drafts;
DROP POLICY IF EXISTS interaction_drafts_insert ON public.interaction_drafts;
DROP POLICY IF EXISTS interaction_drafts_update ON public.interaction_drafts;
DROP POLICY IF EXISTS interaction_drafts_delete ON public.interaction_drafts;

CREATE POLICY interaction_drafts_select
  ON public.interaction_drafts
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY interaction_drafts_insert
  ON public.interaction_drafts
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY interaction_drafts_update
  ON public.interaction_drafts
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY interaction_drafts_delete
  ON public.interaction_drafts
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));
