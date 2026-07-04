create table if not exists public.ai_provider_configs (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique check (provider = 'openrouter'),
  label text not null,
  enabled boolean not null default false,
  encrypted_api_key text,
  api_key_last4 text,
  api_key_hash text,
  base_url text,
  organization_id text,
  last_test_status text check (last_test_status in ('success', 'failed')),
  last_test_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_model_configs (
  id uuid primary key default gen_random_uuid(),
  provider_config_id uuid not null references public.ai_provider_configs(id) on delete cascade,
  provider text not null check (provider = 'openrouter'),
  model_id text not null,
  label text not null,
  enabled boolean not null default true,
  is_default boolean not null default false,
  currency text not null default 'USD',
  input_price_per_million numeric(12, 6),
  output_price_per_million numeric(12, 6),
  cached_input_price_per_million numeric(12, 6),
  reasoning_price_per_million numeric(12, 6),
  price_effective_at timestamptz,
  max_output_tokens integer not null default 2000 check (max_output_tokens > 0),
  temperature numeric(3, 2) not null default 0.2 check (temperature >= 0 and temperature <= 1),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, model_id)
);

create unique index if not exists ai_model_configs_default_provider_idx
  on public.ai_model_configs(provider)
  where is_default;

create table if not exists public.ai_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  feature text not null unique,
  label text not null,
  description text,
  allowed_variables text[] not null default '{}',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.ai_prompt_templates(id) on delete cascade,
  version integer not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  body text not null,
  change_note text,
  created_by uuid,
  published_by uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

create unique index if not exists ai_prompt_versions_published_template_idx
  on public.ai_prompt_versions(template_id)
  where status = 'published';

create table if not exists public.ai_quota_policies (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global', 'agency', 'user')),
  agency_id uuid,
  user_id uuid,
  feature text,
  enabled boolean not null default true,
  daily_call_limit integer check (daily_call_limit is null or daily_call_limit >= 0),
  monthly_call_limit integer check (monthly_call_limit is null or monthly_call_limit >= 0),
  daily_token_limit integer check (daily_token_limit is null or daily_token_limit >= 0),
  monthly_token_limit integer check (monthly_token_limit is null or monthly_token_limit >= 0),
  daily_cost_limit numeric(12, 4) check (daily_cost_limit is null or daily_cost_limit >= 0),
  monthly_cost_limit numeric(12, 4) check (monthly_cost_limit is null or monthly_cost_limit >= 0),
  currency text not null default 'USD',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_quota_policies_scope_idx
  on public.ai_quota_policies(scope, coalesce(agency_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(feature, '*'));

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  feature text not null,
  provider text not null check (provider = 'openrouter'),
  model_id text not null,
  model_config_id uuid references public.ai_model_configs(id) on delete set null,
  prompt_version_id uuid references public.ai_prompt_versions(id) on delete set null,
  user_id uuid,
  agency_id uuid,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cached_input_tokens integer not null default 0 check (cached_input_tokens >= 0),
  reasoning_tokens integer not null default 0 check (reasoning_tokens >= 0),
  cost_amount numeric(14, 8) check (cost_amount is null or cost_amount >= 0),
  currency text not null default 'USD',
  cache_hit boolean not null default false,
  status text not null check (status in ('success', 'error', 'blocked', 'cache_hit')),
  error_code text,
  error_message text,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_feature_created_idx on public.ai_usage_events(feature, created_at desc);
create index if not exists ai_usage_events_user_created_idx on public.ai_usage_events(user_id, created_at desc);
create index if not exists ai_usage_events_agency_created_idx on public.ai_usage_events(agency_id, created_at desc);

create table if not exists public.ai_response_cache (
  id uuid primary key default gen_random_uuid(),
  feature text not null,
  cache_key text not null unique,
  provider text not null check (provider = 'openrouter'),
  model_id text not null,
  prompt_version_id uuid references public.ai_prompt_versions(id) on delete set null,
  input_hash text not null,
  response jsonb not null,
  usage jsonb not null default '{}',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_response_cache_feature_expires_idx on public.ai_response_cache(feature, expires_at);

alter table public.ai_provider_configs enable row level security;
alter table public.ai_model_configs enable row level security;
alter table public.ai_prompt_templates enable row level security;
alter table public.ai_prompt_versions enable row level security;
alter table public.ai_quota_policies enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.ai_response_cache enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'ai_provider_configs',
    'ai_model_configs',
    'ai_prompt_templates',
    'ai_prompt_versions',
    'ai_quota_policies',
    'ai_usage_events',
    'ai_response_cache'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_select_super_admin', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_super_admin', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_super_admin', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_super_admin', table_name);

    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.is_super_admin()))',
      table_name || '_select_super_admin',
      table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.is_super_admin()))',
      table_name || '_insert_super_admin',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()))',
      table_name || '_update_super_admin',
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.is_super_admin()))',
      table_name || '_delete_super_admin',
      table_name
    );
  end loop;
