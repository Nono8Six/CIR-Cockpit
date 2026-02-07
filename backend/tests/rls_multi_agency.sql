-- RLS tests for multi-agency isolation
-- Run only in dev/staging. Uses a transaction and rolls back.

begin;

create temp table tmp_rls_ids (
  name text primary key,
  id uuid not null
);

create temp table tmp_rls_text (
  name text primary key,
  value text not null
);

insert into tmp_rls_ids (name, id) values
  ('agency_a', gen_random_uuid()),
  ('agency_b', gen_random_uuid()),
  ('super_admin', gen_random_uuid()),
  ('admin_a', gen_random_uuid()),
  ('tcs_a', gen_random_uuid()),
  ('admin_b', gen_random_uuid()),
  ('tcs_b', gen_random_uuid());

insert into tmp_rls_text (name, value) values
  ('interaction_a_edit', gen_random_uuid()::text),
  ('interaction_a_delete', gen_random_uuid()::text),
  ('interaction_b_edit', gen_random_uuid()::text),
  ('interaction_b_delete', gen_random_uuid()::text);

insert into public.agencies (id, name)
values
  ((select id from tmp_rls_ids where name = 'agency_a'), 'Agency A'),
  ((select id from tmp_rls_ids where name = 'agency_b'), 'Agency B');

insert into auth.users (id, email, raw_user_meta_data)
values
  ((select id from tmp_rls_ids where name = 'super_admin'), 'super_admin@test.invalid', '{"full_name":"Super Admin"}'::jsonb),
  ((select id from tmp_rls_ids where name = 'admin_a'), 'admin_a@test.invalid', '{"full_name":"Admin A"}'::jsonb),
  ((select id from tmp_rls_ids where name = 'tcs_a'), 'tcs_a@test.invalid', '{"full_name":"TCS A"}'::jsonb),
  ((select id from tmp_rls_ids where name = 'admin_b'), 'admin_b@test.invalid', '{"full_name":"Admin B"}'::jsonb),
  ((select id from tmp_rls_ids where name = 'tcs_b'), 'tcs_b@test.invalid', '{"full_name":"TCS B"}'::jsonb);

update public.profiles
set is_super_admin = true
where id = (select id from tmp_rls_ids where name = 'super_admin');

insert into public.agency_members (agency_id, user_id, role)
values
  ((select id from tmp_rls_ids where name = 'agency_a'), (select id from tmp_rls_ids where name = 'admin_a'), 'agency_admin'),
  ((select id from tmp_rls_ids where name = 'agency_a'), (select id from tmp_rls_ids where name = 'tcs_a'), 'tcs'),
  ((select id from tmp_rls_ids where name = 'agency_b'), (select id from tmp_rls_ids where name = 'admin_b'), 'agency_admin'),
  ((select id from tmp_rls_ids where name = 'agency_b'), (select id from tmp_rls_ids where name = 'tcs_b'), 'tcs');

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
) values
  (
    (select value from tmp_rls_text where name = 'interaction_a_edit'),
    (select id from tmp_rls_ids where name = 'agency_a'),
    (select id from tmp_rls_ids where name = 'tcs_a'),
    'Email',
    'Client Direct',
    'Client',
    'Service',
    'Company A',
    'Contact A',
    '0600000001',
    array['FAMILY'],
    'Subject A edit',
    'A traiter'
  ),
  (
    (select value from tmp_rls_text where name = 'interaction_a_delete'),
    (select id from tmp_rls_ids where name = 'agency_a'),
    (select id from tmp_rls_ids where name = 'tcs_a'),
    'Email',
    'Client Direct',
    'Client',
    'Service',
    'Company A2',
    'Contact A2',
    '0600000002',
    array['FAMILY'],
    'Subject A delete',
    'A traiter'
  ),
  (
    (select value from tmp_rls_text where name = 'interaction_b_edit'),
    (select id from tmp_rls_ids where name = 'agency_b'),
    (select id from tmp_rls_ids where name = 'tcs_b'),
    'Email',
    'Client Direct',
    'Client',
    'Service',
    'Company B',
    'Contact B',
    '0600000003',
    array['FAMILY'],
    'Subject B edit',
    'A traiter'
  ),
  (
    (select value from tmp_rls_text where name = 'interaction_b_delete'),
    (select id from tmp_rls_ids where name = 'agency_b'),
    (select id from tmp_rls_ids where name = 'tcs_b'),
    'Email',
    'Client Direct',
    'Client',
    'Service',
    'Company B2',
    'Contact B2',
    '0600000004',
    array['FAMILY'],
    'Subject B delete',
    'A traiter'
  );

