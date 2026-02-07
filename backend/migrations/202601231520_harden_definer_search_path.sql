-- Harden SECURITY DEFINER functions by setting an empty search_path
-- This reduces search_path injection risk while keeping schema-qualified references.

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count integer;
begin
  if p_key is null or length(p_key) = 0 then
    return false;
  end if;
  if p_limit is null or p_limit <= 0 then
    return false;
  end if;
  if p_window_seconds is null or p_window_seconds <= 0 then
    return false;
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key)
  do update set
    count = case
      when public.rate_limits.window_start = v_window_start then public.rate_limits.count + 1
      else 1
    end,
    window_start = v_window_start
  returning count into v_count;

  return v_count <= p_limit;
exception
  when others then
    return false;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_user_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.log_audit_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_action text := lower(TG_OP);
  v_actor_id uuid := auth.uid();
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
      'user_id', coalesce(NEW.user_id, OLD.user_id),
      'role', coalesce(NEW.role, OLD.role)
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

CREATE OR REPLACE FUNCTION public.set_audit_actor(p_actor_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select set_config('app.actor_id', p_actor_id::text, true);
$function$;

CREATE OR REPLACE FUNCTION public.set_interaction_audit_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.set_password_changed_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.must_change_password = false
    and (old.must_change_password is distinct from new.must_change_password) then
    new.password_changed_at = coalesce(new.password_changed_at, now());
  end if;
  return new;
end;
$function$;