end $$;

insert into public.ai_provider_configs(provider, label, enabled)
values ('openrouter', 'OpenRouter', false)
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
  max_output_tokens,
  temperature
)
select
  p.id,
  'openrouter',
  'deepseek/deepseek-v4-pro',
  'DeepSeek V4 Pro',
  true,
  true,
  'USD',
  0.435,
  0.87,
  2000,
  0.2::numeric
from public.ai_provider_configs p
where p.provider = 'openrouter'
on conflict (provider, model_id) do update set
  label = excluded.label,
  enabled = excluded.enabled,
  is_default = excluded.is_default,
  currency = excluded.currency,
  input_price_per_million = excluded.input_price_per_million,
  output_price_per_million = excluded.output_price_per_million,
  max_output_tokens = excluded.max_output_tokens,
  temperature = excluded.temperature,
  updated_at = now();

insert into public.ai_prompt_templates(feature, label, description, allowed_variables)
values (
  'pricing.references.diagnose',
  'Diagnostic referentiels CIR',
  'Analyse assistee des anomalies du referentiel CIR. L IA propose des priorites, sans correction automatique.',
  array[
    'generated_at',
    'file_type',
    'classification_rows',
    'classification_unique_keys',
    'classification_duplicate_keys',
    'segments_rows',
    'segments_unique_identities',
    'segments_missing_links',
    'segments_unknown_keys',
    'segments_missing_purchase_grids',
    'anomalies_total',
    'anomalies_blocking',
    'anomalies_high',
    'anomalies_medium',
    'anomalies_low'
  ]
)
on conflict (feature) do nothing;

insert into public.ai_prompt_versions(template_id, version, status, body, change_note, published_at)
select t.id,
  1,
  'published',
  'Tu es un assistant d analyse pour les referentiels de remises CIR. Analyse uniquement les donnees fournies. Ne propose aucune correction automatique. Retourne strictement un JSON valide conforme a ce contrat: {"summary": string, "priority_anomalies": [{"title": string, "severity": "bloquante"|"haute"|"moyenne"|"faible", "evidence": string, "recommendation": string}], "recommendations": string[], "limits": string[], "confidence": number}. La confiance est un nombre entre 0 et 1.',
  'Version initiale gouvernee',
  now()
from public.ai_prompt_templates t
where t.feature = 'pricing.references.diagnose'
  and not exists (
    select 1 from public.ai_prompt_versions v where v.template_id = t.id and v.version = 1
  );

insert into public.ai_quota_policies(scope, feature, enabled, daily_call_limit, monthly_call_limit, daily_token_limit, monthly_token_limit, daily_cost_limit, monthly_cost_limit, currency)
values ('global', 'pricing.references.diagnose', true, 50, 1000, 200000, 4000000, 10, 200, 'USD')
on conflict do nothing;
