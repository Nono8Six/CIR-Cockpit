alter table public.ai_usage_daily_aggregates
  add column if not exists id uuid default gen_random_uuid();
update public.ai_usage_daily_aggregates set id = gen_random_uuid() where id is null;
alter table public.ai_usage_daily_aggregates alter column id set not null;
alter table public.ai_usage_daily_aggregates
  add constraint ai_usage_daily_aggregates_pkey primary key (id);
