-- B3-1 foundation probes: constraints, RLS, ACL and optimistic concurrency.
-- Run against dev/staging only after the B3-1 migration. Every probe rolls back.

begin;

create temp table tmp_b3_ids (name text primary key, id uuid not null);
insert into tmp_b3_ids (name, id) values
  ('agency_a', gen_random_uuid()),
  ('agency_b', gen_random_uuid()),
  ('agency_admin_a', gen_random_uuid()),
  ('tcs_a', gen_random_uuid()),
  ('tcs_a_peer', gen_random_uuid()),
  ('tcs_b', gen_random_uuid()),
  ('organization_a', gen_random_uuid()),
  ('organization_b', gen_random_uuid()),
  ('task_type', gen_random_uuid()),
  ('queue_task', gen_random_uuid()),
  ('restricted_visible', gen_random_uuid()),
  ('restricted_hidden', gen_random_uuid()),
  ('agency_b_task', gen_random_uuid());

insert into tmp_b3_ids (name, id)
select 'super_admin', id
from public.profiles
where role = 'super_admin' and archived_at is null
order by created_at, id
limit 1;

do $$
begin
  if not exists (select 1 from tmp_b3_ids where name = 'super_admin') then
    raise exception 'B3 probe requires one active super-admin';
  end if;
end;
$$;

insert into public.agencies (id, name) values
  ((select id from tmp_b3_ids where name = 'agency_a'), 'B3 Probe Agency A'),
  ((select id from tmp_b3_ids where name = 'agency_b'), 'B3 Probe Agency B');

insert into auth.users (id, email, raw_user_meta_data) values
  ((select id from tmp_b3_ids where name = 'agency_admin_a'), 'b3-admin-a@test.invalid', '{"full_name":"B3 Admin A"}'::jsonb),
  ((select id from tmp_b3_ids where name = 'tcs_a'), 'b3-tcs-a@test.invalid', '{"full_name":"B3 TCS A"}'::jsonb),
  ((select id from tmp_b3_ids where name = 'tcs_a_peer'), 'b3-tcs-a-peer@test.invalid', '{"full_name":"B3 TCS A Peer"}'::jsonb),
  ((select id from tmp_b3_ids where name = 'tcs_b'), 'b3-tcs-b@test.invalid', '{"full_name":"B3 TCS B"}'::jsonb);

select set_config(
  'request.jwt.claim.sub',
  (select id::text from tmp_b3_ids where name = 'super_admin'),
  true
);
update public.profiles set role = 'agency_admin'
where id = (select id from tmp_b3_ids where name = 'agency_admin_a');

insert into public.agency_members (agency_id, user_id) values
  ((select id from tmp_b3_ids where name = 'agency_a'), (select id from tmp_b3_ids where name = 'agency_admin_a')),
  ((select id from tmp_b3_ids where name = 'agency_a'), (select id from tmp_b3_ids where name = 'tcs_a')),
  ((select id from tmp_b3_ids where name = 'agency_a'), (select id from tmp_b3_ids where name = 'tcs_a_peer')),
  ((select id from tmp_b3_ids where name = 'agency_b'), (select id from tmp_b3_ids where name = 'tcs_b'));

insert into public.entities (id, entity_type, name, agency_id, created_by) values
  ((select id from tmp_b3_ids where name = 'organization_a'), 'Prospect', 'B3 Probe Prospect A',
    (select id from tmp_b3_ids where name = 'agency_a'), (select id from tmp_b3_ids where name = 'tcs_a')),
  ((select id from tmp_b3_ids where name = 'organization_b'), 'Prospect', 'B3 Probe Prospect B',
    (select id from tmp_b3_ids where name = 'agency_b'), (select id from tmp_b3_ids where name = 'tcs_b'));

insert into public.task_types (id, code, label, created_by, updated_by) values (
  (select id from tmp_b3_ids where name = 'task_type'),
  'b3_probe_follow_up',
  'B3 Probe Follow-up',
  (select id from tmp_b3_ids where name = 'super_admin'),
  (select id from tmp_b3_ids where name = 'super_admin')
);

insert into public.tasks (
  id, agency_id, title, task_type_id, scope, organization_id, created_by,
  responsible_id, status, due_date, due_timezone, visibility
) values
  (
    (select id from tmp_b3_ids where name = 'restricted_visible'),
    (select id from tmp_b3_ids where name = 'agency_a'),
    'B3 Probe Restricted Visible',
    (select id from tmp_b3_ids where name = 'task_type'),
    'internal_cir', null,
    (select id from tmp_b3_ids where name = 'tcs_a_peer'),
    (select id from tmp_b3_ids where name = 'tcs_a_peer'),
    'todo', current_date + 1, 'Europe/Paris', 'restricted'
  ),
  (
    (select id from tmp_b3_ids where name = 'restricted_hidden'),
    (select id from tmp_b3_ids where name = 'agency_a'),
    'B3 Probe Restricted Hidden',
    (select id from tmp_b3_ids where name = 'task_type'),
    'internal_cir', null,
    (select id from tmp_b3_ids where name = 'tcs_a_peer'),
    (select id from tmp_b3_ids where name = 'tcs_a_peer'),
    'todo', current_date + 1, 'Europe/Paris', 'restricted'
  ),
  (
    (select id from tmp_b3_ids where name = 'agency_b_task'),
    (select id from tmp_b3_ids where name = 'agency_b'),
    'B3 Probe Agency B',
    (select id from tmp_b3_ids where name = 'task_type'),
    'tier_relation', (select id from tmp_b3_ids where name = 'organization_b'),
    (select id from tmp_b3_ids where name = 'tcs_b'),
    (select id from tmp_b3_ids where name = 'tcs_b'),
    'todo', current_date + 1, 'Europe/Paris', 'tier'
  );

