alter table public.ai_prompt_templates
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid;

create index if not exists ai_prompt_templates_active_feature_idx
  on public.ai_prompt_templates(feature)
  where archived_at is null;

comment on column public.ai_prompt_templates.archived_at is
  'Date de retrait du template de prompt. Les versions et usages sont conserves pour audit.';

comment on column public.ai_prompt_templates.archived_by is
  'Identifiant du super administrateur ayant archive le template.';
