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
    elsif TG_OP = 'UPDATE' then
      if NEW.status is distinct from OLD.status then v_metadata := v_metadata || jsonb_build_object('status_before', OLD.status, 'status_after', NEW.status); end if;
      if NEW.contact_service is distinct from OLD.contact_service then v_metadata := v_metadata || jsonb_build_object('contact_service_before', OLD.contact_service, 'contact_service_after', NEW.contact_service); end if;
      if NEW.interaction_type is distinct from OLD.interaction_type then v_metadata := v_metadata || jsonb_build_object('interaction_type_before', OLD.interaction_type, 'interaction_type_after', NEW.interaction_type); end if;
      if NEW.mega_families is distinct from OLD.mega_families then v_metadata := v_metadata || jsonb_build_object('mega_families_before', OLD.mega_families, 'mega_families_after', NEW.mega_families); end if;
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
