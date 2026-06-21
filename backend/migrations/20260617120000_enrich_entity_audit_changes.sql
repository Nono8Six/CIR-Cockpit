create or replace function private.log_audit_event()
returns trigger language plpgsql security definer set search_path to ''
as $function$
declare
  v_action text := lower(TG_OP);
  v_actor_id uuid := private.audit_actor_id();
  v_is_super_admin boolean := coalesce(private.is_super_admin(), false);
  v_agency_id uuid;
  v_entity_id text;
  v_metadata jsonb;
  v_changes jsonb := '[]'::jsonb;
  v_entity_ref uuid;
  v_source text := 'manual_edit';
begin
  if TG_TABLE_NAME = 'agencies' then
    v_entity_id := coalesce(NEW.id, OLD.id)::text;
    if TG_OP = 'DELETE' then v_agency_id := null; else v_agency_id := coalesce(NEW.id, OLD.id); end if;
  else
    v_entity_id := coalesce(NEW.id, OLD.id)::text;
  end if;

  if TG_TABLE_NAME = 'entity_contacts' then
    v_entity_ref := coalesce(NEW.entity_id, OLD.entity_id);
    select e.agency_id into v_agency_id from public.entities e where e.id = v_entity_ref;
  elsif TG_TABLE_NAME = 'interactions' then
    v_agency_id := coalesce(NEW.agency_id, OLD.agency_id);
    if v_agency_id is null then
      v_entity_ref := coalesce(NEW.entity_id, OLD.entity_id);
      select e.agency_id into v_agency_id from public.entities e where e.id = v_entity_ref;
    end if;
  elsif TG_TABLE_NAME <> 'agencies' then
    v_agency_id := coalesce(NEW.agency_id, OLD.agency_id);
  end if;

  v_metadata := jsonb_build_object('agency_id', v_agency_id::text, 'entity_id', v_entity_id);

  if TG_TABLE_NAME = 'agencies' then
    v_metadata := v_metadata || jsonb_build_object('name', coalesce(NEW.name, OLD.name));
  elsif TG_TABLE_NAME = 'entities' then
    if TG_OP = 'UPDATE' then
      if NEW.name is distinct from OLD.name then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'name', 'before', OLD.name, 'after', NEW.name)); end if;
      if NEW.client_number is distinct from OLD.client_number then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'client_number', 'before', OLD.client_number, 'after', NEW.client_number)); end if;
      if NEW.account_type is distinct from OLD.account_type then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'account_type', 'before', OLD.account_type, 'after', NEW.account_type)); end if;
      if NEW.agency_id is distinct from OLD.agency_id then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'agency_id', 'before', OLD.agency_id::text, 'after', NEW.agency_id::text)); end if;
      if NEW.cir_commercial_id is distinct from OLD.cir_commercial_id then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'cir_commercial_id', 'before', OLD.cir_commercial_id::text, 'after', NEW.cir_commercial_id::text)); end if;
      if NEW.address is distinct from OLD.address then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'address', 'before', OLD.address, 'after', NEW.address)); end if;
      if NEW.postal_code is distinct from OLD.postal_code then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'postal_code', 'before', OLD.postal_code, 'after', NEW.postal_code)); end if;
      if NEW.department is distinct from OLD.department then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'department', 'before', OLD.department, 'after', NEW.department)); end if;
      if NEW.city is distinct from OLD.city then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'city', 'before', OLD.city, 'after', NEW.city)); end if;
      if NEW.siret is distinct from OLD.siret then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'siret', 'before', OLD.siret, 'after', NEW.siret)); end if;
      if NEW.siren is distinct from OLD.siren then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'siren', 'before', OLD.siren, 'after', NEW.siren)); end if;
      if NEW.naf_code is distinct from OLD.naf_code then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'naf_code', 'before', OLD.naf_code, 'after', NEW.naf_code)); end if;
      if NEW.official_name is distinct from OLD.official_name then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'official_name', 'before', OLD.official_name, 'after', NEW.official_name)); end if;
      if NEW.official_data_source is distinct from OLD.official_data_source then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'official_data_source', 'before', OLD.official_data_source, 'after', NEW.official_data_source)); end if;
      if NEW.official_data_synced_at is distinct from OLD.official_data_synced_at then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'official_data_synced_at', 'before', OLD.official_data_synced_at, 'after', NEW.official_data_synced_at)); end if;
      if NEW.primary_phone is distinct from OLD.primary_phone then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'primary_phone', 'before', OLD.primary_phone, 'after', NEW.primary_phone)); end if;
      if NEW.primary_email is distinct from OLD.primary_email then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'primary_email', 'before', OLD.primary_email, 'after', NEW.primary_email)); end if;
      if NEW.notes is distinct from OLD.notes then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'notes', 'before', OLD.notes, 'after', NEW.notes)); end if;

      if (
        NEW.official_data_source = 'api-recherche-entreprises'
        and NEW.official_data_synced_at is distinct from OLD.official_data_synced_at
        and (
          NEW.siret is distinct from OLD.siret
          or NEW.siren is distinct from OLD.siren
          or NEW.naf_code is distinct from OLD.naf_code
          or NEW.official_name is distinct from OLD.official_name
          or NEW.official_data_source is distinct from OLD.official_data_source
        )
      ) then
        v_source := 'official_resync';
      end if;
    end if;

    v_metadata := v_metadata || jsonb_build_object(
      'entity_type', coalesce(NEW.entity_type, OLD.entity_type),
      'client_number', coalesce(NEW.client_number, OLD.client_number),
      'name', coalesce(NEW.name, OLD.name),
      'source', v_source,
      'changes', v_changes
    );
  elsif TG_TABLE_NAME = 'entity_contacts' then
    if TG_OP = 'UPDATE' then
      if NEW.first_name is distinct from OLD.first_name then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'first_name', 'before', OLD.first_name, 'after', NEW.first_name)); end if;
      if NEW.last_name is distinct from OLD.last_name then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'last_name', 'before', OLD.last_name, 'after', NEW.last_name)); end if;
      if NEW.email is distinct from OLD.email then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'email', 'before', OLD.email, 'after', NEW.email)); end if;
      if NEW.phone is distinct from OLD.phone then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'phone', 'before', OLD.phone, 'after', NEW.phone)); end if;
      if NEW.position is distinct from OLD.position then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'position', 'before', OLD.position, 'after', NEW.position)); end if;
      if NEW.service_label is distinct from OLD.service_label then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'service_label', 'before', OLD.service_label, 'after', NEW.service_label)); end if;
      if NEW.is_primary is distinct from OLD.is_primary then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'is_primary', 'before', OLD.is_primary::text, 'after', NEW.is_primary::text)); end if;
      if NEW.notes is distinct from OLD.notes then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'notes', 'before', OLD.notes, 'after', NEW.notes)); end if;
      if NEW.archived_at is distinct from OLD.archived_at then v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'archived_at', 'before', OLD.archived_at, 'after', NEW.archived_at)); end if;
    end if;

    v_metadata := v_metadata || jsonb_build_object(
      'entity_id', coalesce(NEW.entity_id, OLD.entity_id),
      'email', coalesce(NEW.email, OLD.email),
      'phone', coalesce(NEW.phone, OLD.phone),
      'position', coalesce(NEW.position, OLD.position),
      'source', v_source,
      'changes', v_changes
    );
  elsif TG_TABLE_NAME = 'interactions' then
    if TG_OP = 'INSERT' then v_metadata := v_metadata || jsonb_build_object('status_after', NEW.status);
    elsif TG_OP = 'UPDATE' then
      if NEW.status is distinct from OLD.status then v_metadata := v_metadata || jsonb_build_object('status_before', OLD.status, 'status_after', NEW.status); end if;
      if NEW.contact_service is distinct from OLD.contact_service then v_metadata := v_metadata || jsonb_build_object('contact_service_before', OLD.contact_service, 'contact_service_after', NEW.contact_service); end if;
      if NEW.interaction_type is distinct from OLD.interaction_type then v_metadata := v_metadata || jsonb_build_object('interaction_type_before', OLD.interaction_type, 'interaction_type_after', NEW.interaction_type); end if;
      if NEW.mega_families is distinct from OLD.mega_families then v_metadata := v_metadata || jsonb_build_object('mega_families_before', OLD.mega_families, 'mega_families_after', NEW.mega_families); end if;
    elsif TG_OP = 'DELETE' then v_metadata := v_metadata || jsonb_build_object('status_before', OLD.status); end if;
  elsif TG_TABLE_NAME = 'agency_members' then
    v_metadata := v_metadata || jsonb_build_object('user_id', coalesce(NEW.user_id, OLD.user_id));
  elsif TG_TABLE_NAME in ('agency_statuses', 'agency_services', 'agency_entities', 'agency_families', 'agency_interaction_types') then
    v_metadata := v_metadata || jsonb_build_object('label', coalesce(NEW.label, OLD.label));
  elsif TG_TABLE_NAME = 'agency_reference_resolutions' then
    v_metadata := v_metadata || jsonb_build_object('dimension', coalesce(NEW.dimension, OLD.dimension), 'source_label', coalesce(NEW.source_label, OLD.source_label), 'target_status_id', coalesce(NEW.target_status_id, OLD.target_status_id), 'target_service_id', coalesce(NEW.target_service_id, OLD.target_service_id), 'target_family_id', coalesce(NEW.target_family_id, OLD.target_family_id), 'target_interaction_type_id', coalesce(NEW.target_interaction_type_id, OLD.target_interaction_type_id), 'resolved_by', coalesce(NEW.resolved_by, OLD.resolved_by));
  end if;

  insert into public.audit_logs (agency_id, actor_id, actor_is_super_admin, action, entity_table, entity_id, metadata)
  values (v_agency_id, v_actor_id, v_is_super_admin, v_action, TG_TABLE_NAME, v_entity_id, v_metadata);

  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$function$;