insert into public.task_participants (task_id, agency_id, profile_id, participant_role, added_by)
values (
  (select id from tmp_b3_ids where name = 'restricted_visible'),
  (select id from tmp_b3_ids where name = 'agency_a'),
  (select id from tmp_b3_ids where name = 'tcs_a'),
  'follower',
  (select id from tmp_b3_ids where name = 'tcs_a_peer')
);

grant select on tmp_b3_ids to authenticated;
set local role authenticated;

do $$
declare
  v_agency_a uuid := (select id from tmp_b3_ids where name = 'agency_a');
  v_agency_b uuid := (select id from tmp_b3_ids where name = 'agency_b');
  v_super_admin uuid := (select id from tmp_b3_ids where name = 'super_admin');
  v_admin_a uuid := (select id from tmp_b3_ids where name = 'agency_admin_a');
  v_tcs_a uuid := (select id from tmp_b3_ids where name = 'tcs_a');
  v_tcs_b uuid := (select id from tmp_b3_ids where name = 'tcs_b');
  v_org_a uuid := (select id from tmp_b3_ids where name = 'organization_a');
  v_type uuid := (select id from tmp_b3_ids where name = 'task_type');
  v_queue uuid := (select id from tmp_b3_ids where name = 'queue_task');
  v_visible uuid := (select id from tmp_b3_ids where name = 'restricted_visible');
  v_hidden uuid := (select id from tmp_b3_ids where name = 'restricted_hidden');
  v_agency_b_task uuid := (select id from tmp_b3_ids where name = 'agency_b_task');
  v_count integer;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  -- A TCS can create a quick queue task in its agency.
  perform set_config('request.jwt.claim.sub', v_tcs_a::text, true);
  insert into public.tasks (
    id, agency_id, title, task_type_id, scope, organization_id, created_by,
    responsible_id, status, due_date, due_timezone, visibility
  ) values (
    v_queue, v_agency_a, 'B3 Probe Queue', v_type, 'tier_relation', v_org_a,
    v_tcs_a, null, 'todo', current_date + 1, 'Europe/Paris', 'tier'
  );

  select count(*) into v_count from public.tasks where id = v_queue and responsible_id is null;
  if v_count <> 1 then raise exception 'B3 queue creation failed'; end if;

  -- Restricted visibility follows participation and hides unrelated rows.
  select count(*) into v_count from public.tasks where id = v_visible;
  if v_count <> 1 then raise exception 'B3 participant should read restricted task'; end if;
  select count(*) into v_count from public.tasks where id = v_hidden;
  if v_count <> 0 then raise exception 'B3 unrelated TCS should not read restricted task'; end if;
  select count(*) into v_count from public.tasks where id = v_agency_b_task;
  if v_count <> 0 then raise exception 'B3 TCS should not read another agency'; end if;

  -- Direct Data API writes stay narrower than the future backend services.
  begin
    update public.tasks set title = 'B3 Forbidden Update', version = 2 where id = v_queue;
    raise exception 'B3 authenticated task update should fail';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.task_participants (task_id, agency_id, profile_id, participant_role, added_by)
    values (v_queue, v_agency_a, v_tcs_a, 'follower', v_tcs_a);
    raise exception 'B3 authenticated participant insert should fail';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.task_events (
      task_id, agency_id, event_order, event_type, actor_kind, actor_id,
      task_version, metadata
    ) values (v_queue, v_agency_a, 1, 'created', 'user', v_tcs_a, 1, '{}'::jsonb);
    raise exception 'B3 authenticated event insert should fail';
  exception when insufficient_privilege then
    null;
  end;

  -- Only a super-admin administers the global type reference.
  begin
    insert into public.task_types (code, label, created_by, updated_by)
    values ('b3_forbidden', 'B3 Forbidden', v_tcs_a, v_tcs_a);
    raise exception 'B3 TCS task type insert should fail';
  exception when insufficient_privilege then
    null;
  end;

  perform set_config('request.jwt.claim.sub', v_admin_a::text, true);
  select count(*) into v_count from public.tasks where id = v_hidden;
  if v_count <> 1 then raise exception 'B3 agency admin should read restricted task'; end if;

  perform set_config('request.jwt.claim.sub', v_tcs_b::text, true);
  select count(*) into v_count from public.tasks where id = v_agency_b_task;
  if v_count <> 1 then raise exception 'B3 agency B TCS should read own agency'; end if;
  select count(*) into v_count from public.tasks where agency_id = v_agency_a;
  if v_count <> 0 then raise exception 'B3 agency B TCS should not read agency A'; end if;

  perform set_config('request.jwt.claim.sub', v_super_admin::text, true);
  insert into public.task_types (code, label, created_by, updated_by)
  values ('b3_super_admin', 'B3 Super Admin', v_super_admin, v_super_admin);
  begin
    update public.task_types
    set code = 'b3_super_admin_changed', updated_by = v_super_admin
    where code = 'b3_super_admin';
    raise exception 'B3 task type code should not be directly updatable';
  exception when insufficient_privilege then
    null;
  end;
  begin
    update public.task_types
    set created_by = v_tcs_a
    where code = 'b3_super_admin';
    raise exception 'B3 task type creation audit should be immutable';
  exception when insufficient_privilege then
    null;
  end;
  select count(*) into v_count from public.tasks
  where id in (v_queue, v_visible, v_hidden, v_agency_b_task);
  if v_count <> 4 then raise exception 'B3 super-admin should read every probe task'; end if;

