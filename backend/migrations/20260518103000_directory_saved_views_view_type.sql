update public.directory_saved_views
set state = jsonb_set(state, '{viewType}', '"clients"'::jsonb, true)
where not state ? 'viewType';

drop index if exists public.directory_saved_views_user_name_unique;
drop index if exists public.directory_saved_views_user_default_unique;

create unique index if not exists directory_saved_views_user_type_name_unique
  on public.directory_saved_views (
    user_id,
    coalesce(state ->> 'viewType', 'clients'),
    lower(name)
  );

create unique index if not exists directory_saved_views_user_type_default_unique
  on public.directory_saved_views (
    user_id,
    coalesce(state ->> 'viewType', 'clients')
  )
  where is_default;
