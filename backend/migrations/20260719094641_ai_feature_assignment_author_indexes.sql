create index ai_feature_model_assignments_created_by_idx
  on public.ai_feature_model_assignments(created_by)
  where created_by is not null;

create index ai_feature_model_assignments_updated_by_idx
  on public.ai_feature_model_assignments(updated_by)
  where updated_by is not null;
