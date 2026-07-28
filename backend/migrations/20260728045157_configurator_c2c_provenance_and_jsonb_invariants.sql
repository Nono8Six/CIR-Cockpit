
set lock_timeout = '5s';
set statement_timeout = '30s';

do $migration$
declare
  v_source_ref_count bigint;
  v_snapshot_count bigint;
  v_batch_count bigint;
  v_issue_count bigint;
begin
  select count(*) into v_source_ref_count
  from configurator.source_ref;

  if v_source_ref_count <> 169 then
    raise exception 'C2c provenance repair refused: expected 169 source_ref rows, found %',
      v_source_ref_count;
  end if;

  if exists (
    select 1
    from configurator.source_ref
    where extracted_at <> timestamptz '2026-07-27 17:56:28.325861+00'
  ) then
    raise exception 'C2c provenance repair refused: source_ref timestamps are not in the audited overwritten state';
  end if;

  select count(*) into v_snapshot_count
  from configurator.catalog_snapshot;

  if v_snapshot_count <> 3 then
    raise exception 'C2c JSONB repair refused: expected 3 snapshots, found %',
      v_snapshot_count;
  end if;

  select count(*) into v_batch_count
  from configurator.import_batch;

  if v_batch_count <> 3 then
    raise exception 'C2c JSONB repair refused: expected 3 import batches, found %',
      v_batch_count;
  end if;

  select count(*) into v_issue_count
  from configurator.import_issue;

  if v_issue_count <> 2112 then
    raise exception 'C2c JSONB repair refused: expected 2112 import issues, found %',
      v_issue_count;
  end if;

  if exists (
    select 1
    from configurator.catalog_snapshot
    where jsonb_typeof(counters) = 'string'
      and jsonb_typeof((counters #>> '{}')::jsonb) <> 'object'
  ) then
    raise exception 'C2c JSONB repair refused: a snapshot counter does not decode to an object';
  end if;

  if exists (
    select 1
    from configurator.import_batch
    where jsonb_typeof(counters) = 'string'
      and jsonb_typeof((counters #>> '{}')::jsonb) <> 'object'
  ) then
    raise exception 'C2c JSONB repair refused: a batch counter does not decode to an object';
  end if;

  if exists (
    select 1
    from configurator.import_issue
    where jsonb_typeof(context) = 'string'
      and jsonb_typeof((context #>> '{}')::jsonb) <> 'object'
  ) then
    raise exception 'C2c JSONB repair refused: an issue context does not decode to an object';
  end if;
end
$migration$;

update configurator.source_ref
set extracted_at = timestamptz '2026-07-27 06:43:33.83623+00'
where extracted_at = timestamptz '2026-07-27 17:56:28.325861+00';

update configurator.catalog_snapshot
set counters = (counters #>> '{}')::jsonb
where jsonb_typeof(counters) = 'string';

update configurator.import_batch
set counters = (counters #>> '{}')::jsonb
where jsonb_typeof(counters) = 'string';

update configurator.import_issue
set context = (context #>> '{}')::jsonb
where jsonb_typeof(context) = 'string';

alter table configurator.catalog_snapshot
  add constraint catalog_snapshot_counters_object_check
  check (jsonb_typeof(counters) = 'object') not valid;

alter table configurator.catalog_snapshot
  validate constraint catalog_snapshot_counters_object_check;

alter table configurator.import_batch
  add constraint import_batch_counters_object_check
  check (jsonb_typeof(counters) = 'object') not valid;

alter table configurator.import_batch
  validate constraint import_batch_counters_object_check;

alter table configurator.import_issue
  add constraint import_issue_context_object_check
  check (jsonb_typeof(context) = 'object') not valid;

alter table configurator.import_issue
  validate constraint import_issue_context_object_check;

do $migration$
begin
  if (select count(*) from configurator.source_ref
      where extracted_at = timestamptz '2026-07-27 06:43:33.83623+00') <> 169 then
    raise exception 'C2c provenance repair postcondition failed';
  end if;

  if exists (
    select 1 from configurator.catalog_snapshot
    where jsonb_typeof(counters) <> 'object'
  ) or exists (
    select 1 from configurator.import_batch
    where jsonb_typeof(counters) <> 'object'
  ) or exists (
    select 1 from configurator.import_issue
    where jsonb_typeof(context) <> 'object'
  ) then
    raise exception 'C2c JSONB repair postcondition failed';
  end if;
end
$migration$;

comment on constraint catalog_snapshot_counters_object_check
  on configurator.catalog_snapshot
  is 'Import counters must be stored as a JSON object, never as a JSON-encoded string.';

comment on constraint import_batch_counters_object_check
  on configurator.import_batch
  is 'Import counters must be stored as a JSON object, never as a JSON-encoded string.';

comment on constraint import_issue_context_object_check
  on configurator.import_issue
  is 'Import issue context must be stored as a JSON object, never as a JSON-encoded string.';
