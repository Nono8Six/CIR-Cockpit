set lock_timeout = '5s';
set statement_timeout = '30s';

do $$
begin
  if exists (
    select 1 from public.ai_provider_configs where provider not in ('openrouter', 'mistral')
    union all
    select 1 from public.ai_model_configs where provider not in ('openrouter', 'mistral')
    union all
    select 1 from public.ai_usage_events where provider not in ('openrouter', 'mistral')
    union all
    select 1 from public.ai_response_cache where provider not in ('openrouter', 'mistral')
  ) then
    raise exception using
      errcode = '23514',
      message = 'Provider IA inattendu: migration interrompue.';
  end if;
end $$;

alter table public.ai_provider_configs
  drop constraint if exists ai_provider_configs_provider_check;
alter table public.ai_provider_configs
  add constraint ai_provider_configs_provider_check
  check (provider in ('openrouter', 'mistral')) not valid;
alter table public.ai_provider_configs
  validate constraint ai_provider_configs_provider_check;

alter table public.ai_model_configs
  drop constraint if exists ai_model_configs_provider_check;
alter table public.ai_model_configs
  add constraint ai_model_configs_provider_check
  check (provider in ('openrouter', 'mistral')) not valid;
alter table public.ai_model_configs
  validate constraint ai_model_configs_provider_check;

alter table public.ai_usage_events
  drop constraint if exists ai_usage_events_provider_check;
alter table public.ai_usage_events
  add constraint ai_usage_events_provider_check
  check (provider in ('openrouter', 'mistral')) not valid;
alter table public.ai_usage_events
  validate constraint ai_usage_events_provider_check;

alter table public.ai_response_cache
  drop constraint if exists ai_response_cache_provider_check;
alter table public.ai_response_cache
  add constraint ai_response_cache_provider_check
  check (provider in ('openrouter', 'mistral')) not valid;
alter table public.ai_response_cache
  validate constraint ai_response_cache_provider_check;

create table public.ai_feature_model_assignments (
  feature text primary key check (
    feature in (
      'pricing.references.diagnose',
      'pricing.references.diagnose.classification',
      'pricing.references.diagnose.segments',
      'assistant.referentiels'
    )
  ),
  model_config_id uuid not null
    references public.ai_model_configs(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_feature_model_assignments_model_config_id_idx
  on public.ai_feature_model_assignments(model_config_id);

drop trigger if exists set_updated_at_ai_feature_model_assignments
  on public.ai_feature_model_assignments;
create trigger set_updated_at_ai_feature_model_assignments
before update on public.ai_feature_model_assignments
for each row execute function private.set_updated_at();

alter table public.ai_feature_model_assignments enable row level security;
alter table public.ai_feature_model_assignments force row level security;
revoke all on table public.ai_feature_model_assignments
  from public, anon, authenticated;
grant select, insert, update, delete on table public.ai_feature_model_assignments
  to service_role;

insert into public.ai_provider_configs(provider, label, enabled)
values ('mistral', 'Mistral', false)
on conflict (provider) do update set
  label = excluded.label,
  updated_at = now();

insert into public.ai_model_configs(
  provider_config_id,
  provider,
  model_id,
  label,
  enabled,
  is_default,
  currency,
  input_price_per_million,
  output_price_per_million,
  cached_input_price_per_million,
  reasoning_price_per_million,
  price_effective_at,
  max_output_tokens,
  temperature
)
select
  p.id,
  'mistral',
  'mistral-large-2512',
  'Mistral Large 3',
  true,
  true,
  'USD',
  0.5,
  1.5,
  null,
  null,
  '2026-07-19T00:00:00Z'::timestamptz,
  2000,
  0.2::numeric
from public.ai_provider_configs p
where p.provider = 'mistral'
on conflict (provider, model_id) do update set
  provider_config_id = excluded.provider_config_id,
  label = excluded.label,
  enabled = excluded.enabled,
  is_default = excluded.is_default,
  currency = excluded.currency,
  input_price_per_million = excluded.input_price_per_million,
  output_price_per_million = excluded.output_price_per_million,
  cached_input_price_per_million = excluded.cached_input_price_per_million,
  reasoning_price_per_million = excluded.reasoning_price_per_million,
  price_effective_at = excluded.price_effective_at,
  max_output_tokens = excluded.max_output_tokens,
  temperature = excluded.temperature,
  updated_at = now();

insert into public.ai_feature_model_assignments(feature, model_config_id)
select 'assistant.referentiels', m.id
from public.ai_model_configs m
where m.provider = 'mistral'
  and m.model_id = 'mistral-large-2512'
on conflict (feature) do update set
  model_config_id = excluded.model_config_id,
  updated_at = now();
