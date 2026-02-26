-- Couche 13: harden policy roles and sensitive routine grants.
-- Goal: keep policy logic unchanged while avoiding broad TO public grants.

-- agency_interaction_types policies: restrict role target to authenticated.
DROP POLICY IF EXISTS agency_interaction_types_select ON public.agency_interaction_types;
DROP POLICY IF EXISTS agency_interaction_types_insert ON public.agency_interaction_types;
DROP POLICY IF EXISTS agency_interaction_types_update ON public.agency_interaction_types;
DROP POLICY IF EXISTS agency_interaction_types_delete ON public.agency_interaction_types;

CREATE POLICY agency_interaction_types_select
  ON public.agency_interaction_types
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin() OR public.is_member(agency_id));

CREATE POLICY agency_interaction_types_insert
  ON public.agency_interaction_types
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY agency_interaction_types_update
  ON public.agency_interaction_types
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY agency_interaction_types_delete
  ON public.agency_interaction_types
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- interaction_drafts policies: restrict role target to authenticated.
DROP POLICY IF EXISTS interaction_drafts_select ON public.interaction_drafts;
DROP POLICY IF EXISTS interaction_drafts_insert ON public.interaction_drafts;
DROP POLICY IF EXISTS interaction_drafts_update ON public.interaction_drafts;
DROP POLICY IF EXISTS interaction_drafts_delete ON public.interaction_drafts;

CREATE POLICY interaction_drafts_select
  ON public.interaction_drafts
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY interaction_drafts_insert
  ON public.interaction_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY interaction_drafts_update
  ON public.interaction_drafts
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY interaction_drafts_delete
  ON public.interaction_drafts
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- set_audit_actor is used by backend trusted path only.
REVOKE ALL ON FUNCTION public.set_audit_actor(uuid) FROM public;
REVOKE ALL ON FUNCTION public.set_audit_actor(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.set_audit_actor(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_audit_actor(uuid) TO service_role;
