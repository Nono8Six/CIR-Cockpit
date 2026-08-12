-- B3-1 - Fondation additive Taches et relances.
-- Ce SQL ne retire ni public.interactions.reminder_at ni les donnees Activity.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'interactions' and column_name = 'reminder_at'
  ) then
    raise exception using errcode = '23514', message = 'B3_1_REMINDER_AT_ABSENT';
  end if;
end;
$$;
alter table public.agencies
  add column timezone text not null default 'Europe/Paris',
  add constraint agencies_timezone_trim
    check (timezone = btrim(timezone) and char_length(timezone) between 1 and 100);

alter table public.entities
  add constraint entities_id_agency_key unique (id, agency_id);

alter table public.activities
  add constraint activities_id_agency_organization_key unique (id, agency_id, organization_id);

create table public.task_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint task_types_code_check check (
    code = btrim(code) and char_length(code) between 1 and 80 and code ~ '^[a-z0-9_]+$'
  ),
  constraint task_types_label_check check (
    label = btrim(label) and char_length(label) between 1 and 120
  ),
  constraint task_types_sort_order_check check (sort_order >= 0),
  constraint task_types_archive_check check (
    (is_active and archived_at is null) or (not is_active and archived_at is not null)
  )
);

create unique index task_types_active_label_key
  on public.task_types (lower(label)) where is_active;
create index task_types_created_by_idx on public.task_types(created_by);
create index task_types_updated_by_idx on public.task_types(updated_by);

create table public.task_series (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  interval_value integer not null,
  interval_unit text not null,
  is_active boolean not null default true,
  task_type_id uuid not null references public.task_types(id) on delete restrict,
  title text not null,
  description text,
  planned_channel text,
  scope text not null,
  organization_id uuid,
  contact_id uuid,
  responsible_id uuid,
  priority text not null default 'normal',
  due_time time,
  due_timezone text not null,
  visibility text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  stopped_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  stopped_at timestamptz,
  constraint task_series_id_agency_key unique (id, agency_id),
  constraint task_series_organization_agency_fkey
    foreign key (organization_id, agency_id)
    references public.entities(id, agency_id) on delete restrict,
  constraint task_series_contact_organization_fkey
    foreign key (contact_id, organization_id)
    references public.entity_contacts(id, entity_id) on delete restrict,
  constraint task_series_responsible_agency_fkey
    foreign key (agency_id, responsible_id)
    references public.agency_members(agency_id, user_id) on delete restrict,
  constraint task_series_interval_check check (interval_value > 0),
  constraint task_series_unit_check check (interval_unit in ('day', 'week', 'month')),
  constraint task_series_title_check check (
    title = btrim(title) and char_length(title) between 1 and 200
  ),
  constraint task_series_description_check check (
    description is null or (description = btrim(description) and char_length(description) between 1 and 5000)
  ),
  constraint task_series_channel_check check (
    planned_channel is null or (planned_channel = btrim(planned_channel) and char_length(planned_channel) between 1 and 100)
  ),
  constraint task_series_scope_check check (scope in ('tier_relation', 'internal_cir')),
  constraint task_series_scope_links_check check (
    (scope = 'tier_relation' and organization_id is not null and visibility = 'tier')
    or
    (scope = 'internal_cir' and organization_id is null and contact_id is null and visibility in ('agency', 'restricted'))
  ),
  constraint task_series_priority_check check (priority in ('normal', 'high', 'urgent')),
  constraint task_series_timezone_check check (
    due_timezone = btrim(due_timezone) and char_length(due_timezone) between 1 and 100
  ),
  constraint task_series_stop_check check (
    (is_active and stopped_at is null and stopped_by is null)
    or (not is_active and stopped_at is not null and stopped_by is not null)
  )
);

create index task_series_agency_active_idx on public.task_series(agency_id, is_active);
create index task_series_task_type_id_idx on public.task_series(task_type_id);
create index task_series_organization_agency_idx on public.task_series(organization_id, agency_id)
  where organization_id is not null;
create index task_series_contact_organization_idx on public.task_series(contact_id, organization_id)
  where contact_id is not null;
create index task_series_agency_responsible_idx on public.task_series(agency_id, responsible_id)
  where responsible_id is not null;