grant select on tmp_rls_ids to authenticated;
grant select on tmp_rls_text to authenticated;

set local role authenticated;

do $$
declare
  v_agency_a uuid := (select id from tmp_rls_ids where name = 'agency_a');
  v_agency_b uuid := (select id from tmp_rls_ids where name = 'agency_b');
  v_super_admin uuid := (select id from tmp_rls_ids where name = 'super_admin');
  v_admin_a uuid := (select id from tmp_rls_ids where name = 'admin_a');
  v_tcs_a uuid := (select id from tmp_rls_ids where name = 'tcs_a');
  v_admin_b uuid := (select id from tmp_rls_ids where name = 'admin_b');
  v_interaction_a_edit text := (select value from tmp_rls_text where name = 'interaction_a_edit');
  v_interaction_a_delete text := (select value from tmp_rls_text where name = 'interaction_a_delete');
  v_interaction_b_edit text := (select value from tmp_rls_text where name = 'interaction_b_edit');
  v_count int;
  v_updated_by uuid;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  -- admin_a scope
  perform set_config('request.jwt.claim.sub', v_admin_a::text, true);

  select count(*) into v_count from public.agencies where id = v_agency_a;
  if v_count <> 1 then
    raise exception 'admin_a should read agency_a';
  end if;

  select count(*) into v_count from public.agencies where id = v_agency_b;
  if v_count <> 0 then
    raise exception 'admin_a should not read agency_b';
  end if;

  select count(*) into v_count from public.interactions where agency_id = v_agency_a;
  if v_count <> 2 then
    raise exception 'admin_a should read interactions for agency_a';
  end if;

  select count(*) into v_count from public.interactions where agency_id = v_agency_b;
  if v_count <> 0 then
    raise exception 'admin_a should not read interactions for agency_b';
  end if;

  -- tcs_a update allowed, cross-agency blocked
  perform set_config('request.jwt.claim.sub', v_tcs_a::text, true);

  update public.interactions
  set status = 'UPDATED_BY_TCS'
  where id = v_interaction_a_edit;

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'tcs_a should update interaction in agency_a';
  end if;

  select updated_by into v_updated_by
  from public.interactions
  where id = v_interaction_a_edit;

  if v_updated_by <> v_tcs_a then
    raise exception 'updated_by should be tcs_a';
  end if;

  update public.interactions
  set status = 'CROSS_AGENCY'
  where id = v_interaction_b_edit;

  get diagnostics v_count = row_count;
  if v_count <> 0 then
    raise exception 'tcs_a should not update interaction in agency_b';
  end if;

  delete from public.interactions
  where id = v_interaction_a_delete;

  get diagnostics v_count = row_count;
  if v_count <> 0 then
    raise exception 'tcs_a should not delete interactions';
  end if;

  select count(*) into v_count
  from public.interactions
  where id = v_interaction_a_delete;

  if v_count <> 1 then
    raise exception 'interaction should remain after forbidden delete';
  end if;

  -- admin_b cannot insert agency config
  perform set_config('request.jwt.claim.sub', v_admin_b::text, true);

  begin
    insert into public.agency_statuses (agency_id, label, sort_order)
    values (v_agency_b, 'TEST_STATUS', 999);
    raise exception 'admin_b should not insert agency_statuses';
  exception when others then
    -- expected
  end;

  -- admin_a delete allowed
  perform set_config('request.jwt.claim.sub', v_admin_a::text, true);

  delete from public.interactions
  where id = v_interaction_a_delete;

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'admin_a should delete interaction in agency_a';
  end if;

  -- audit logs visibility
  select count(*) into v_count from public.audit_logs where agency_id = v_agency_a;
  if v_count < 1 then
    raise exception 'admin_a should read audit_logs for agency_a';
  end if;

  select count(*) into v_count from public.audit_logs where agency_id = v_agency_b;
  if v_count <> 0 then
    raise exception 'admin_a should not read audit_logs for agency_b';
  end if;

  perform set_config('request.jwt.claim.sub', v_tcs_a::text, true);
  select count(*) into v_count from public.audit_logs;
  if v_count <> 0 then
    raise exception 'tcs should not read audit_logs';
  end if;

  perform set_config('request.jwt.claim.sub', v_super_admin::text, true);
  select count(*) into v_count from public.interactions;
  if v_count < 3 then
    raise exception 'super_admin should read all interactions';
  end if;
end;
$$;

rollback;
