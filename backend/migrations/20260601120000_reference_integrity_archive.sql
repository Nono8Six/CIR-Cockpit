alter table public.agency_services
  add column if not exists archived_at timestamptz;

alter table public.agency_families
  add column if not exists archived_at timestamptz;

create index if not exists idx_agency_services_agency_archived_sort
  on public.agency_services (agency_id, archived_at, sort_order);

create index if not exists idx_agency_families_agency_archived_sort
  on public.agency_families (agency_id, archived_at, sort_order);

create index if not exists idx_agency_interaction_types_agency_archived_sort
  on public.agency_interaction_types (agency_id, archived_at, sort_order);

create table if not exists public.agency_reference_resolutions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  dimension text not null check (dimension in ('statuses', 'services', 'families', 'interaction_types')),
  source_label text not null check (source_label = btrim(source_label) and char_length(source_label) > 0),
  target_status_id uuid references public.agency_statuses(id) on delete restrict,
  target_service_id uuid references public.agency_services(id) on delete restrict,
  target_family_id uuid references public.agency_families(id) on delete restrict,
  target_interaction_type_id uuid references public.agency_interaction_types(id) on delete restrict,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agency_reference_resolutions_target_check check (
    (dimension = 'statuses' and target_status_id is not null and target_service_id is null and target_family_id is null and target_interaction_type_id is null)
    or (dimension = 'services' and target_status_id is null and target_service_id is not null and target_family_id is null and target_interaction_type_id is null)
    or (dimension = 'families' and target_status_id is null and target_service_id is null and target_family_id is not null and target_interaction_type_id is null)
    or (dimension = 'interaction_types' and target_status_id is null and target_service_id is null and target_family_id is null and target_interaction_type_id is not null)
  )
);

create unique index if not exists agency_reference_resolutions_agency_dimension_source_key
  on public.agency_reference_resolutions (agency_id, dimension, lower(btrim(source_label)));
create index if not exists agency_reference_resolutions_agency_dimension_idx
  on public.agency_reference_resolutions (agency_id, dimension);
create index if not exists agency_reference_resolutions_target_status_idx
  on public.agency_reference_resolutions (target_status_id) where target_status_id is not null;
create index if not exists agency_reference_resolutions_target_service_idx
  on public.agency_reference_resolutions (target_service_id) where target_service_id is not null;
create index if not exists agency_reference_resolutions_target_family_idx
  on public.agency_reference_resolutions (target_family_id) where target_family_id is not null;
create index if not exists agency_reference_resolutions_target_interaction_type_idx
  on public.agency_reference_resolutions (target_interaction_type_id) where target_interaction_type_id is not null;
create index if not exists agency_reference_resolutions_resolved_by_idx
  on public.agency_reference_resolutions (resolved_by) where resolved_by is not null;

alter table public.agency_reference_resolutions enable row level security;
alter table public.agency_reference_resolutions force row level security;

create policy agency_reference_resolutions_select on public.agency_reference_resolutions
  for select to authenticated using (private.is_super_admin() or private.is_member(agency_id));
create policy agency_reference_resolutions_insert on public.agency_reference_resolutions
  for insert to authenticated with check (private.is_super_admin() or private.has_agency_role(agency_id, array['agency_admin'::public.user_role]));
create policy agency_reference_resolutions_update on public.agency_reference_resolutions
  for update to authenticated using (private.is_super_admin() or private.has_agency_role(agency_id, array['agency_admin'::public.user_role]))
  with check (private.is_super_admin() or private.has_agency_role(agency_id, array['agency_admin'::public.user_role]));
create policy agency_reference_resolutions_delete on public.agency_reference_resolutions
  for delete to authenticated using (private.is_super_admin() or private.has_agency_role(agency_id, array['agency_admin'::public.user_role]));

grant select, insert, update, delete on table public.agency_reference_resolutions to authenticated;

drop trigger if exists set_updated_at_agency_reference_resolutions on public.agency_reference_resolutions;
create trigger set_updated_at_agency_reference_resolutions
  before update on public.agency_reference_resolutions
  for each row execute function private.set_updated_at();

drop trigger if exists audit_agency_reference_resolutions on public.agency_reference_resolutions;
create trigger audit_agency_reference_resolutions
  after insert or update or delete on public.agency_reference_resolutions
  for each row execute function private.log_audit_event();

