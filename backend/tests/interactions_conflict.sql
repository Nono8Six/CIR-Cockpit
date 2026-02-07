-- Optimistic concurrency test for interactions (updated_at check)
-- Run only in dev/staging. Uses a transaction and rolls back.

begin;

create temp table tmp_conflict_ids (
  name text primary key,
  id uuid not null
);

create temp table tmp_conflict_text (
  name text primary key,
  value text not null
);

insert into tmp_conflict_ids (name, id) values
  ('agency', gen_random_uuid()),
  ('tcs', gen_random_uuid());

insert into tmp_conflict_text (name, value) values
  ('interaction', gen_random_uuid()::text);

insert into public.agencies (id, name)
values ((select id from tmp_conflict_ids where name = 'agency'), 'Conflict Agency');

insert into auth.users (id, email, raw_user_meta_data)
values (
  (select id from tmp_conflict_ids where name = 'tcs'),
  'conflict_tcs@test.invalid',
  '{"full_name":"Conflict TCS"}'::jsonb
);

insert into public.agency_members (agency_id, user_id, role)
values (
  (select id from tmp_conflict_ids where name = 'agency'),
  (select id from tmp_conflict_ids where name = 'tcs'),
  'tcs'
);

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
  (select value from tmp_conflict_text where name = 'interaction'),
  (select id from tmp_conflict_ids where name = 'agency'),
  (select id from tmp_conflict_ids where name = 'tcs'),
  'Email',
  'Client Direct',
  'Client',
  'Service',
  'Conflict Company',
  'Conflict Contact',
  '0600000998',
  array['FAMILY'],
  'Conflict subject',
  'A traiter'
);

grant select on tmp_conflict_ids to authenticated;
grant select on tmp_conflict_text to authenticated;

set local role authenticated;

do $$
declare
  v_user uuid := (select id from tmp_conflict_ids where name = 'tcs');
  v_interaction text := (select value from tmp_conflict_text where name = 'interaction');
  v_expected_updated_at timestamptz;
  v_count int;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_user::text, true);

  select updated_at into v_expected_updated_at
  from public.interactions
  where id = v_interaction;

  update public.interactions
  set status = 'UPDATED_OK'
  where id = v_interaction
    and updated_at = v_expected_updated_at;

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'expected update should affect 1 row';
  end if;

  update public.interactions
  set status = 'UPDATED_STALE'
  where id = v_interaction
    and updated_at = v_expected_updated_at;

  get diagnostics v_count = row_count;
  if v_count <> 0 then
    raise exception 'stale update should affect 0 rows';
  end if;
end;
$$;

rollback;