create index task_series_created_by_idx on public.task_series(created_by);
create index task_series_stopped_by_idx on public.task_series(stopped_by) where stopped_by is not null;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  version integer not null default 1,
  title text not null,
  description text,
  task_type_id uuid not null references public.task_types(id) on delete restrict,
  planned_channel text,
  scope text not null,
  organization_id uuid,
  contact_id uuid,
  source_activity_id uuid,
  completion_activity_id uuid,
  created_by uuid not null references public.profiles(id) on delete restrict,
  responsible_id uuid,
  status text not null default 'todo',
  priority text not null default 'normal',
  due_date date not null,
  due_time time,
  due_timezone text not null,
  visibility text not null,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete restrict,
  canceled_at timestamptz,
  canceled_by uuid references public.profiles(id) on delete restrict,
  cancel_reason text,
  series_id uuid,
  previous_task_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_id_agency_key unique (id, agency_id),
  constraint tasks_organization_agency_fkey
    foreign key (organization_id, agency_id)
    references public.entities(id, agency_id) on delete restrict,
  constraint tasks_contact_organization_fkey
    foreign key (contact_id, organization_id)
    references public.entity_contacts(id, entity_id) on delete restrict,
  constraint tasks_source_activity_scope_fkey
    foreign key (source_activity_id, agency_id, organization_id)
    references public.activities(id, agency_id, organization_id) on delete restrict,
  constraint tasks_completion_activity_scope_fkey
    foreign key (completion_activity_id, agency_id, organization_id)
    references public.activities(id, agency_id, organization_id) on delete restrict,
  constraint tasks_responsible_agency_fkey
    foreign key (agency_id, responsible_id)
    references public.agency_members(agency_id, user_id) on delete restrict,
  constraint tasks_series_agency_fkey
    foreign key (series_id, agency_id)
    references public.task_series(id, agency_id) on delete restrict,
  constraint tasks_previous_agency_fkey
    foreign key (previous_task_id, agency_id)
    references public.tasks(id, agency_id) on delete restrict,
  constraint tasks_version_check check (version >= 1),
  constraint tasks_title_check check (
    title = btrim(title) and char_length(title) between 1 and 200
  ),
  constraint tasks_description_check check (
    description is null or (description = btrim(description) and char_length(description) between 1 and 5000)
  ),
  constraint tasks_channel_check check (
    planned_channel is null or (planned_channel = btrim(planned_channel) and char_length(planned_channel) between 1 and 100)
  ),
  constraint tasks_scope_check check (scope in ('tier_relation', 'internal_cir')),
  constraint tasks_scope_links_check check (
    (scope = 'tier_relation' and organization_id is not null and visibility = 'tier')
    or
    (scope = 'internal_cir' and organization_id is null and contact_id is null
      and source_activity_id is null and completion_activity_id is null
      and visibility in ('agency', 'restricted'))
  ),
  constraint tasks_status_check check (status in ('todo', 'in_progress', 'completed', 'canceled')),
  constraint tasks_priority_check check (priority in ('normal', 'high', 'urgent')),
  constraint tasks_in_progress_responsible_check check (status <> 'in_progress' or responsible_id is not null),
  constraint tasks_timezone_check check (
    due_timezone = btrim(due_timezone) and char_length(due_timezone) between 1 and 100
  ),
  constraint tasks_completion_check check (
    (status = 'completed' and completed_at is not null and completed_by is not null
      and canceled_at is null and canceled_by is null and cancel_reason is null)
    or
    (status <> 'completed' and completed_at is null and completed_by is null)
  ),
  constraint tasks_cancellation_check check (
    (status = 'canceled' and canceled_at is not null and canceled_by is not null
      and completed_at is null and completed_by is null)
    or
    (status <> 'canceled' and canceled_at is null and canceled_by is null and cancel_reason is null)
  ),
  constraint tasks_cancel_reason_check check (
    cancel_reason is null or (cancel_reason = btrim(cancel_reason) and char_length(cancel_reason) between 1 and 1000)
  ),
  constraint tasks_completion_activity_check check (
    completion_activity_id is null or status = 'completed'
  ),
  constraint tasks_previous_not_self_check check (previous_task_id is null or previous_task_id <> id)
);

create unique index tasks_previous_task_id_key
  on public.tasks(previous_task_id) where previous_task_id is not null;
