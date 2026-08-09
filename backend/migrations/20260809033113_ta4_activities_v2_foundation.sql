-- TA-4 - Modele additif Activites v2
-- Migration additive : la table historique public.interactions reste la voie active.

alter table public.entity_contacts
  add constraint entity_contacts_id_entity_id_key unique (id, entity_id);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  legacy_interaction_id text unique references public.interactions(id) on delete restrict,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  author_id uuid not null references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  legacy_updated_by_raw text,
  occurred_at timestamptz not null,
  channel text not null,
  activity_type text not null,
  subject text not null,
  report text,
  organization_id uuid references public.entities(id) on delete restrict,
  contact_id uuid,
  lifecycle_status text not null default 'draft',
  version integer not null default 1,
  corrected_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activities_id_agency_key unique (id, agency_id),
  constraint activities_contact_organization_fkey
    foreign key (contact_id, organization_id)
    references public.entity_contacts(id, entity_id) on delete restrict,
  constraint activities_channel_trim check (channel = btrim(channel) and char_length(channel) > 0),
  constraint activities_type_trim check (activity_type = btrim(activity_type) and char_length(activity_type) > 0),
  constraint activities_subject_trim check (subject = btrim(subject) and char_length(subject) > 0),
  constraint activities_report_trim check (report is null or char_length(btrim(report)) > 0),
  constraint activities_contact_requires_organization check (contact_id is null or organization_id is not null),
  constraint activities_lifecycle_check check (lifecycle_status in ('draft', 'recorded', 'corrected', 'archived')),
  constraint activities_version_check check (version > 0),
  constraint activities_corrected_state check (
    (lifecycle_status = 'corrected' and corrected_at is not null)
    or lifecycle_status <> 'corrected'
  ),
  constraint activities_archived_state check (
    (lifecycle_status = 'archived' and archived_at is not null)
    or (lifecycle_status <> 'archived' and archived_at is null)
  )
);

create table public.activity_participants (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  participant_kind text not null,
  internal_profile_id uuid references public.profiles(id) on delete restrict,
  external_contact_id uuid,
  organization_id uuid,
  participant_role text not null default 'participant',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint activity_participants_activity_agency_fkey
    foreign key (activity_id, agency_id)
    references public.activities(id, agency_id) on delete cascade,
  constraint activity_participants_external_contact_fkey
    foreign key (external_contact_id, organization_id)
    references public.entity_contacts(id, entity_id) on delete restrict,
  constraint activity_participants_kind_check check (participant_kind in ('internal', 'external')),
  constraint activity_participants_identity_check check (
    (participant_kind = 'internal' and internal_profile_id is not null and external_contact_id is null and organization_id is null)
    or
    (participant_kind = 'external' and internal_profile_id is null and external_contact_id is not null and organization_id is not null)
  ),
  constraint activity_participants_role_trim check (participant_role = btrim(participant_role) and char_length(participant_role) > 0)
);

create unique index activity_participants_internal_unique
  on public.activity_participants(activity_id, internal_profile_id)
  where internal_profile_id is not null;
create unique index activity_participants_external_unique
  on public.activity_participants(activity_id, external_contact_id)
  where external_contact_id is not null;

create table public.activity_sources (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  source_type text not null,
  source_reference text not null,
  source_label text,
  captured_at timestamptz not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint activity_sources_id_activity_agency_key unique (id, activity_id, agency_id),
  constraint activity_sources_activity_agency_fkey
    foreign key (activity_id, agency_id)
    references public.activities(id, agency_id) on delete cascade,
  constraint activity_sources_type_check check (source_type in ('legacy_interaction', 'manual', 'import', 'email', 'document')),
  constraint activity_sources_reference_trim check (source_reference = btrim(source_reference) and char_length(source_reference) > 0),
  constraint activity_sources_activity_reference_key unique (activity_id, source_type, source_reference)
);

create table public.activity_attachments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  source_id uuid,
  file_name text not null,
  mime_type text,
  byte_size bigint,
  checksum_sha256 text,
  storage_bucket text,
  storage_object_path text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint activity_attachments_activity_agency_fkey
    foreign key (activity_id, agency_id)
    references public.activities(id, agency_id) on delete cascade,
  constraint activity_attachments_source_fkey
    foreign key (source_id, activity_id, agency_id)
    references public.activity_sources(id, activity_id, agency_id) on delete set null (source_id),
  constraint activity_attachments_file_name_trim check (file_name = btrim(file_name) and char_length(file_name) > 0),
  constraint activity_attachments_byte_size_check check (byte_size is null or byte_size >= 0),
  constraint activity_attachments_checksum_check check (checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$'),
  constraint activity_attachments_storage_pair_check check ((storage_bucket is null) = (storage_object_path is null))
);

