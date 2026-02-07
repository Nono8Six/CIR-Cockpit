-- Audit log tests for interactions and agency config
-- Run only in dev/staging. Uses a transaction and rolls back.

begin;

-- Use session GUCs to pass ids across role switches (avoids temp table perms in MCP).
do $$
declare
  v_agency uuid := gen_random_uuid();
  v_user uuid := gen_random_uuid();
  v_interaction text := gen_random_uuid()::text;
  v_status_initial text := 'A traiter';
  v_status_updated text := 'Clos';
  v_status_label text := 'Status Audit';
  v_service_label text := 'Service Audit SR';
begin
  insert into public.agencies (id, name)
  values (v_agency, 'Audit Agency');

  insert into auth.users (id, email, raw_user_meta_data)
  values (
    v_user,
    'audit_super_admin@test.invalid',
    '{"full_name":"Audit Super Admin"}'::jsonb
  );

  update public.profiles
  set is_super_admin = true
  where id = v_user;

  insert into public.agency_members (agency_id, user_id, role)
  values (v_agency, v_user, 'super_admin');

  perform set_config('test.audit.agency_id', v_agency::text, true);
  perform set_config('test.audit.user_id', v_user::text, true);
  perform set_config('test.audit.interaction_id', v_interaction, true);
  perform set_config('test.audit.status_initial', v_status_initial, true);
  perform set_config('test.audit.status_updated', v_status_updated, true);
  perform set_config('test.audit.status_label', v_status_label, true);
  perform set_config('test.audit.service_label', v_service_label, true);
end;
$$;

set local role authenticated;

do $$
declare
  v_agency uuid := current_setting('test.audit.agency_id')::uuid;
  v_user uuid := current_setting('test.audit.user_id')::uuid;
  v_interaction text := current_setting('test.audit.interaction_id');
  v_status_initial text := current_setting('test.audit.status_initial');
  v_status_updated text := current_setting('test.audit.status_updated');
  v_status_label text := current_setting('test.audit.status_label');
  v_count int;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_user::text, true);

  insert into public.interactions (
    id,
    agency_id,
    created_by,
    channel,
    lead_source,
    entity_type,
    contact_service,
    company_name,
    contact_name,
    contact_phone,
    mega_families,
    subject,
    status
  ) values (
    v_interaction,
    v_agency,
    v_user,
    'Email',
    'Client Direct',
    'Client',
    'Service',
    'Audit Company',
    'Audit Contact',
    '0600000999',
    array['FAMILY'],
    'Audit subject',
    v_status_initial
  );

  select count(*) into v_count
  from public.audit_logs
  where entity_table = 'interactions'
    and action = 'insert'
    and entity_id = v_interaction
    and metadata->>'status_after' = v_status_initial
    and metadata->>'agency_id' = v_agency::text;

  if v_count <> 1 then
    raise exception 'interaction insert should log metadata';
  end if;

  update public.interactions
  set status = v_status_updated
  where id = v_interaction;

  select count(*) into v_count
  from public.audit_logs
  where entity_table = 'interactions'
    and action = 'update'
    and entity_id = v_interaction
    and metadata->>'status_before' = v_status_initial
    and metadata->>'status_after' = v_status_updated;

  if v_count <> 1 then
    raise exception 'interaction update should log status change';
  end if;

  delete from public.interactions
  where id = v_interaction;

  select count(*) into v_count
  from public.audit_logs
  where entity_table = 'interactions'
    and action = 'delete'
    and entity_id = v_interaction
    and metadata->>'status_before' = v_status_updated;

  if v_count <> 1 then
    raise exception 'interaction delete should log status';
  end if;

  insert into public.agency_statuses (agency_id, label, sort_order)
  values (v_agency, v_status_label, 1);

  select count(*) into v_count
  from public.audit_logs
  where entity_table = 'agency_statuses'
    and action = 'insert'
    and metadata->>'label' = v_status_label
    and metadata->>'agency_id' = v_agency::text;

  if v_count <> 1 then
    raise exception 'agency_statuses insert should log label';
  end if;
end;
$$;

reset role;
set local role service_role;

do $$
declare
  v_agency uuid := current_setting('test.audit.agency_id')::uuid;
  v_user uuid := current_setting('test.audit.user_id')::uuid;
  v_service_label text := current_setting('test.audit.service_label');
  v_count int;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform public.set_audit_actor(v_user);

  insert into public.agency_services (agency_id, label, sort_order)
  values (v_agency, v_service_label, 2);

  select count(*) into v_count
  from public.audit_logs
  where entity_table = 'agency_services'
    and action = 'insert'
    and metadata->>'label' = v_service_label
    and actor_id = v_user;

  if v_count <> 1 then
    raise exception 'service_role should log actor_id';
  end if;
end;
$$;

rollback;
