alter table public.pricing_reference_diffs
  add column if not exists changed_columns text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pricing_reference_diffs_diff_type_check'
      and conrelid = 'public.pricing_reference_diffs'::regclass
  ) then
    alter table public.pricing_reference_diffs
      add constraint pricing_reference_diffs_diff_type_check
      check (diff_type in ('ajoute', 'supprime', 'modifie', 'anomalie_apparue', 'anomalie_disparue'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'pricing_reference_diffs_object_type_check'
      and conrelid = 'public.pricing_reference_diffs'::regclass
  ) then
    alter table public.pricing_reference_diffs
      add constraint pricing_reference_diffs_object_type_check
      check (object_type in ('classification', 'segment', 'liaison', 'grille', 'anomalie'));
  end if;
end $$;

create table if not exists public.pricing_reference_diff_runs (
  id uuid primary key default gen_random_uuid(),
  base_snapshot_id uuid references public.pricing_reference_snapshots(id) on delete cascade,
  target_snapshot_id uuid not null references public.pricing_reference_snapshots(id) on delete cascade,
  status text not null default 'computed' check (status in ('computed', 'failed')),
  initial_import boolean not null default false,
  skipped_file_kinds text[] not null default '{}'::text[] check (
    skipped_file_kinds <@ array['classification', 'segments_grids']::text[]
  ),
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  computed_at timestamptz not null default now()
);

alter table public.pricing_reference_diff_runs enable row level security;
alter table public.pricing_reference_diff_runs force row level security;

drop policy if exists pricing_reference_diff_runs_select on public.pricing_reference_diff_runs;
create policy pricing_reference_diff_runs_select
  on public.pricing_reference_diff_runs
  for select
  to authenticated
  using (true);

drop policy if exists pricing_reference_diff_runs_insert on public.pricing_reference_diff_runs;
create policy pricing_reference_diff_runs_insert
  on public.pricing_reference_diff_runs
  for insert
  to authenticated
  with check ((select private.is_super_admin()));

drop policy if exists pricing_reference_diff_runs_update on public.pricing_reference_diff_runs;
create policy pricing_reference_diff_runs_update
  on public.pricing_reference_diff_runs
  for update
  to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

drop policy if exists pricing_reference_diff_runs_delete on public.pricing_reference_diff_runs;
create policy pricing_reference_diff_runs_delete
  on public.pricing_reference_diff_runs
  for delete
  to authenticated
  using ((select private.is_super_admin()));

grant select, insert, update, delete on table public.pricing_reference_diff_runs to authenticated;

create unique index if not exists pricing_reference_diff_runs_pair_unique_idx
  on public.pricing_reference_diff_runs (
    coalesce(base_snapshot_id, '00000000-0000-0000-0000-000000000000'::uuid),
    target_snapshot_id
  );

create index if not exists pricing_reference_diff_runs_target_idx
  on public.pricing_reference_diff_runs (target_snapshot_id, computed_at desc);

create index if not exists pricing_reference_diff_runs_base_snapshot_idx
  on public.pricing_reference_diff_runs (base_snapshot_id);

create index if not exists pricing_reference_diffs_target_object_idx
  on public.pricing_reference_diffs (target_snapshot_id, object_type);

create index if not exists pricing_reference_diffs_changed_columns_gin_idx
  on public.pricing_reference_diffs using gin (changed_columns);