create table public.activity_history_events (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  event_order integer not null,
  legacy_event_id text,
  event_type text not null,
  event_domain text not null,
  occurred_at timestamptz,
  author_id uuid references public.profiles(id) on delete restrict,
  author_label_raw text,
  content text not null,
  raw_event jsonb,
  created_at timestamptz not null default now(),
  constraint activity_history_events_activity_agency_fkey
    foreign key (activity_id, agency_id)
    references public.activities(id, agency_id) on delete cascade,
  constraint activity_history_events_order_check check (event_order > 0),
  constraint activity_history_events_type_trim check (event_type = btrim(event_type) and char_length(event_type) > 0),
  constraint activity_history_events_domain_check check (event_domain in ('activity', 'task', 'opportunity', 'quote_order', 'compatibility')),
  constraint activity_history_events_content_trim check (char_length(btrim(content)) > 0),
  constraint activity_history_events_activity_order_key unique (activity_id, event_order),
  constraint activity_history_events_activity_legacy_key unique (activity_id, legacy_event_id)
);

create table public.activity_corrections (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  activity_version integer not null,
  field_name text not null,
  previous_value text,
  new_value text,
  corrected_by uuid not null references public.profiles(id) on delete restrict,
  corrected_at timestamptz not null default now(),
  reason text,
  constraint activity_corrections_activity_agency_fkey
    foreign key (activity_id, agency_id)
    references public.activities(id, agency_id) on delete cascade,
  constraint activity_corrections_version_check check (activity_version > 1),
  constraint activity_corrections_field_trim check (field_name = btrim(field_name) and char_length(field_name) > 0),
  constraint activity_corrections_value_changed check (previous_value is distinct from new_value),
  constraint activity_corrections_activity_version_field_key unique (activity_id, activity_version, field_name)
);

create index activities_agency_occurred_at_idx on public.activities(agency_id, occurred_at desc);
create index activities_author_id_idx on public.activities(author_id);
create index activities_organization_occurred_at_idx on public.activities(organization_id, occurred_at desc) where organization_id is not null;
create index activities_contact_id_idx on public.activities(contact_id) where contact_id is not null;
create index activities_lifecycle_idx on public.activities(agency_id, lifecycle_status, occurred_at desc);
create index activity_participants_agency_idx on public.activity_participants(agency_id, activity_id);
create index activity_participants_internal_profile_idx on public.activity_participants(internal_profile_id) where internal_profile_id is not null;
create index activity_participants_external_contact_idx on public.activity_participants(external_contact_id) where external_contact_id is not null;
create index activity_sources_agency_idx on public.activity_sources(agency_id, activity_id);
create index activity_attachments_agency_idx on public.activity_attachments(agency_id, activity_id);
create index activity_attachments_source_id_idx on public.activity_attachments(source_id) where source_id is not null;
create index activity_history_events_activity_time_idx on public.activity_history_events(activity_id, occurred_at, event_order);
create index activity_history_events_author_id_idx on public.activity_history_events(author_id) where author_id is not null;
create index activity_corrections_activity_time_idx on public.activity_corrections(activity_id, corrected_at desc);
create index activity_corrections_corrected_by_idx on public.activity_corrections(corrected_by);

create function private.validate_activity_participants()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_activity_id uuid := coalesce(
    nullif(to_jsonb(new) ->> 'activity_id', '')::uuid,
    nullif(to_jsonb(old) ->> 'activity_id', '')::uuid,
    nullif(to_jsonb(new) ->> 'id', '')::uuid,
    nullif(to_jsonb(old) ->> 'id', '')::uuid
  );
  v_agency_id uuid;
  v_organization_id uuid;
  v_author_id uuid;
  v_status text;