create index tasks_agency_status_due_idx on public.tasks(agency_id, status, due_date, due_time);
create index tasks_responsible_status_due_idx on public.tasks(responsible_id, status, due_date, due_time)
  where responsible_id is not null;
create index tasks_organization_agency_status_due_idx on public.tasks(organization_id, agency_id, status, due_date)
  where organization_id is not null;
create index tasks_contact_organization_status_due_idx on public.tasks(contact_id, organization_id, status, due_date)
  where contact_id is not null;
create index tasks_source_activity_scope_idx on public.tasks(source_activity_id, agency_id, organization_id)
  where source_activity_id is not null;
create index tasks_completion_activity_scope_idx on public.tasks(completion_activity_id, agency_id, organization_id)
  where completion_activity_id is not null;
create index tasks_task_type_status_idx on public.tasks(task_type_id, status);
create index tasks_priority_status_due_idx on public.tasks(priority, status, due_date);
create index tasks_created_by_idx on public.tasks(created_by);
create index tasks_completed_by_idx on public.tasks(completed_by) where completed_by is not null;
create index tasks_canceled_by_idx on public.tasks(canceled_by) where canceled_by is not null;
create index tasks_agency_responsible_fk_idx on public.tasks(agency_id, responsible_id)
  where responsible_id is not null;
create index tasks_series_agency_idx on public.tasks(series_id, agency_id) where series_id is not null;
create index tasks_previous_agency_idx on public.tasks(previous_task_id, agency_id) where previous_task_id is not null;
create index tasks_open_agency_due_idx on public.tasks(agency_id, due_date, due_time)
  where status in ('todo', 'in_progress');
create index tasks_open_queue_idx on public.tasks(agency_id, due_date, due_time)
  where status = 'todo' and responsible_id is null;

create table public.task_participants (
  task_id uuid not null,
  agency_id uuid not null,
  profile_id uuid not null,
  participant_role text not null,
  added_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint task_participants_pkey primary key (task_id, profile_id, participant_role),
  constraint task_participants_task_agency_fkey
    foreign key (task_id, agency_id)
    references public.tasks(id, agency_id) on delete cascade,
  constraint task_participants_profile_agency_fkey
    foreign key (agency_id, profile_id)
    references public.agency_members(agency_id, user_id) on delete restrict,
  constraint task_participants_role_check check (participant_role in ('contributor', 'follower'))
);

create index task_participants_task_agency_idx on public.task_participants(task_id, agency_id);
create index task_participants_agency_profile_idx on public.task_participants(agency_id, profile_id);
create index task_participants_profile_role_task_idx
  on public.task_participants(profile_id, participant_role, task_id);
create index task_participants_added_by_idx on public.task_participants(added_by);

create table public.task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  agency_id uuid not null,
  event_order integer not null,
  event_type text not null,
  actor_kind text not null,
  actor_id uuid references public.profiles(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  task_version integer not null,
  previous_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  note text,
  constraint task_events_task_agency_fkey
    foreign key (task_id, agency_id)
    references public.tasks(id, agency_id) on delete cascade,
  constraint task_events_task_order_key unique (task_id, event_order),
  constraint task_events_order_check check (event_order > 0),
  constraint task_events_type_check check (event_type in (
    'created', 'content_changed', 'type_changed', 'link_changed',
    'responsible_changed', 'participant_added', 'participant_removed',
    'due_changed', 'priority_changed', 'status_changed', 'reopened',
    'note_added', 'series_attached', 'series_stopped',
    'next_occurrence_created', 'completion_activity_created'
  )),
  constraint task_events_actor_kind_check check (actor_kind in ('user', 'system')),
  constraint task_events_actor_check check (
    (actor_kind = 'user' and actor_id is not null)
    or (actor_kind = 'system' and actor_id is null)
  ),
  constraint task_events_version_check check (task_version > 0),
  constraint task_events_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint task_events_payload_size_check check (
    coalesce(pg_column_size(previous_value), 0)
    + coalesce(pg_column_size(new_value), 0)
    + pg_column_size(metadata) <= 16384
  ),
  constraint task_events_note_check check (
    note is null or (note = btrim(note) and char_length(note) between 1 and 1000)
  )
);

create index task_events_task_agency_idx on public.task_events(task_id, agency_id);
create index task_events_actor_id_idx on public.task_events(actor_id) where actor_id is not null;

