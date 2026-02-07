-- Audit logs table and triggers

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_is_super_admin boolean not null default false,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_table text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_agency_id on public.audit_logs (agency_id);
create index if not exists idx_audit_logs_actor_id on public.audit_logs (actor_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select
on public.audit_logs
for select to authenticated
using (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
);

create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text := lower(TG_OP);
  v_actor_id uuid := auth.uid();
  v_is_super_admin boolean := coalesce(public.is_super_admin(), false);
  v_agency_id uuid;
  v_entity_id text;
  v_metadata jsonb := '{}'::jsonb;
begin
  if TG_OP = 'INSERT' then
    v_agency_id := NEW.agency_id;
    v_entity_id := NEW.id::text;
  elsif TG_OP = 'UPDATE' then
    v_agency_id := NEW.agency_id;
    v_entity_id := NEW.id::text;
  else
    v_agency_id := OLD.agency_id;
    v_entity_id := OLD.id::text;
  end if;

  if TG_TABLE_NAME = 'agency_members' then
    v_metadata := jsonb_build_object(
      'user_id', coalesce(NEW.user_id, OLD.user_id),
      'role', coalesce(NEW.role, OLD.role)
    );
  elsif TG_TABLE_NAME in ('agency_statuses', 'agency_services', 'agency_entities', 'agency_families') then
    v_metadata := jsonb_build_object(
      'label', coalesce(NEW.label, OLD.label)
    );
  end if;

  insert into public.audit_logs (
    agency_id,
    actor_id,
    actor_is_super_admin,
    action,
    entity_table,
    entity_id,
    metadata
  ) values (
    v_agency_id,
    v_actor_id,
    v_is_super_admin,
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    v_metadata
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

drop trigger if exists audit_interactions on public.interactions;
create trigger audit_interactions
after insert or update or delete on public.interactions
for each row execute function public.log_audit_event();

drop trigger if exists audit_agency_members on public.agency_members;
create trigger audit_agency_members
after insert or update or delete on public.agency_members
for each row execute function public.log_audit_event();

drop trigger if exists audit_agency_statuses on public.agency_statuses;
create trigger audit_agency_statuses
after insert or update or delete on public.agency_statuses
for each row execute function public.log_audit_event();

drop trigger if exists audit_agency_services on public.agency_services;
create trigger audit_agency_services
after insert or update or delete on public.agency_services
for each row execute function public.log_audit_event();

drop trigger if exists audit_agency_entities on public.agency_entities;
create trigger audit_agency_entities
after insert or update or delete on public.agency_entities
for each row execute function public.log_audit_event();

drop trigger if exists audit_agency_families on public.agency_families;
create trigger audit_agency_families
after insert or update or delete on public.agency_families
for each row execute function public.log_audit_event();