begin
  select a.agency_id, a.organization_id, a.author_id, a.lifecycle_status
    into v_agency_id, v_organization_id, v_author_id, v_status
  from public.activities a
  where a.id = v_activity_id;

  if not found then
    return null;
  end if;

  if not exists (
    select 1
    from public.activity_participants ap
    join public.agency_members am
      on am.user_id = ap.internal_profile_id
     and am.agency_id = v_agency_id
    where ap.activity_id = v_activity_id
      and ap.participant_kind = 'internal'
      and ap.internal_profile_id = v_author_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'TA4_ACTIVITY_AUTHOR_PARTICIPANT_REQUIRED: l auteur doit etre un participant interne reel de l agence';
  end if;

  if v_organization_id is null and not exists (
    select 1
    from public.activity_participants ap
    join public.agency_members am
      on am.user_id = ap.internal_profile_id
     and am.agency_id = v_agency_id
    join public.profiles p
      on p.id = ap.internal_profile_id
     and p.archived_at is null
     and not p.is_system
    where ap.activity_id = v_activity_id
      and ap.participant_kind = 'internal'
  ) then
    raise exception using
      errcode = '23514',
      message = 'TA4_INTERNAL_PARTICIPANT_REQUIRED: une activite interne exige un participant interne reel de l agence';
  end if;

  return null;
end;
$$;

create constraint trigger activities_validate_participants
after insert or update of agency_id, organization_id, lifecycle_status on public.activities
deferrable initially deferred
for each row execute function private.validate_activity_participants();

create constraint trigger activity_participants_validate_activity
after insert or update or delete on public.activity_participants
deferrable initially deferred
for each row execute function private.validate_activity_participants();

create function private.prepare_activity_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := private.audit_actor_id();
  v_field text;
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_business_changed boolean := false;
begin
  if old.lifecycle_status = 'archived' then
    raise exception using errcode = '23514', message = 'TA4_ACTIVITY_ARCHIVED: une activite archivee est immuable';
  end if;

  if new.agency_id is distinct from old.agency_id
     or new.author_id is distinct from old.author_id
     or new.legacy_interaction_id is distinct from old.legacy_interaction_id
     or new.legacy_updated_by_raw is distinct from old.legacy_updated_by_raw
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'TA4_ACTIVITY_IDENTITY_IMMUTABLE: identite, agence, auteur et provenance sont immuables';
  end if;

  foreach v_field in array array['occurred_at','channel','activity_type','subject','report','organization_id','contact_id'] loop
    if (v_old -> v_field) is distinct from (v_new -> v_field) then
      v_business_changed := true;
    end if;
  end loop;

  if v_business_changed or new.lifecycle_status is distinct from old.lifecycle_status then
    if new.version <> old.version + 1 then
      raise exception using errcode = '40001', message = 'TA4_ACTIVITY_VERSION_CONFLICT: version attendue incorrecte';
    end if;
  elsif new.version <> old.version then
    raise exception using errcode = '23514', message = 'TA4_ACTIVITY_VERSION_UNCHANGED: version modifiee sans changement metier';
  end if;

  if new.lifecycle_status is distinct from old.lifecycle_status and not (
    (old.lifecycle_status = 'draft' and new.lifecycle_status in ('recorded', 'archived'))
    or (old.lifecycle_status = 'recorded' and new.lifecycle_status in ('corrected', 'archived'))
    or (old.lifecycle_status = 'corrected' and new.lifecycle_status in ('corrected', 'archived'))
  ) then
    raise exception using errcode = '23514', message = 'TA4_ACTIVITY_LIFECYCLE_INVALID: transition de cycle interdite';
  end if;

  if v_business_changed then
    if old.lifecycle_status = 'draft' then
      if new.lifecycle_status <> 'draft' then
        null;
      end if;
    else
      new.lifecycle_status := 'corrected';
      new.corrected_at := now();
      foreach v_field in array array['occurred_at','channel','activity_type','subject','report','organization_id','contact_id'] loop
        if (v_old -> v_field) is distinct from (v_new -> v_field) then
          insert into public.activity_corrections (
            activity_id, agency_id, activity_version, field_name,
            previous_value, new_value, corrected_by, corrected_at
          ) values (
            old.id, old.agency_id, new.version, v_field,
            v_old ->> v_field, v_new ->> v_field, coalesce(v_actor_id, new.updated_by), now()
          );
        end if;
      end loop;
    end if;
  end if;

  if new.lifecycle_status = 'archived' then
    new.archived_at := coalesce(new.archived_at, now());
  else
    new.archived_at := null;
  end if;
  new.updated_by := coalesce(v_actor_id, new.updated_by);
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.prepare_activity_update() from public, anon, authenticated;

create trigger activities_prepare_update
before update on public.activities
for each row execute function private.prepare_activity_update();

insert into public.activities (
  legacy_interaction_id, agency_id, author_id, created_by, updated_by,
  legacy_updated_by_raw,
  occurred_at, channel, activity_type, subject, report,
  organization_id, contact_id, lifecycle_status, version,
  created_at, updated_at
)
select
  i.id, i.agency_id, i.created_by, i.created_by, updated_profile.id,
  case when i.updated_by is not null and updated_profile.id is null then i.updated_by::text else null end,
  i.created_at, i.channel, i.interaction_type, i.subject,
  nullif(btrim(i.notes), ''), i.entity_id, i.contact_id, 'recorded', 1,
  i.created_at, i.updated_at
from public.interactions i
left join public.profiles updated_profile on updated_profile.id = i.updated_by
where i.agency_id is not null
on conflict (legacy_interaction_id) do nothing;

insert into public.activity_participants (
  activity_id, agency_id, participant_kind, internal_profile_id,
  participant_role, created_by, created_at
)
select a.id, a.agency_id, 'internal', a.author_id, 'author', a.created_by, a.created_at
from public.activities a
where a.legacy_interaction_id is not null
on conflict do nothing;

insert into public.activity_participants (
  activity_id, agency_id, participant_kind, external_contact_id,
  organization_id, participant_role, created_by, created_at
)
select a.id, a.agency_id, 'external', a.contact_id,
       a.organization_id, 'participant', a.created_by, a.created_at
from public.activities a
where a.legacy_interaction_id is not null
  and a.contact_id is not null
on conflict do nothing;

insert into public.activity_sources (
  activity_id, agency_id, source_type, source_reference,
  source_label, captured_at, created_by, created_at
)
select a.id, a.agency_id, 'legacy_interaction', a.legacy_interaction_id,
       'public.interactions', a.created_at, a.created_by, a.created_at
from public.activities a
where a.legacy_interaction_id is not null
on conflict do nothing;

insert into public.activity_history_events (
  activity_id, agency_id, event_order, legacy_event_id, event_type,
  event_domain, occurred_at, author_id, author_label_raw, content,
  raw_event, created_at
)
select
  a.id,
  a.agency_id,
  e.ordinality::integer,
  nullif(btrim(e.value ->> 'id'), ''),
  e.value ->> 'type',
  case e.value ->> 'type'
    when 'reminder_change' then 'task'
    when 'stage_change' then 'opportunity'
    when 'amount_change' then 'opportunity'
    when 'order_ref_change' then 'quote_order'
    when 'status_change' then 'compatibility'
    else 'activity'
  end,
  case
    when nullif(e.value ->> 'date', '') is null then null
    else (e.value ->> 'date')::timestamptz
  end,
  case
    when lower(btrim(e.value ->> 'author')) = lower(btrim(p.email)) then p.id
    else null
  end,
  nullif(btrim(e.value ->> 'author'), ''),
  e.value ->> 'content',
  e.value,
  a.created_at
from public.interactions i
join public.activities a on a.legacy_interaction_id = i.id
cross join lateral jsonb_array_elements(i.timeline) with ordinality e(value, ordinality)
left join public.profiles p
  on lower(btrim(e.value ->> 'author')) = lower(btrim(p.email))
on conflict do nothing;

-- Materialise les contraintes differees du backfill avant les ALTER TABLE RLS.
set constraints all immediate;

alter table public.activities enable row level security;
alter table public.activities force row level security;
alter table public.activity_participants enable row level security;
alter table public.activity_participants force row level security;
alter table public.activity_sources enable row level security;
alter table public.activity_sources force row level security;
alter table public.activity_attachments enable row level security;
alter table public.activity_attachments force row level security;
alter table public.activity_history_events enable row level security;
alter table public.activity_history_events force row level security;
alter table public.activity_corrections enable row level security;
alter table public.activity_corrections force row level security;

revoke all on table public.activities, public.activity_participants,
  public.activity_sources, public.activity_attachments,
  public.activity_history_events, public.activity_corrections
from public, anon, authenticated;

grant select, insert, update on table public.activities to authenticated;
grant select, insert, update, delete on table public.activity_participants to authenticated;
grant select, insert, update, delete on table public.activity_sources to authenticated;
grant select, insert, update, delete on table public.activity_attachments to authenticated;
grant select, insert on table public.activity_history_events to authenticated;
grant select on table public.activity_corrections to authenticated;
grant all on table public.activities, public.activity_participants,
  public.activity_sources, public.activity_attachments,
  public.activity_history_events, public.activity_corrections
to service_role;

create policy activities_select on public.activities for select to authenticated
using (private.is_super_admin() or private.is_member(agency_id));
create policy activities_insert on public.activities for insert to authenticated
with check (
  private.is_super_admin()
  or (private.is_member(agency_id) and created_by = (select auth.uid()))
);
create policy activities_update on public.activities for update to authenticated
using (private.is_super_admin() or private.is_member(agency_id))
with check (private.is_super_admin() or private.is_member(agency_id));

create policy activity_participants_select on public.activity_participants for select to authenticated
using (private.is_super_admin() or private.is_member(agency_id));
create policy activity_participants_insert on public.activity_participants for insert to authenticated
with check (private.is_super_admin() or (private.is_member(agency_id) and created_by = (select auth.uid())));
create policy activity_participants_update on public.activity_participants for update to authenticated
using (private.is_super_admin() or private.is_member(agency_id))
with check (private.is_super_admin() or private.is_member(agency_id));
create policy activity_participants_delete on public.activity_participants for delete to authenticated
using (private.is_super_admin() or private.is_member(agency_id));

create policy activity_sources_select on public.activity_sources for select to authenticated
using (private.is_super_admin() or private.is_member(agency_id));
create policy activity_sources_insert on public.activity_sources for insert to authenticated
with check (private.is_super_admin() or (private.is_member(agency_id) and created_by = (select auth.uid())));
create policy activity_sources_update on public.activity_sources for update to authenticated
using (private.is_super_admin() or private.is_member(agency_id))
with check (private.is_super_admin() or private.is_member(agency_id));
create policy activity_sources_delete on public.activity_sources for delete to authenticated
using (private.is_super_admin() or private.is_member(agency_id));

create policy activity_attachments_select on public.activity_attachments for select to authenticated
using (private.is_super_admin() or private.is_member(agency_id));
create policy activity_attachments_insert on public.activity_attachments for insert to authenticated
with check (private.is_super_admin() or (private.is_member(agency_id) and created_by = (select auth.uid())));
create policy activity_attachments_update on public.activity_attachments for update to authenticated
using (private.is_super_admin() or private.is_member(agency_id))
with check (private.is_super_admin() or private.is_member(agency_id));
create policy activity_attachments_delete on public.activity_attachments for delete to authenticated
using (private.is_super_admin() or private.is_member(agency_id));

create policy activity_history_events_select on public.activity_history_events for select to authenticated
using (private.is_super_admin() or private.is_member(agency_id));
create policy activity_history_events_insert on public.activity_history_events for insert to authenticated
with check (private.is_super_admin() or private.is_member(agency_id));

create policy activity_corrections_select on public.activity_corrections for select to authenticated
using (private.is_super_admin() or private.is_member(agency_id));

create trigger audit_activities after insert or update or delete on public.activities
for each row execute function private.log_audit_event();
create trigger audit_activity_participants after insert or update or delete on public.activity_participants
for each row execute function private.log_audit_event();
create trigger audit_activity_sources after insert or update or delete on public.activity_sources
for each row execute function private.log_audit_event();
create trigger audit_activity_attachments after insert or update or delete on public.activity_attachments
for each row execute function private.log_audit_event();
create trigger audit_activity_history_events after insert or update or delete on public.activity_history_events
for each row execute function private.log_audit_event();
create trigger audit_activity_corrections after insert or update or delete on public.activity_corrections
for each row execute function private.log_audit_event();

do $$
declare
  v_interactions integer;
  v_activities integer;
  v_events integer;
  v_internal_missing integer;
begin
  select count(*) into v_interactions from public.interactions;
  select count(*) into v_activities from public.activities where legacy_interaction_id is not null;
  select count(*) into v_events from public.activity_history_events where legacy_event_id is not null;
  select count(*) into v_internal_missing
  from public.activities a
  join public.interactions i on i.id = a.legacy_interaction_id
  where i.entity_type = 'Interne (CIR)'
    and not exists (
      select 1 from public.activity_participants ap
      where ap.activity_id = a.id and ap.participant_kind = 'internal'
    );

  if v_interactions <> 8 or v_activities <> v_interactions or v_events <> 24 or v_internal_missing <> 0 then
    raise exception using
      errcode = '23514',
      message = format('TA4_BACKFILL_INCOMPLETE: interactions=%s activities=%s events=%s internal_missing=%s', v_interactions, v_activities, v_events, v_internal_missing);
  end if;
end;
$$;