create trigger set_updated_at_task_types
before update on public.task_types
for each row execute function private.set_updated_at();

create or replace function private.normalize_task_type_creation_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    new.created_at := clock_timestamp();
    new.updated_at := new.created_at;
  end if;
  return new;
end;
$$;

create trigger normalize_task_type_creation_audit
before insert on public.task_types
for each row execute function private.normalize_task_type_creation_audit();

create or replace function private.protect_task_type_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.code is distinct from old.code then
    raise exception using errcode = '23514', message = 'TASK_TYPE_CODE_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger protect_task_type_code
before update on public.task_types
for each row execute function private.protect_task_type_code();

create or replace function private.enforce_task_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.version <> old.version + 1 then
    raise exception using
      errcode = '40001',
      message = 'TASK_VERSION_CONFLICT';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create trigger enforce_task_version
before update on public.tasks
for each row execute function private.enforce_task_version();

create or replace function private.can_read_task(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = target_task_id
      and (
        (select private.is_super_admin())
        or (
          private.is_member(t.agency_id)
          and (
            t.scope = 'tier_relation'
            or t.visibility = 'agency'
            or t.created_by = (select auth.uid())
            or t.responsible_id = (select auth.uid())
            or exists (
              select 1 from public.task_participants tp
              where tp.task_id = t.id and tp.profile_id = (select auth.uid())
            )
            or exists (
              select 1 from public.profiles p
              where p.id = (select auth.uid()) and p.role = 'agency_admin'
            )
          )
        )
      )
  );
$$;

revoke execute on function private.enforce_task_version() from public, anon, authenticated, service_role;
revoke execute on function private.normalize_task_type_creation_audit() from public, anon, authenticated, service_role;
revoke execute on function private.protect_task_type_code() from public, anon, authenticated, service_role;
revoke execute on function private.can_read_task(uuid) from public, anon;
grant execute on function private.can_read_task(uuid) to authenticated, service_role;

create or replace function private.log_task_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_actor_id uuid := private.audit_actor_id();
  v_agency_id uuid := nullif(v_row ->> 'agency_id', '')::uuid;
  v_entity_id text := coalesce(v_row ->> 'id', v_row ->> 'task_id', v_row ->> 'code');
  v_metadata jsonb;
begin
  v_metadata := jsonb_strip_nulls(jsonb_build_object(
    'agency_id', v_row ->> 'agency_id',
    'task_id', coalesce(v_row ->> 'task_id', case when tg_table_name = 'tasks' then v_row ->> 'id' end),
    'version', coalesce(v_row ->> 'version', v_row ->> 'task_version'),
    'status', v_row ->> 'status',
    'event_type', v_row ->> 'event_type',
    'participant_role', v_row ->> 'participant_role'
  ));

  insert into public.audit_logs (
    agency_id, actor_id, actor_is_super_admin, action, entity_table, entity_id, metadata
  ) values (
    v_agency_id,
    v_actor_id,
    coalesce(private.is_super_admin(), false),
    lower(tg_op),
    tg_table_name,
    v_entity_id,
    v_metadata
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke execute on function private.log_task_audit_event() from public, anon, authenticated, service_role;

create trigger audit_task_types after insert or update or delete on public.task_types
for each row execute function private.log_task_audit_event();
create trigger audit_task_series after insert or update or delete on public.task_series
for each row execute function private.log_task_audit_event();
create trigger audit_tasks after insert or update or delete on public.tasks
for each row execute function private.log_task_audit_event();
create trigger audit_task_participants after insert or update or delete on public.task_participants
for each row execute function private.log_task_audit_event();
create trigger audit_task_events after insert on public.task_events
for each row execute function private.log_task_audit_event();

alter table public.task_types enable row level security;
alter table public.task_types force row level security;
alter table public.task_series enable row level security;
alter table public.task_series force row level security;
alter table public.tasks enable row level security;
alter table public.tasks force row level security;
alter table public.task_participants enable row level security;
alter table public.task_participants force row level security;
alter table public.task_events enable row level security;
alter table public.task_events force row level security;

revoke all on table public.task_types, public.task_series, public.tasks,
  public.task_participants, public.task_events
from public, anon, authenticated;

grant select, insert on table public.task_types to authenticated;
grant update (label, sort_order, is_active, updated_by, archived_at)
on table public.task_types to authenticated;
grant select on table public.task_series to authenticated;
grant select, insert on table public.tasks to authenticated;
grant select on table public.task_participants to authenticated;
grant select on table public.task_events to authenticated;
grant select, insert, update on table public.task_types, public.task_series, public.tasks
to service_role;
grant select, insert, update, delete on table public.task_participants to service_role;
grant select, insert on table public.task_events to service_role;

create policy task_types_select on public.task_types
for select to authenticated using (true);
create policy task_types_insert on public.task_types
for insert to authenticated with check (
  (select private.is_super_admin())
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and is_active
  and archived_at is null
);
create policy task_types_update on public.task_types
for update to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()) and updated_by = (select auth.uid()));

