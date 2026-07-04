delete from public.ai_response_cache
where provider <> 'openrouter';

delete from public.ai_usage_events
where provider <> 'openrouter';

delete from public.ai_model_configs
where provider <> 'openrouter';

delete from public.ai_provider_configs
where provider <> 'openrouter';

alter table public.ai_provider_configs
  drop constraint if exists ai_provider_configs_provider_check;
alter table public.ai_provider_configs
  add constraint ai_provider_configs_provider_check
  check (provider = 'openrouter');

alter table public.ai_model_configs
  drop constraint if exists ai_model_configs_provider_check;
alter table public.ai_model_configs
  add constraint ai_model_configs_provider_check
  check (provider = 'openrouter');

alter table public.ai_usage_events
  drop constraint if exists ai_usage_events_provider_check;
alter table public.ai_usage_events
  add constraint ai_usage_events_provider_check
  check (provider = 'openrouter');

alter table public.ai_response_cache
  drop constraint if exists ai_response_cache_provider_check;
alter table public.ai_response_cache
  add constraint ai_response_cache_provider_check
  check (provider = 'openrouter');

insert into public.ai_provider_configs(provider, label, enabled)
values ('openrouter', 'OpenRouter', false)
on conflict (provider) do update set
  label = excluded.label,
  updated_at = now();
