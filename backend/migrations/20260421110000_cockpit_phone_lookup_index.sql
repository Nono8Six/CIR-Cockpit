-- Accelerate cockpit solicitation lookup by normalized phone number within an agency.
CREATE INDEX IF NOT EXISTS idx_interactions_agency_normalized_phone_recent
  ON public.interactions (
    agency_id,
    (regexp_replace(coalesce(contact_phone, ''), '\D', '', 'g')),
    last_action_at DESC,
    created_at DESC
  )
  WHERE contact_phone IS NOT NULL AND btrim(contact_phone) <> '';
