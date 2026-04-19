-- Phase 3.1 - Move privileged helper logic out of public and harden policies/triggers/RLS.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

grant usage on schema private to authenticated;
grant usage on schema private to service_role;

alter default privileges in schema private revoke all on tables from public, anon, authenticated;
alter default privileges in schema private revoke all on sequences from public, anon, authenticated;
alter default privileges in schema private revoke all on functions from public, anon, authenticated;

do $$
declare
  function_row record;
begin
  for function_row in
    select
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'app_actor_id',
        'archive_audit_logs_older_than',
        'audit_actor_id',
        'check_rate_limit',
        'handle_new_user',
        'handle_user_update',
        'hard_delete_agency',
        'has_agency_role',
        'has_role',
        'is_member',
        'is_super_admin',
        'jwt_sub',
        'log_audit_event',
        'prevent_entity_agency_change',
        'prevent_profile_identity_change',
        'prevent_profile_role_change',
        'run_audit_logs_retention',
        'safe_uuid',
        'set_audit_actor',
        'set_entity_created_by',
        'set_interaction_audit_fields',
        'set_password_changed_at',
        'set_updated_at',
        'sync_interaction_status',
        'sync_status_label_on_update',
        'user_role'
      )
    order by p.proname
  loop
    execute format(
      'alter function public.%I(%s) set schema private',
      function_row.function_name,
      function_row.identity_args
    );
  end loop;
end
$$;

create or replace function private.safe_uuid(p_value text)
returns uuid
language plpgsql
stable
set search_path to ''
as $function$
begin
  if p_value is null or p_value = '' then
    return null;
  end if;
  return p_value::uuid;
exception when others then
  return null;
end;
$function$;

create or replace function private.app_actor_id()
returns uuid
language plpgsql
stable
set search_path to ''
as $function$
begin
  return private.safe_uuid(current_setting('app.actor_id', true));
end;
$function$;

create or replace function private.jwt_sub()
returns uuid
language plpgsql
stable
set search_path to ''
as $function$
declare
  v_claims text := current_setting('request.jwt.claims', true);
begin
  return private.safe_uuid((nullif(v_claims, '')::jsonb ->> 'sub'));
exception when others then
  return null;
end;
$function$;

create or replace function private.audit_actor_id()
returns uuid
language sql
stable
set search_path to ''
as $function$
  select coalesce(auth.uid(), private.app_actor_id(), private.jwt_sub());
$function$;

create or replace function private.is_super_admin()
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select coalesce(
    (select p.role = 'super_admin'
     from public.profiles p
     where p.id = (select private.audit_actor_id())),
    false
  );
$function$;

create or replace function private.has_role(roles public.user_role[])
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select coalesce(
    (select p.role = any(roles)
     from public.profiles p
     where p.id = (select private.audit_actor_id())),
    false
  );
$function$;

create or replace function private.user_role()
returns public.user_role
language sql
stable security definer
set search_path to ''
as $function$
  select p.role
  from public.profiles p
  where p.id = (select private.audit_actor_id());
$function$;

create or replace function private.has_agency_role(target_agency_id uuid, roles public.user_role[])
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.agency_members m
    join public.profiles p on p.id = m.user_id
    where m.agency_id = target_agency_id
      and p.id = (select private.audit_actor_id())
      and p.role = any(roles)
  );
$function$;

create or replace function private.run_audit_logs_retention(
  p_before timestamp with time zone default (timezone('utc'::text, now()) - '1 year'::interval),
  p_batch_size integer default 5000,
  p_max_batches integer default 20
)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_total integer := 0;
  v_batch integer := 0;
  v_limit integer := greatest(1, least(coalesce(p_max_batches, 20), 500));
  v_once integer := 0;
begin
  for v_batch in 1..v_limit loop
    v_once := private.archive_audit_logs_older_than(p_before, p_batch_size);
    v_total := v_total + v_once;
    exit when v_once = 0;
  end loop;

  return v_total;
end;
$function$;

create or replace function private.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_action text := lower(TG_OP);
  v_actor_id uuid := private.audit_actor_id();
  v_is_super_admin boolean := coalesce(private.is_super_admin(), false);
  v_agency_id uuid;
  v_entity_id text;
  v_metadata jsonb;
  v_entity_ref uuid;
