alter table public.entities disable trigger prevent_entity_agency_change;

update public.entities
set agency_id = null,
    updated_at = now()
where entity_type = 'Fournisseur'
  and agency_id is not null;

alter table public.entities enable trigger prevent_entity_agency_change;
