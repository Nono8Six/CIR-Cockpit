-- Update role helpers + audit function + role/agency change guards

create or replace function public.user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select public.audit_actor_id());
$$;

create or replace function public.has_role(roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role = any(roles)
     from public.profiles p
     where p.id = (select public.audit_actor_id())),
    false
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role = 'super_admin'
     from public.profiles p
     where p.id = (select public.audit_actor_id())),
    false
  );
$$;

create or replace function public.has_agency_role(target_agency_id uuid, roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.agency_members m
    join public.profiles p on p.id = m.user_id
    where m.agency_id = target_agency_id
      and p.id = (select public.audit_actor_id())
      and p.role = any(roles)
  );
$$;

create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text := lower(TG_OP);
  v_actor_id uuid := public.audit_actor_id();
  v_is_super_admin boolean := coalesce(public.is_super_admin(), false);
  v_agency_id uuid;
  v_entity_id text;
  v_metadata jsonb;
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

  v_metadata := jsonb_build_object(
    'agency_id', v_agency_id::text,
    'entity_id', v_entity_id
  );

  if TG_TABLE_NAME = 'interactions' then
    if TG_OP = 'INSERT' then
      v_metadata := v_metadata || jsonb_build_object('status_after', NEW.status);
    elsif TG_OP = 'UPDATE' then
      if NEW.status is distinct from OLD.status then
        v_metadata := v_metadata || jsonb_build_object(
          'status_before', OLD.status,
          'status_after', NEW.status
        );
      end if;
    else
      v_metadata := v_metadata || jsonb_build_object('status_before', OLD.status);
    end if;
  elsif TG_TABLE_NAME = 'agency_members' then
    v_metadata := v_metadata || jsonb_build_object(
      'user_id', coalesce(NEW.user_id, OLD.user_id)
    );
  elsif TG_TABLE_NAME in ('agency_statuses', 'agency_services', 'agency_entities', 'agency_families') then
    v_metadata := v_metadata || jsonb_build_object(
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

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if NEW.role is distinct from OLD.role and not public.is_super_admin() then
    raise exception 'role update is restricted to super_admin';
  end if;
  return NEW;
end;
$$;

drop trigger if exists prevent_profile_role_change on public.profiles;
create trigger prevent_profile_role_change
before update on public.profiles
for each row execute function public.prevent_profile_role_change();

create or replace function public.prevent_client_agency_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if NEW.agency_id is distinct from OLD.agency_id and not public.is_super_admin() then
    raise exception 'client agency update is restricted to super_admin';
  end if;
  return NEW;
end;
$$;

drop trigger if exists prevent_client_agency_change on public.clients;
create trigger prevent_client_agency_change
before update of agency_id on public.clients
for each row execute function public.prevent_client_agency_change();
