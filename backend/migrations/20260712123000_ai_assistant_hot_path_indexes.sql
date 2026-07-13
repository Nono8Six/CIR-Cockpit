drop index if exists public.ai_usage_events_feature_user_status_created_idx;
drop index if exists public.ai_usage_events_feature_agency_status_created_idx;

create index if not exists ai_usage_events_feature_user_billable_created_idx
  on public.ai_usage_events(feature, user_id, created_at desc)
  where user_id is not null and status <> 'blocked';
create index if not exists ai_usage_events_feature_agency_billable_created_idx
  on public.ai_usage_events(feature, agency_id, created_at desc)
  where agency_id is not null and status <> 'blocked';