begin
  if TG_TABLE_NAME = 'agencies' then
    v_entity_id := coalesce(NEW.id, OLD.id)::text;
    if TG_OP = 'DELETE' then
      v_agency_id := null;
    else
      v_agency_id := coalesce(NEW.id, OLD.id);
    end if;
  else
    v_entity_id := coalesce(NEW.id, OLD.id)::text;
  end if;

  if TG_TABLE_NAME = 'entity_contacts' then
    v_entity_ref := coalesce(NEW.entity_id, OLD.entity_id);
    select e.agency_id into v_agency_id
    from public.entities e
    where e.id = v_entity_ref;
  elsif TG_TABLE_NAME = 'interactions' then
    v_agency_id := coalesce(NEW.agency_id, OLD.agency_id);
    if v_agency_id is null then
      v_entity_ref := coalesce(NEW.entity_id, OLD.entity_id);
      select e.agency_id into v_agency_id
      from public.entities e
      where e.id = v_entity_ref;
    end if;
  elsif TG_TABLE_NAME <> 'agencies' then
    v_agency_id := coalesce(NEW.agency_id, OLD.agency_id);
  end if;

  v_metadata := jsonb_build_object(
    'agency_id', v_agency_id::text,
    'entity_id', v_entity_id
  );

  if TG_TABLE_NAME = 'agencies' then
    v_metadata := v_metadata || jsonb_build_object(
      'name', coalesce(NEW.name, OLD.name)
    );
  elsif TG_TABLE_NAME = 'entities' then
    v_metadata := v_metadata || jsonb_build_object(
      'entity_type', coalesce(NEW.entity_type, OLD.entity_type),
      'client_number', coalesce(NEW.client_number, OLD.client_number),
      'name', coalesce(NEW.name, OLD.name)
    );
  elsif TG_TABLE_NAME = 'entity_contacts' then
    v_metadata := v_metadata || jsonb_build_object(
      'entity_id', coalesce(NEW.entity_id, OLD.entity_id),
      'email', coalesce(NEW.email, OLD.email),
      'phone', coalesce(NEW.phone, OLD.phone),
      'position', coalesce(NEW.position, OLD.position)
    );
  elsif TG_TABLE_NAME = 'interactions' then
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
$function$;

create or replace function private.prevent_entity_agency_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.agency_id is distinct from old.agency_id and not private.is_super_admin() then
    raise exception 'entity agency update is restricted to super_admin';
  end if;
  return new;
end;
$function$;

create or replace function private.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if NEW.role is distinct from OLD.role and not private.is_super_admin() then
    raise exception 'role update is restricted to super_admin';
  end if;
  return NEW;
end;
$function$;

create or replace function private.set_entity_created_by()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.created_by is null then
    new.created_by := private.audit_actor_id();
  end if;
  return new;
end;
$function$;

create or replace function private.set_interaction_audit_fields()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if TG_OP = 'INSERT' then
    new.updated_by = coalesce(private.audit_actor_id(), new.created_by);
    new.last_action_at = now();
  else
    new.updated_by = coalesce(private.audit_actor_id(), old.updated_by);
    new.last_action_at = now();
  end if;
  return new;
end;
$function$;

do $$
declare
  policy_row record;
  new_qual text;
  new_with_check text;
  statement text;
begin
  for policy_row in
    select
      schemaname,
      tablename,
      policyname,
      qual,
      with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') ~ '(is_super_admin|is_member|has_agency_role|has_role|user_role)'
        or coalesce(with_check, '') ~ '(is_super_admin|is_member|has_agency_role|has_role|user_role)'
      )
  loop
    new_qual := policy_row.qual;
    new_with_check := policy_row.with_check;

    if new_qual is not null then
      new_qual := regexp_replace(
        new_qual,
        'public\.(is_super_admin|is_member|has_agency_role|has_role|user_role)\(',
        'private.\1(',
        'g'
      );
      new_qual := regexp_replace(
        new_qual,
        '(^|[^[:alnum:]_\.])(is_super_admin|is_member|has_agency_role|has_role|user_role)\(',
        E'\\1private.\\2(',
        'g'
      );
    end if;

    if new_with_check is not null then
      new_with_check := regexp_replace(
        new_with_check,
        'public\.(is_super_admin|is_member|has_agency_role|has_role|user_role)\(',
        'private.\1(',
        'g'
      );
      new_with_check := regexp_replace(
        new_with_check,
        '(^|[^[:alnum:]_\.])(is_super_admin|is_member|has_agency_role|has_role|user_role)\(',
        E'\\1private.\\2(',
        'g'
      );
    end if;

    statement := format('alter policy %I on public.%I', policy_row.policyname, policy_row.tablename);

    if new_qual is not null then
      statement := statement || format(' using (%s)', new_qual);
    end if;

    if new_with_check is not null then
      statement := statement || format(' with check (%s)', new_with_check);
    end if;

    execute statement;
  end loop;
