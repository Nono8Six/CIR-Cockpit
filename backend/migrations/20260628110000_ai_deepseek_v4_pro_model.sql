create unique index if not exists ai_model_configs_provider_model_id_idx
  on public.ai_model_configs(provider, model_id);

update public.ai_model_configs
set is_default = false,
    updated_at = now()
where provider = 'openrouter';

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
