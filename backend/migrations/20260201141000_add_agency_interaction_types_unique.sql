-- Ensure unique labels per agency for interaction types (needed for upsert)

alter table if exists public.agency_interaction_types
  drop constraint if exists agency_interaction_types_agency_id_label_key,
  add constraint agency_interaction_types_agency_id_label_key unique (agency_id, label);
