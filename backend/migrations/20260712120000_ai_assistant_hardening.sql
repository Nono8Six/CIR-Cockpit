create table if not exists public.ai_usage_daily_aggregates (
  id uuid primary key default gen_random_uuid(),
  usage_date date not null,
  feature text not null,
  provider text not null,
  model_id text not null,
  agency_id uuid,
  user_id uuid,
  status text not null,
  calls bigint not null default 0 check (calls >= 0),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  cached_input_tokens bigint not null default 0 check (cached_input_tokens >= 0),
  reasoning_tokens bigint not null default 0 check (reasoning_tokens >= 0),
  cost_amount numeric(18, 8) not null default 0 check (cost_amount >= 0),
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_usage_daily_aggregates_identity_idx
  on public.ai_usage_daily_aggregates(
    usage_date, feature, provider, model_id,
    coalesce(agency_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    status, currency
  );

alter table public.ai_usage_daily_aggregates enable row level security;
revoke all on table public.ai_usage_daily_aggregates from public, anon, authenticated;
grant select, insert, update, delete on table public.ai_usage_daily_aggregates to service_role;

create index if not exists ai_usage_events_feature_status_created_idx
  on public.ai_usage_events(feature, status, created_at desc);
create index if not exists ai_usage_events_feature_user_billable_created_idx
  on public.ai_usage_events(feature, user_id, created_at desc)
  where user_id is not null and status <> 'blocked';
create index if not exists ai_usage_events_feature_agency_billable_created_idx
  on public.ai_usage_events(feature, agency_id, created_at desc)
  where agency_id is not null and status <> 'blocked';

create or replace function private.run_ai_data_retention(
  p_usage_before timestamptz default (timezone('utc', now()) - interval '90 days'),
  p_trace_before timestamptz default (timezone('utc', now()) - interval '30 days')
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_aggregated bigint := 0;
  v_deleted bigint := 0;
  v_minimized bigint := 0;
  v_reconciled bigint := 0;
  v_reservations_deleted bigint := 0;
begin
  insert into public.ai_usage_daily_aggregates(
    usage_date, feature, provider, model_id, agency_id, user_id, status, calls,
    input_tokens, output_tokens, cached_input_tokens, reasoning_tokens,
    cost_amount, currency, updated_at
  )
  select
    created_at::date, feature, provider, model_id, agency_id, user_id, status,
    count(*), sum(input_tokens), sum(output_tokens), sum(cached_input_tokens),
    sum(reasoning_tokens), coalesce(sum(cost_amount), 0), currency, pg_catalog.now()
  from public.ai_usage_events
  where created_at < p_usage_before
  group by created_at::date, feature, provider, model_id, agency_id, user_id, status, currency
  on conflict (
    usage_date, feature, provider, model_id,
    (coalesce(agency_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    status, currency
  ) do update set
    calls = excluded.calls,
    input_tokens = excluded.input_tokens,
    output_tokens = excluded.output_tokens,
    cached_input_tokens = excluded.cached_input_tokens,
    reasoning_tokens = excluded.reasoning_tokens,
    cost_amount = excluded.cost_amount,
    updated_at = pg_catalog.now();
  get diagnostics v_aggregated = row_count;

  update public.ai_usage_events
  set metadata = metadata - 'tool_trace'
  where created_at < p_trace_before and metadata ? 'tool_trace';
  get diagnostics v_minimized = row_count;

  delete from public.ai_usage_events where created_at < p_usage_before;
  get diagnostics v_deleted = row_count;

  update public.ai_request_reservations
  set status = 'error', error_code = 'AI_TIMEOUT',
      error_message = 'Reservation IA expiree avant finalisation.', response = null,
      updated_at = pg_catalog.now()
  where status = 'reserved' and expires_at <= pg_catalog.now();
  get diagnostics v_reconciled = row_count;

  delete from public.ai_request_reservations
  where status <> 'reserved' and expires_at <= pg_catalog.now();
  get diagnostics v_reservations_deleted = row_count;

  return pg_catalog.jsonb_build_object(
    'aggregates_upserted', v_aggregated,
    'usage_events_deleted', v_deleted,
    'tool_traces_minimized', v_minimized,
    'reservations_reconciled', v_reconciled,
    'reservations_deleted', v_reservations_deleted
  );
end;
$$;

revoke all on function private.run_ai_data_retention(timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function private.run_ai_data_retention(timestamptz, timestamptz)
  to service_role;

do $$
declare
  v_job_id bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for v_job_id in select jobid from cron.job where jobname = 'ai_data_retention_daily'
    loop
      perform cron.unschedule(v_job_id);
    end loop;
    perform cron.schedule(
      'ai_data_retention_daily',
      '35 3 * * *',
      $job$select private.run_ai_data_retention();$job$
    );
  end if;
end;
$$;
