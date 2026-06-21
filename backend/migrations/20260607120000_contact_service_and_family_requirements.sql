alter table public.entity_contacts
  add column if not exists service_label text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'entity_contacts_service_label_trim'
  ) then
    alter table public.entity_contacts
      add constraint entity_contacts_service_label_trim
      check (service_label is null or (service_label = btrim(service_label) and char_length(service_label) > 0));
  end if;
end $$;

alter table public.agency_interaction_types
  add column if not exists requires_product_families boolean not null default false;