end;
$$;

reset role;

do $$
declare
  v_queue uuid := (select id from tmp_b3_ids where name = 'queue_task');
  v_agency_a uuid := (select id from tmp_b3_ids where name = 'agency_a');
  v_tcs_a uuid := (select id from tmp_b3_ids where name = 'tcs_a');
  v_super_admin uuid := (select id from tmp_b3_ids where name = 'super_admin');
  v_type uuid := (select id from tmp_b3_ids where name = 'task_type');
  v_org_a uuid := (select id from tmp_b3_ids where name = 'organization_a');
  v_count integer;
begin
  -- Defense in depth: the backend role is privileged, but the trigger still
  -- prevents a stable task-type code from being rewritten.
  begin
    update public.task_types
    set code = 'b3_super_admin_changed'
    where code = 'b3_super_admin';
    raise exception 'B3 task type code trigger should reject backend rewrite';
  exception when check_violation then
    null;
  end;

  -- Structural constraints are exercised through the privileged backend path;
  -- the direct authenticated creation policy intentionally accepts only todo.
  begin
    insert into public.tasks (
      agency_id, title, task_type_id, scope, organization_id, created_by,
      status, due_date, due_timezone, visibility
    ) values (
      v_agency_a, 'B3 Invalid In Progress', v_type, 'tier_relation', v_org_a,
      v_super_admin, 'in_progress', current_date + 1, 'Europe/Paris', 'tier'
    );
    raise exception 'B3 in-progress task without responsible should fail';
  exception when check_violation then
    null;
  end;

  begin
    insert into public.tasks (
      agency_id, title, task_type_id, scope, organization_id, created_by,
      responsible_id, status, due_date, due_timezone, visibility
    ) values (
      v_agency_a, 'B3 Invalid Completed', v_type, 'tier_relation', v_org_a,
      v_super_admin, v_tcs_a, 'completed', current_date + 1,
      'Europe/Paris', 'tier'
    );
    raise exception 'B3 completed task without markers should fail';
  exception when check_violation then
    null;
  end;

  -- The backend/service transaction enforces exactly one version increment.
  update public.tasks set priority = 'high', version = 2 where id = v_queue and version = 1;
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'B3 expected version update should succeed'; end if;
  update public.tasks set priority = 'urgent', version = 2 where id = v_queue and version = 1;
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'B3 stale version update should affect zero rows'; end if;

  begin
    update public.tasks set version = 4 where id = v_queue and version = 2;
    raise exception 'B3 version jump should fail';
  exception when serialization_failure then
    null;
  end;

  update public.tasks
  set responsible_id = v_tcs_a, status = 'in_progress', version = 3
  where id = v_queue and version = 2;
  update public.tasks
  set status = 'completed', completed_at = clock_timestamp(), completed_by = v_tcs_a, version = 4
  where id = v_queue and version = 3;
  update public.tasks
  set status = 'todo', completed_at = null, completed_by = null, version = 5
  where id = v_queue and version = 4;
  update public.tasks
  set status = 'canceled', canceled_at = clock_timestamp(), canceled_by = v_tcs_a, version = 6
  where id = v_queue and version = 5;

  select count(*) into v_count
  from public.tasks
  where id = v_queue and status = 'canceled' and version = 6;
  if v_count <> 1 then raise exception 'B3 structural transition cycle failed'; end if;

  insert into public.task_events (
    task_id, agency_id, event_order, event_type, actor_kind, actor_id,
    task_version, metadata
  ) values (v_queue, v_agency_a, 1, 'created', 'user', v_tcs_a, 6, '{}'::jsonb);
end;
$$;

set local role authenticated;
do $$
declare
  v_queue uuid := (select id from tmp_b3_ids where name = 'queue_task');
  v_tcs_a uuid := (select id from tmp_b3_ids where name = 'tcs_a');
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_tcs_a::text, true);
  begin
    update public.task_events set note = 'B3 forbidden rewrite'
    where task_id = v_queue and event_order = 1;
    raise exception 'B3 task events must be append-only';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

rollback;
