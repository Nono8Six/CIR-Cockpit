begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

lock table
  public.interaction_drafts,
  public.task_events,
  public.task_participants,
  public.tasks,
  public.task_series,
  public.task_types,
  public.activity_attachments,
  public.activity_corrections,
  public.activity_history_events,
  public.activity_participants,
  public.activity_sources,
  public.activities,
  public.interactions
in access exclusive mode;

do $migration$
declare
  v_deleted bigint;
  v_entities bigint;
  v_contacts bigint;
  v_profiles bigint;
  v_agencies bigint;
  v_audit_logs bigint;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'interactions'
      and column_name = 'reminder_at'
  ) then
    raise exception 'B3-6 guard: interactions.reminder_at is absent';
  end if;

  if to_regclass('public.idx_interactions_reminder') is null then
    raise exception 'B3-6 guard: idx_interactions_reminder is absent';
  end if;

  if (select count(*) from public.tasks) <> 0
     or (select count(*) from public.task_events) <> 0
     or (select count(*) from public.task_participants) <> 0
     or (select count(*) from public.task_types) <> 0
     or (select count(*) from public.task_series) <> 0 then
    raise exception 'B3-6 guard: Tasks data is not empty';
  end if;

  if (select count(*) from public.activities) <> 8
     or (select count(*) from public.interactions) <> 8
     or (select count(*) from public.interactions where reminder_at is not null) <> 4
     or (select count(*) from public.activity_participants) <> 13
     or (select count(*) from public.activity_sources) <> 8
     or (select count(*) from public.activity_history_events) <> 24
     or (select count(*) from public.activity_attachments) <> 0
     or (select count(*) from public.activity_corrections) <> 0 then
    raise exception 'B3-6 guard: destructive counters diverged';
  end if;

  if (
    select md5(jsonb_agg(to_jsonb(x) order by x.id)::text)
    from public.activities x
  ) is distinct from '9ddb701962e6590baccc72bd994827da' then
    raise exception 'B3-6 guard: Activities fingerprint diverged';
  end if;

  if (
    select md5(jsonb_agg(to_jsonb(x) order by x.id)::text)
    from public.interactions x
  ) is distinct from '7f3a20df415a88589c191ddf8201663d' then
    raise exception 'B3-6 guard: Interactions fingerprint diverged';
  end if;

  if (
    select md5(jsonb_agg(to_jsonb(x) order by x.id)::text)
    from public.activity_participants x
  ) is distinct from '7ec31d3862037139e5793a3679f2500b' then
    raise exception 'B3-6 guard: Activity participants fingerprint diverged';
  end if;

  if (
    select md5(jsonb_agg(to_jsonb(x) order by x.id)::text)
    from public.activity_sources x
  ) is distinct from '5f65b4103b2a594d9b205e21ffbc2789' then
    raise exception 'B3-6 guard: Activity sources fingerprint diverged';
  end if;

  if (
    select md5(jsonb_agg(to_jsonb(x) order by x.id)::text)
    from public.activity_history_events x
  ) is distinct from '9115dafcc4562bd086ca11141d47b31c' then
    raise exception 'B3-6 guard: Activity history fingerprint diverged';
  end if;

  if (select count(*) from public.interaction_drafts) <> 2 then
    raise exception 'B3-6 guard: expected exactly two drafts';
  end if;

  if (
    select md5(to_jsonb(x)::text)
    from public.interaction_drafts x
    where id = '3182a08e-791c-4ea8-b2ad-a51cede05c35'
  ) is distinct from 'b4d8ed5742fac42dd42d566d16a5287b' then
    raise exception 'B3-6 guard: authorized legacy draft diverged';
  end if;

  if (
    select md5(to_jsonb(x)::text)
    from public.interaction_drafts x
    where id = 'bb3f7015-57f8-4f22-a81f-7ad443119123'
  ) is distinct from '811de09421625cb2fd937c7c12054b58' then
    raise exception 'B3-6 guard: protected activity-v2 draft diverged';
  end if;

  select count(*) into v_entities from public.entities;
  select count(*) into v_contacts from public.entity_contacts;
  select count(*) into v_profiles from public.profiles;
  select count(*) into v_agencies from public.agencies;
  select count(*) into v_audit_logs from public.audit_logs;

  delete from public.interaction_drafts
  where id = '3182a08e-791c-4ea8-b2ad-a51cede05c35';

  get diagnostics v_deleted = row_count;
  if v_deleted <> 1 then
    raise exception 'B3-6 delete: expected one authorized draft, deleted %', v_deleted;
  end if;

  delete from public.activities
  where id = any (array[
    '95f1fe65-b1db-4b5f-8a07-6edfd22ebed2',
    '664cbb14-0237-44fd-8ff3-1c005389a593',
    '89a66d2c-f999-41b5-a6f7-cf16cd390d0d',
    '29b83fc5-4eb0-4044-8275-18bcb448f511',
    '1726ace9-8d4c-4c99-80e8-1eaf771e3de8',
    'cea81cc8-e15e-487f-afb7-c559981f0160',
    '96945ab5-d049-4d03-bf77-7c8238acf674',
    '2e281c92-4739-4913-890d-93c72ebe64d5'
  ]::uuid[]);

  get diagnostics v_deleted = row_count;
  if v_deleted <> 8 then
    raise exception 'B3-6 delete: expected eight Activities, deleted %', v_deleted;
  end if;

  delete from public.interactions
  where id = any (array[
    'mkqzfrporen320epu5h',
    'ml6l40p469h5t8hqrnj',
    'ml83smw5j160z3gq2u9',
    '77287585-e289-4f7b-b144-09b37a31872e',
    '86bfd6ba-9518-4e45-b645-753e0de77bee',
    '5f28943b-231a-472a-a708-cb098363c6af',
    'e9c9e483-69c1-49f3-866c-52739604fc83',
    'af70b0b5-f57f-4fa0-a22d-cc96b21a5653'
  ]::text[]);

  get diagnostics v_deleted = row_count;
  if v_deleted <> 8 then
    raise exception 'B3-6 delete: expected eight Interactions, deleted %', v_deleted;
  end if;

  if (select count(*) from public.activities) <> 0
     or (select count(*) from public.interactions) <> 0
     or (select count(*) from public.activity_participants) <> 0
     or (select count(*) from public.activity_sources) <> 0
     or (select count(*) from public.activity_history_events) <> 0
     or (select count(*) from public.activity_attachments) <> 0
     or (select count(*) from public.activity_corrections) <> 0 then
    raise exception 'B3-6 post-delete: targeted Activity data remains';
  end if;

  if (select count(*) from public.interaction_drafts) <> 1
     or not exists (
       select 1
       from public.interaction_drafts
       where id = 'bb3f7015-57f8-4f22-a81f-7ad443119123'
         and form_type = 'activity-v2'
     ) then
    raise exception 'B3-6 post-delete: protected activity-v2 draft was not preserved';
  end if;

  if (select count(*) from public.entities) <> v_entities
     or (select count(*) from public.entity_contacts) <> v_contacts
     or (select count(*) from public.profiles) <> v_profiles
     or (select count(*) from public.agencies) <> v_agencies then
    raise exception 'B3-6 post-delete: protected reference data changed';
  end if;

  if (select count(*) from public.audit_logs) < v_audit_logs then
    raise exception 'B3-6 post-delete: global audit data was removed';
  end if;
end
$migration$;

drop index public.idx_interactions_reminder;
alter table public.interactions drop column reminder_at;

do $verification$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'interactions'
      and column_name = 'reminder_at'
  ) then
    raise exception 'B3-6 verification: reminder_at still exists';
  end if;

  if to_regclass('public.idx_interactions_reminder') is not null then
    raise exception 'B3-6 verification: reminder index still exists';
  end if;
end
$verification$;

commit;
