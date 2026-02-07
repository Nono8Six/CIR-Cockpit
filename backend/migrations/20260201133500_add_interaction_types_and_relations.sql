-- Add interaction types by agency and update relation entities

CREATE TABLE IF NOT EXISTS public.agency_interaction_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_interaction_types_label_trim CHECK (label = btrim(label) AND char_length(label) > 0)
);

CREATE INDEX IF NOT EXISTS agency_interaction_types_agency_id_idx
  ON public.agency_interaction_types (agency_id);

ALTER TABLE public.agency_interaction_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agency_interaction_types_select ON public.agency_interaction_types;
DROP POLICY IF EXISTS agency_interaction_types_insert ON public.agency_interaction_types;
DROP POLICY IF EXISTS agency_interaction_types_update ON public.agency_interaction_types;
DROP POLICY IF EXISTS agency_interaction_types_delete ON public.agency_interaction_types;

CREATE POLICY agency_interaction_types_select
  ON public.agency_interaction_types
  FOR SELECT
  USING (is_super_admin() OR is_member(agency_id));

CREATE POLICY agency_interaction_types_insert
  ON public.agency_interaction_types
  FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY agency_interaction_types_update
  ON public.agency_interaction_types
  FOR UPDATE
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY agency_interaction_types_delete
  ON public.agency_interaction_types
  FOR DELETE
  USING (is_super_admin());

DROP TRIGGER IF EXISTS audit_agency_interaction_types ON public.agency_interaction_types;
DROP TRIGGER IF EXISTS set_updated_at_agency_interaction_types ON public.agency_interaction_types;

CREATE TRIGGER audit_agency_interaction_types
  AFTER INSERT OR UPDATE OR DELETE ON public.agency_interaction_types
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER set_updated_at_agency_interaction_types
  BEFORE UPDATE ON public.agency_interaction_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.interactions
  ADD COLUMN IF NOT EXISTS interaction_type text NOT NULL DEFAULT 'Autre';

WITH interaction_types (sort_order, label) AS (
  VALUES
    (1, 'Devis'),
    (2, 'SAV'),
    (3, 'Commande'),
    (4, 'Technique'),
    (5, 'Reclamation'),
    (6, 'Facturation'),
    (7, 'Logistique'),
    (8, 'Interne'),
    (9, 'Autre')
)
INSERT INTO public.agency_interaction_types (agency_id, label, sort_order)
SELECT a.id, t.label, t.sort_order
FROM public.agencies a
CROSS JOIN interaction_types t
WHERE NOT EXISTS (
  SELECT 1
  FROM public.agency_interaction_types it
  WHERE it.agency_id = a.id AND it.label = t.label
);

DELETE FROM public.agency_entities
WHERE label IN ('Client terme', 'Client comptant');

WITH relation_entities (sort_order, label) AS (
  VALUES
    (1, 'Client'),
    (2, 'Prospect'),
    (3, 'Fournisseur'),
    (4, 'Sollicitation'),
    (5, 'Autre')
)
INSERT INTO public.agency_entities (agency_id, label, sort_order)
SELECT a.id, e.label, e.sort_order
FROM public.agencies a
CROSS JOIN relation_entities e
WHERE NOT EXISTS (
  SELECT 1
  FROM public.agency_entities ae
  WHERE ae.agency_id = a.id AND ae.label = e.label
);
