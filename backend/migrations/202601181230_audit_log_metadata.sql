-- Enrich audit log metadata for interactions and config tables

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
$$;
