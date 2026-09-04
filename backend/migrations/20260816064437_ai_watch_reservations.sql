-- Elargit les reservations IA au vertical ReferenceWatch et corrige le
-- double-comptage des tokens (cache et reasoning sont des details des totaux).
-- Non appliquee sur le projet Supabase distant tant que le PO n autorise pas
-- apply_migration.

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'ai_request_reservations'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%feature%';
  if constraint_name is not null then
    execute format(
      'alter table public.ai_request_reservations drop constraint %I',
      constraint_name
    );
  end if;
end
$$;

alter table public.ai_request_reservations
  add constraint ai_request_reservations_feature_check
  check (feature in ('assistant.referentiels', 'pricing.references.diagnose'));

create or replace function private.reserve_ai_assistant_request(
  p_feature text,
  p_user_id uuid,
  p_agency_id uuid,
  p_client_request_id uuid,
  p_estimated_tokens integer,
  p_estimated_cost numeric
)
returns table (
  reservation_id uuid,
  admission_status text,
  is_new boolean,
  cached_response jsonb,
  cached_error_code text,
  cached_error_message text
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  existing public.ai_request_reservations%rowtype;
  quota public.ai_quota_policies%rowtype;
  day_start timestamptz := pg_catalog.date_trunc('day', pg_catalog.now());
  month_start timestamptz := pg_catalog.date_trunc('month', pg_catalog.now());
  daily_calls bigint;
  monthly_calls bigint;
  daily_tokens bigint;
  monthly_tokens bigint;
  daily_cost numeric;
  monthly_cost numeric;
  blocked_reason text;
begin
  if p_feature not in ('assistant.referentiels', 'pricing.references.diagnose')
     or p_user_id is null
     or p_estimated_tokens < 0 or p_estimated_cost < 0 then
    raise exception using errcode = '22023', message = 'Parametres de reservation IA invalides.';
  end if;

  select * into existing
  from public.ai_request_reservations r
  where r.feature = p_feature
    and r.user_id = p_user_id
    and r.client_request_id = p_client_request_id;
  if found then
    return query select existing.id, existing.status, false, existing.response,
      existing.error_code, existing.error_message;
    return;
  end if;

  -- Ordre stable : verrou wildcard commun, puis verrou de la capacite.
  -- Le wildcard serialise les politiques feature IS NULL entre verticales.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ai-quota:global:*', 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ai-quota:global:' || p_feature, 0));
  if p_agency_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ai-quota:agency:' || p_agency_id::text || ':*', 0));
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ai-quota:agency:' || p_agency_id::text || ':' || p_feature, 0));
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ai-quota:user:' || p_user_id::text || ':*', 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ai-quota:user:' || p_user_id::text || ':' || p_feature, 0));

  select * into existing
  from public.ai_request_reservations r
  where r.feature = p_feature
    and r.user_id = p_user_id
    and r.client_request_id = p_client_request_id;
  if found then
    return query select existing.id, existing.status, false, existing.response,
      existing.error_code, existing.error_message;
    return;
  end if;

  for quota in
    select * from public.ai_quota_policies q
    where q.enabled = true
      and (q.feature is null or q.feature = p_feature)
      and (q.scope = 'global'
        or (q.scope = 'agency' and q.agency_id = p_agency_id)
        or (q.scope = 'user' and q.user_id = p_user_id))
    order by case q.scope when 'global' then 1 when 'agency' then 2 else 3 end
  loop
    select
      count(*) filter (where u.created_at >= day_start),
      count(*),
      coalesce(sum(u.input_tokens + u.output_tokens)
        filter (where u.created_at >= day_start), 0),
      coalesce(sum(u.input_tokens + u.output_tokens), 0),
      coalesce(sum(u.cost_amount) filter (where u.created_at >= day_start), 0),
      coalesce(sum(u.cost_amount), 0)
    into daily_calls, monthly_calls, daily_tokens, monthly_tokens, daily_cost, monthly_cost
    from public.ai_usage_events u
    where u.created_at >= month_start and u.status <> 'blocked'
      and (quota.feature is null or u.feature = quota.feature)
      and (quota.scope = 'global'
        or (quota.scope = 'agency' and u.agency_id = p_agency_id)
        or (quota.scope = 'user' and u.user_id = p_user_id));

    select
      daily_calls + count(*) filter (where r.created_at >= day_start),
      monthly_calls + count(*),
      daily_tokens + coalesce(sum(r.estimated_tokens) filter (where r.created_at >= day_start), 0),
      monthly_tokens + coalesce(sum(r.estimated_tokens), 0),
      daily_cost + coalesce(sum(r.estimated_cost_amount) filter (where r.created_at >= day_start), 0),
      monthly_cost + coalesce(sum(r.estimated_cost_amount), 0)
    into daily_calls, monthly_calls, daily_tokens, monthly_tokens, daily_cost, monthly_cost
    from public.ai_request_reservations r
    where (quota.feature is null or r.feature = quota.feature)
      and r.status = 'reserved' and r.expires_at > pg_catalog.now()
      and (quota.scope = 'global'
        or (quota.scope = 'agency' and r.agency_id = p_agency_id)
        or (quota.scope = 'user' and r.user_id = p_user_id));

    blocked_reason := case
      when quota.daily_call_limit is not null and daily_calls + 1 > quota.daily_call_limit then 'Quota IA journalier atteint.'
      when quota.monthly_call_limit is not null and monthly_calls + 1 > quota.monthly_call_limit then 'Quota IA mensuel atteint.'
      when quota.daily_token_limit is not null and daily_tokens + p_estimated_tokens > quota.daily_token_limit then 'Quota IA journalier en tokens atteint.'
      when quota.monthly_token_limit is not null and monthly_tokens + p_estimated_tokens > quota.monthly_token_limit then 'Quota IA mensuel en tokens atteint.'
      when quota.daily_cost_limit is not null and daily_cost + p_estimated_cost > quota.daily_cost_limit then 'Quota IA journalier en cout atteint.'
      when quota.monthly_cost_limit is not null and monthly_cost + p_estimated_cost > quota.monthly_cost_limit then 'Quota IA mensuel en cout atteint.'
      else null
    end;
    exit when blocked_reason is not null;
  end loop;

  insert into public.ai_request_reservations(
    feature, user_id, agency_id, client_request_id, status,
    estimated_tokens, estimated_cost_amount, error_code, error_message, expires_at
  ) values (
    p_feature, p_user_id, p_agency_id, p_client_request_id,
    case when blocked_reason is null then 'reserved' else 'blocked' end,
    p_estimated_tokens, p_estimated_cost,
    case when blocked_reason is null then null else 'AI_QUOTA_EXCEEDED' end,
    blocked_reason,
    pg_catalog.now() + case when blocked_reason is null then interval '5 minutes' else interval '15 minutes' end
  ) returning * into existing;

  return query select existing.id, existing.status, true, existing.response,
    existing.error_code, existing.error_message;
end;
$$;
