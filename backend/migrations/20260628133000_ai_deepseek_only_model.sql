update public.ai_model_configs
set enabled = true,
    is_default = true,
    updated_at = now()
where provider = 'openrouter'
  and model_id = 'deepseek/deepseek-v4-pro';

delete from public.ai_model_configs
where provider = 'openrouter'
  and model_id <> 'deepseek/deepseek-v4-pro';
