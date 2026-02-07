-- Auth hardening + audit actor attribution improvements

alter table public.profiles
  add column if not exists must_change_password boolean not null default true,
  add column if not exists password_changed_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_password_changed_at_check,
  add constraint profiles_password_changed_at_check
    check (must_change_password or password_changed_at is not null);

create or replace function public.set_password_changed_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.must_change_password = false
    and (old.must_change_password is distinct from new.must_change_password) then
    new.password_changed_at = coalesce(new.password_changed_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists set_password_changed_at on public.profiles;
create trigger set_password_changed_at
before update on public.profiles
for each row execute function public.set_password_changed_at();

create or replace function public.safe_uuid(p_value text)
returns uuid
language plpgsql
stable
as $$
begin
  if p_value is null or p_value = '' then
    return null;
  end if;
  return p_value::uuid;
exception when others then
  return null;
end;
$$;

create or replace function public.jwt_sub()
returns uuid
language plpgsql
stable
as $$
declare
  v_claims text := current_setting('request.jwt.claims', true);
begin
  return public.safe_uuid((nullif(v_claims, '')::jsonb ->> 'sub'));
exception when others then
  return null;
end;
$$;

create or replace function public.app_actor_id()
returns uuid
language plpgsql
stable
as $$
begin
  return public.safe_uuid(current_setting('app.actor_id', true));
end;
$$;

create or replace function public.set_audit_actor(p_actor_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  select set_config('app.actor_id', p_actor_id::text, true);
$$;

create or replace function public.audit_actor_id()
returns uuid
language sql
stable
as $$
  select coalesce(auth.uid(), public.app_actor_id(), public.jwt_sub());
$$;

create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text := lower(TG_OP);
  v_actor_id uuid := public.audit_actor_id();
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

create or replace function public.set_interaction_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    new.updated_by = coalesce(public.audit_actor_id(), new.created_by);
    new.last_action_at = now();
  else
    new.updated_by = coalesce(public.audit_actor_id(), old.updated_by);
    new.last_action_at = now();
  end if;
  return new;
end;
$$;
