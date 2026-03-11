create extension if not exists pg_trgm;

create table if not exists public.directory_saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  state jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint directory_saved_views_name_trim check (btrim(name) <> '')
);

create unique index if not exists directory_saved_views_user_name_unique
  on public.directory_saved_views (user_id, lower(name));

create unique index if not exists directory_saved_views_user_default_unique
  on public.directory_saved_views (user_id)
  where is_default;

create index if not exists directory_saved_views_user_id_idx
  on public.directory_saved_views (user_id);

create index if not exists directory_saved_views_updated_at_idx
  on public.directory_saved_views (updated_at desc);

create index if not exists idx_entities_directory_city_trgm
  on public.entities using gin (lower(city) gin_trgm_ops)
  where city is not null;

alter table public.directory_saved_views enable row level security;

drop policy if exists directory_saved_views_select on public.directory_saved_views;
create policy directory_saved_views_select
  on public.directory_saved_views
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists directory_saved_views_insert on public.directory_saved_views;
create policy directory_saved_views_insert
  on public.directory_saved_views
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists directory_saved_views_update on public.directory_saved_views;
create policy directory_saved_views_update
  on public.directory_saved_views
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists directory_saved_views_delete on public.directory_saved_views;
create policy directory_saved_views_delete
  on public.directory_saved_views
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop trigger if exists set_updated_at_directory_saved_views on public.directory_saved_views;
create trigger set_updated_at_directory_saved_views
  before update on public.directory_saved_views
  for each row execute function public.set_updated_at();