create policy task_series_select on public.task_series
for select to authenticated using (
  (select private.is_super_admin())
  or (
    private.is_member(agency_id)
    and (
      scope = 'tier_relation'
      or visibility = 'agency'
      or created_by = (select auth.uid())
      or responsible_id = (select auth.uid())
      or exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid()) and p.role = 'agency_admin'
      )
    )
  )
);
create policy tasks_select on public.tasks
for select to authenticated using ((select private.can_read_task(id)));
create policy tasks_insert on public.tasks
for insert to authenticated with check (
  ((select private.is_super_admin()) or private.is_member(agency_id))
  and created_by = (select auth.uid())
  and version = 1
  and status = 'todo'
  and (responsible_id is null or responsible_id = (select auth.uid()))
  and series_id is null
  and previous_task_id is null
  and completion_activity_id is null
  and due_timezone = (select a.timezone from public.agencies a where a.id = tasks.agency_id)
  and exists (select 1 from public.task_types tt where tt.id = tasks.task_type_id and tt.is_active)
);

create policy task_participants_select on public.task_participants
for select to authenticated using ((select private.can_read_task(task_id)));
create policy task_events_select on public.task_events
for select to authenticated using ((select private.can_read_task(task_id)));

comment on table public.task_types is 'Referentiel global CIR des types de tache, administre par les super-admins.';
comment on table public.tasks is 'Travail futur CIR distinct des activites passees, isole par agence et versionne.';
comment on table public.task_participants is 'Contributeurs et suiveurs secondaires des taches.';
comment on table public.task_events is 'Journal metier append-only des mutations de tache.';
comment on table public.task_series is 'Parametres figes des recurrents simples de taches.';

do $$
declare
  v_unforced integer;
  v_delete_grants integer;
  v_excess_grants integer;
  v_missing_fk_indexes integer;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'interactions' and column_name = 'reminder_at'
  ) then
    raise exception using errcode = '23514', message = 'B3_1_REMINDER_AT_REMOVED';
  end if;

  select count(*) into v_unforced
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('task_types', 'task_series', 'tasks', 'task_participants', 'task_events')
    and (not c.relrowsecurity or not c.relforcerowsecurity);

  select count(*) into v_delete_grants
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('task_types', 'task_series', 'tasks', 'task_events')
    and grantee = 'authenticated'
    and privilege_type = 'DELETE';

  select count(*) into v_excess_grants
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee = 'authenticated'
    and table_name in ('task_types', 'task_series', 'tasks', 'task_participants', 'task_events')
    and not (
      privilege_type = 'SELECT'
      or (table_name = 'task_types' and privilege_type in ('INSERT', 'UPDATE'))
      or (table_name = 'tasks' and privilege_type = 'INSERT')
    );

  select count(*) into v_missing_fk_indexes
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where con.contype = 'f'
    and nsp.nspname = 'public'
    and rel.relname in ('task_types', 'task_series', 'tasks', 'task_participants', 'task_events')
    and not exists (
      select 1 from pg_index idx
      where idx.indrelid = con.conrelid
        and idx.indkey::smallint[] @> con.conkey
    );

  if v_unforced <> 0 or v_delete_grants <> 0 or v_excess_grants <> 0 or v_missing_fk_indexes <> 0 then
    raise exception using
      errcode = '23514',
      message = format(
        'B3_1_FOUNDATION_INCOMPLETE: unforced=%s delete_grants=%s excess_grants=%s missing_fk_indexes=%s',
        v_unforced, v_delete_grants, v_excess_grants, v_missing_fk_indexes
      );
  end if;
end;
$$;
