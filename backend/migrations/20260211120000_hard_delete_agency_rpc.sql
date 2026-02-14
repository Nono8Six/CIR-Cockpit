-- Migration: hard_delete_agency RPC
-- Wraps all hard-delete steps for an agency in a single transaction
-- to prevent partial state on failure (previously 5 sequential steps).

CREATE OR REPLACE FUNCTION public.hard_delete_agency(p_agency_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- 1. Detach profiles referencing this agency
  UPDATE public.profiles
  SET active_agency_id = NULL
  WHERE active_agency_id = p_agency_id;

  -- 2. Detach entities referencing this agency
  UPDATE public.entities
  SET agency_id = NULL
  WHERE agency_id = p_agency_id;

  -- 3. Delete agency members
  DELETE FROM public.agency_members
  WHERE agency_id = p_agency_id;

  -- 4. Delete agency config tables
  DELETE FROM public.agency_statuses
  WHERE agency_id = p_agency_id;

  DELETE FROM public.agency_services
  WHERE agency_id = p_agency_id;

  DELETE FROM public.agency_entities
  WHERE agency_id = p_agency_id;

  DELETE FROM public.agency_families
  WHERE agency_id = p_agency_id;

  DELETE FROM public.agency_interaction_types
  WHERE agency_id = p_agency_id;

  -- 5. Delete the agency itself
  DELETE FROM public.agencies
  WHERE id = p_agency_id;
END;
$$;
