-- Fix audit log insert on agency delete (avoid FK violation)

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
  v_client_id uuid;
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

  if TG_TABLE_NAME = 'client_contacts' then
    v_client_id := coalesce(NEW.client_id, OLD.client_id);
    select c.agency_id into v_agency_id
    from public.clients c
    where c.id = v_client_id;
  elsif TG_TABLE_NAME = 'interactions' then
    v_agency_id := coalesce(NEW.agency_id, OLD.agency_id);
    if v_agency_id is null then
      v_client_id := coalesce(NEW.client_id, OLD.client_id);
      select c.agency_id into v_agency_id
      from public.clients c
      where c.id = v_client_id;
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
  elsif TG_TABLE_NAME = 'clients' then
    v_metadata := v_metadata || jsonb_build_object(
      'client_number', coalesce(NEW.client_number, OLD.client_number),
      'name', coalesce(NEW.name, OLD.name)
    );
  elsif TG_TABLE_NAME = 'client_contacts' then
    v_metadata := v_metadata || jsonb_build_object(
      'client_id', coalesce(NEW.client_id, OLD.client_id),
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
$$;