end
$$;

do $$
declare
  trigger_row record;
  trigger_definition text;
begin
  for trigger_row in
    select
      schema_name,
      table_name,
      tgname,
      function_name,
      pg_get_triggerdef(trigger_oid, true) as definition
    from (
      select
        n.nspname as schema_name,
        c.relname as table_name,
        t.tgname,
        p.proname as function_name,
        t.oid as trigger_oid
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_proc p on p.oid = t.tgfoid
      join pg_namespace pn on pn.oid = p.pronamespace
      where not t.tgisinternal
        and pn.nspname = 'private'
        and p.proname in (
          'handle_new_user',
          'handle_user_update',
          'log_audit_event',
          'prevent_entity_agency_change',
          'prevent_profile_identity_change',
          'prevent_profile_role_change',
          'set_entity_created_by',
          'set_interaction_audit_fields',
          'set_password_changed_at',
          'set_updated_at',
          'sync_interaction_status',
          'sync_status_label_on_update'
        )
    ) trigger_source
  loop
    trigger_definition := replace(
      trigger_row.definition,
      format('EXECUTE FUNCTION %I(', trigger_row.function_name),
      format('EXECUTE FUNCTION private.%I(', trigger_row.function_name)
    );
    trigger_definition := replace(
      trigger_definition,
      format('EXECUTE FUNCTION public.%I(', trigger_row.function_name),
      format('EXECUTE FUNCTION private.%I(', trigger_row.function_name)
    );

    execute format(
      'drop trigger if exists %I on %I.%I',
      trigger_row.tgname,
      trigger_row.schema_name,
      trigger_row.table_name
    );
    execute trigger_definition;
  end loop;
end
$$;

do $$
declare
  cron_row record;
  new_command text;
begin
  for cron_row in
    select jobid, command
    from cron.job
    where command like '%run_audit_logs_retention(%'
  loop
    new_command := case
      when cron_row.command like '%private.run_audit_logs_retention(%' then cron_row.command
      when cron_row.command like '%public.run_audit_logs_retention(%' then replace(
        cron_row.command,
        'public.run_audit_logs_retention(',
        'private.run_audit_logs_retention('
      )
      else replace(
        cron_row.command,
        'run_audit_logs_retention(',
        'private.run_audit_logs_retention('
      )
    end;

    if new_command is distinct from cron_row.command then
      perform cron.alter_job(
        job_id := cron_row.jobid,
        command := new_command
      );
    end if;
  end loop;
end
$$;

alter table public.app_settings enable row level security;
alter table public.app_settings force row level security;
alter table public.agency_settings enable row level security;
alter table public.agency_settings force row level security;
alter table public.directory_saved_views enable row level security;
alter table public.directory_saved_views force row level security;
alter table public.reference_departments enable row level security;
alter table public.reference_departments force row level security;

revoke all on all functions in schema private from public;
revoke all on all functions in schema private from anon;
revoke all on all functions in schema private from authenticated;
revoke all on all functions in schema private from service_role;

grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.has_agency_role(uuid, public.user_role[]) to authenticated;
grant execute on function private.has_role(public.user_role[]) to authenticated;
grant execute on function private.user_role() to authenticated;

grant execute on function private.check_rate_limit(text, integer, integer) to service_role;
grant execute on function private.hard_delete_agency(uuid) to service_role;
grant execute on function private.set_audit_actor(uuid) to service_role;
grant execute on function private.archive_audit_logs_older_than(timestamp with time zone, integer) to service_role;
grant execute on function private.run_audit_logs_retention(timestamp with time zone, integer, integer) to service_role;
