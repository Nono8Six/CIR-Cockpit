create index activities_contact_organization_idx
  on public.activities(contact_id, organization_id)
  where contact_id is not null;
create index activities_created_by_idx
  on public.activities(created_by);
create index activities_updated_by_idx
  on public.activities(updated_by)
  where updated_by is not null;

create index activity_participants_activity_agency_idx
  on public.activity_participants(activity_id, agency_id);
create index activity_participants_external_contact_organization_idx
  on public.activity_participants(external_contact_id, organization_id)
  where external_contact_id is not null;
create index activity_participants_created_by_idx
  on public.activity_participants(created_by);

create index activity_sources_activity_agency_idx
  on public.activity_sources(activity_id, agency_id);
create index activity_sources_created_by_idx
  on public.activity_sources(created_by);

create index activity_attachments_activity_agency_idx
  on public.activity_attachments(activity_id, agency_id);
create index activity_attachments_source_activity_agency_idx
  on public.activity_attachments(source_id, activity_id, agency_id)
  where source_id is not null;
create index activity_attachments_created_by_idx
  on public.activity_attachments(created_by);

create index activity_history_events_activity_agency_idx
  on public.activity_history_events(activity_id, agency_id);
create index activity_history_events_agency_id_idx
  on public.activity_history_events(agency_id);

create index activity_corrections_activity_agency_idx
  on public.activity_corrections(activity_id, agency_id);
create index activity_corrections_agency_id_idx
  on public.activity_corrections(agency_id);