create or replace function private.log_audit_event()
returns trigger language plpgsql security definer set search_path to ''
as $function$
declare
  v_action text := lower(TG_OP); v_actor_id uuid := private.audit_actor_id();
  v_is_super_admin boolean := coalesce(private.is_super_admin(), false);
  v_agency_id uuid; v_entity_id text; v_metadata jsonb; v_entity_ref uuid;
begin
  if TG_TABLE_NAME = 'agencies' then
    v_entity_id := coalesce(NEW.id, OLD.id)::text;
    if TG_OP = 'DELETE' then v_agency_id := null; else v_agency_id := coalesce(NEW.id, OLD.id); end if;
  else v_entity_id := coalesce(NEW.id, OLD.id)::text; end if;
  if TG_TABLE_NAME = 'entity_contacts' then
    v_entity_ref := coalesce(NEW.entity_id, OLD.entity_id);
    select e.agency_id into v_agency_id from public.entities e where e.id = v_entity_ref;
  elsif TG_TABLE_NAME = 'interactions' then
    v_agency_id := coalesce(NEW.agency_id, OLD.agency_id);
    if v_agency_id is null then
      v_entity_ref := coalesce(NEW.entity_id, OLD.entity_id);
      select e.agency_id into v_agency_id from public.entities e where e.id = v_entity_ref;
    end if;
  elsif TG_TABLE_NAME <> 'agencies' then v_agency_id := coalesce(NEW.agency_id, OLD.agency_id); end if;
  v_metadata := jsonb_build_object('agency_id', v_agency_id::text, 'entity_id', v_entity_id);
  if TG_TABLE_NAME = 'agencies' then v_metadata := v_metadata || jsonb_build_object('name', coalesce(NEW.name, OLD.name));
  elsif TG_TABLE_NAME = 'entities' then v_metadata := v_metadata || jsonb_build_object('entity_type', coalesce(NEW.entity_type, OLD.entity_type), 'client_number', coalesce(NEW.client_number, OLD.client_number), 'name', coalesce(NEW.name, OLD.name));
  elsif TG_TABLE_NAME = 'entity_contacts' then v_metadata := v_metadata || jsonb_build_object('entity_id', coalesce(NEW.entity_id, OLD.entity_id), 'email', coalesce(NEW.email, OLD.email), 'phone', coalesce(NEW.phone, OLD.phone), 'position', coalesce(NEW.position, OLD.position));
  elsif TG_TABLE_NAME = 'interactions' then
    if TG_OP = 'INSERT' then v_metadata := v_metadata || jsonb_build_object('status_after', NEW.status);
    elsif TG_OP = 'UPDATE' and NEW.status is distinct from OLD.status then v_metadata := v_metadata || jsonb_build_object('status_before', OLD.status, 'status_after', NEW.status);
    elsif TG_OP = 'DELETE' then v_metadata := v_metadata || jsonb_build_object('status_before', OLD.status); end if;
  elsif TG_TABLE_NAME = 'agency_members' then v_metadata := v_metadata || jsonb_build_object('user_id', coalesce(NEW.user_id, OLD.user_id));
  elsif TG_TABLE_NAME in ('agency_statuses', 'agency_services', 'agency_entities', 'agency_families', 'agency_interaction_types') then v_metadata := v_metadata || jsonb_build_object('label', coalesce(NEW.label, OLD.label));
  elsif TG_TABLE_NAME = 'agency_reference_resolutions' then v_metadata := v_metadata || jsonb_build_object('dimension', coalesce(NEW.dimension, OLD.dimension), 'source_label', coalesce(NEW.source_label, OLD.source_label), 'target_status_id', coalesce(NEW.target_status_id, OLD.target_status_id), 'target_service_id', coalesce(NEW.target_service_id, OLD.target_service_id), 'target_family_id', coalesce(NEW.target_family_id, OLD.target_family_id), 'target_interaction_type_id', coalesce(NEW.target_interaction_type_id, OLD.target_interaction_type_id), 'resolved_by', coalesce(NEW.resolved_by, OLD.resolved_by));
  end if;
  insert into public.audit_logs (agency_id, actor_id, actor_is_super_admin, action, entity_table, entity_id, metadata)
  values (v_agency_id, v_actor_id, v_is_super_admin, v_action, TG_TABLE_NAME, v_entity_id, v_metadata);
  if TG_OP = 'DELETE' then return OLD; end if; return NEW;
end;
$function$;
