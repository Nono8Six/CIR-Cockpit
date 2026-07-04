create table if not exists public.pricing_reference_column_mapping_profiles (
  id uuid primary key default gen_random_uuid(),
  file_kind text not null,
  name text not null default 'Mapping referentiel CIR',
  column_mapping jsonb not null default '{}'::jsonb,
  aliases jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_reference_column_mapping_profiles_kind_check
    check (file_kind in ('classification', 'segments_grids')),
  constraint pricing_reference_column_mapping_profiles_name_check
    check (name = btrim(name) and char_length(name) > 0),
  constraint pricing_reference_column_mapping_profiles_mapping_object_check
    check (jsonb_typeof(column_mapping) = 'object'),
  constraint pricing_reference_column_mapping_profiles_aliases_object_check
    check (jsonb_typeof(aliases) = 'object')
);

create unique index if not exists pricing_reference_column_mapping_profiles_default_uidx
  on public.pricing_reference_column_mapping_profiles (file_kind)
  where is_default;

create index if not exists pricing_reference_column_mapping_profiles_kind_updated_idx
  on public.pricing_reference_column_mapping_profiles (file_kind, updated_at desc);

alter table public.pricing_reference_import_files
  add column if not exists mapping_profile_id uuid references public.pricing_reference_column_mapping_profiles(id) on delete set null,
  add column if not exists column_mapping jsonb not null default '{}'::jsonb,
  add column if not exists mapping_status text not null default 'non_configure',
  add column if not exists mapping_confirmed_by uuid references public.profiles(id) on delete set null,
  add column if not exists mapping_confirmed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pricing_reference_import_files_mapping_status_check'
      and conrelid = 'public.pricing_reference_import_files'::regclass
  ) then
    alter table public.pricing_reference_import_files
      add constraint pricing_reference_import_files_mapping_status_check
      check (mapping_status in ('non_configure', 'auto', 'a_confirmer', 'confirme', 'invalide'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'pricing_reference_import_files_mapping_object_check'
      and conrelid = 'public.pricing_reference_import_files'::regclass
  ) then
    alter table public.pricing_reference_import_files
      add constraint pricing_reference_import_files_mapping_object_check
      check (jsonb_typeof(column_mapping) = 'object');
  end if;
end $$;

create index if not exists pricing_reference_import_files_mapping_profile_idx
  on public.pricing_reference_import_files (mapping_profile_id);

create index if not exists pricing_reference_import_files_mapping_status_idx
  on public.pricing_reference_import_files (mapping_status);

alter table public.pricing_reference_column_mapping_profiles enable row level security;
alter table public.pricing_reference_column_mapping_profiles force row level security;

drop trigger if exists set_updated_at_pricing_reference_column_mapping_profiles
  on public.pricing_reference_column_mapping_profiles;
create trigger set_updated_at_pricing_reference_column_mapping_profiles
before update on public.pricing_reference_column_mapping_profiles
for each row execute function private.set_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pricing_reference_column_mapping_profiles'
      and policyname = 'pricing_reference_column_mapping_profiles_select_authenticated'
  ) then
    create policy pricing_reference_column_mapping_profiles_select_authenticated
      on public.pricing_reference_column_mapping_profiles
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pricing_reference_column_mapping_profiles'
      and policyname = 'pricing_reference_column_mapping_profiles_insert_super_admin'
  ) then
    create policy pricing_reference_column_mapping_profiles_insert_super_admin
      on public.pricing_reference_column_mapping_profiles
      for insert
      to authenticated
      with check (private.is_super_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pricing_reference_column_mapping_profiles'
      and policyname = 'pricing_reference_column_mapping_profiles_update_super_admin'
  ) then
    create policy pricing_reference_column_mapping_profiles_update_super_admin
      on public.pricing_reference_column_mapping_profiles
      for update
      to authenticated
      using (private.is_super_admin())
      with check (private.is_super_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pricing_reference_column_mapping_profiles'
      and policyname = 'pricing_reference_column_mapping_profiles_delete_super_admin'
  ) then
    create policy pricing_reference_column_mapping_profiles_delete_super_admin
      on public.pricing_reference_column_mapping_profiles
      for delete
      to authenticated
      using (private.is_super_admin());
  end if;
end $$;

grant select, insert, update, delete
  on public.pricing_reference_column_mapping_profiles
  to authenticated;
