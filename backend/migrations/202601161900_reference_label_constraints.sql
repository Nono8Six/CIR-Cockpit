-- Normalize labels (trim) before enforcing constraints.
update public.agency_statuses
set label = btrim(label)
where label <> btrim(label);

update public.agency_services
set label = btrim(label)
where label <> btrim(label);

update public.agency_families
set label = btrim(label)
where label <> btrim(label);

update public.agency_entities
set label = btrim(label)
where label <> btrim(label);

alter table if exists public.agency_statuses
  drop constraint if exists agency_statuses_label_check,
  add constraint agency_statuses_label_check
    check (label = btrim(label) and char_length(label) > 0);

alter table if exists public.agency_services
  drop constraint if exists agency_services_label_check,
  add constraint agency_services_label_check
    check (label = btrim(label) and char_length(label) > 0);

alter table if exists public.agency_families
  drop constraint if exists agency_families_label_check,
  add constraint agency_families_label_check
    check (label = btrim(label) and char_length(label) > 0);

alter table if exists public.agency_entities
  drop constraint if exists agency_entities_label_check,
  add constraint agency_entities_label_check
    check (label = btrim(label) and char_length(label) > 0);
