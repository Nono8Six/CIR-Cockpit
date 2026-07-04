-- Tranche 1 referentiels CIR: schema historise, Storage prive et fondation read-only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pricing-reference-sources',
  'pricing-reference-sources',
  false,
  52428800,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']::text[];

drop policy if exists pricing_reference_sources_select on storage.objects;
create policy pricing_reference_sources_select
on storage.objects
for select to authenticated
using (
  bucket_id = 'pricing-reference-sources'
  and (select private.is_super_admin())
);

drop policy if exists pricing_reference_sources_insert on storage.objects;
create policy pricing_reference_sources_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'pricing-reference-sources'
  and lower(storage.extension(name)) = 'xlsx'
  and (select private.is_super_admin())
);

drop policy if exists pricing_reference_sources_update on storage.objects;
create policy pricing_reference_sources_update
on storage.objects
for update to authenticated
using (
  bucket_id = 'pricing-reference-sources'
  and (select private.is_super_admin())
)
with check (
  bucket_id = 'pricing-reference-sources'
  and lower(storage.extension(name)) = 'xlsx'
  and (select private.is_super_admin())
);

drop policy if exists pricing_reference_sources_delete on storage.objects;
create policy pricing_reference_sources_delete
on storage.objects
for delete to authenticated
using (
  bucket_id = 'pricing-reference-sources'
  and (select private.is_super_admin())
);

create table if not exists public.pricing_reference_imports (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'brouillon',
  created_by uuid references public.profiles(id) on delete set null,
  analyzed_by uuid references public.profiles(id) on delete set null,
  analysis_started_at timestamptz,
  analysis_completed_at timestamptz,
  health_report jsonb,
  counters jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  error_details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_reference_imports_status_check check (
    status in ('brouillon', 'analyse_en_cours', 'analyse_ok', 'analyse_erreur', 'pret_activation', 'rejete', 'archive')
  ),
  constraint pricing_reference_imports_error_code_trim check (
    error_code is null or (error_code = btrim(error_code) and char_length(error_code) > 0)
  )
);

create table if not exists public.pricing_reference_import_files (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.pricing_reference_imports(id) on delete cascade,
  file_kind text not null,
  original_filename text not null,
  storage_bucket text not null default 'pricing-reference-sources',
  storage_path text not null,
  size_bytes integer not null,
  sha256 text not null,
  content_type text,
  sheet_name text,
  detected_columns text[] not null default '{}'::text[],
  row_count integer,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_reference_import_files_kind_check check (file_kind in ('classification', 'segments_grids')),
  constraint pricing_reference_import_files_name_check check (
    original_filename = btrim(original_filename)
    and char_length(original_filename) > 0
    and lower(original_filename) like '%.xlsx'
  ),
  constraint pricing_reference_import_files_bucket_check check (storage_bucket = 'pricing-reference-sources'),
  constraint pricing_reference_import_files_path_check check (
    storage_path = btrim(storage_path)
    and char_length(storage_path) > 0
    and lower(storage_path) like '%.xlsx'
  ),
  constraint pricing_reference_import_files_size_check check (size_bytes > 0 and size_bytes <= 52428800),
  constraint pricing_reference_import_files_sha256_check check (sha256 ~ '^[a-f0-9]{64}$'),
  constraint pricing_reference_import_files_row_count_check check (row_count is null or row_count >= 0),
  constraint pricing_reference_import_files_import_kind_unique unique (import_id, file_kind),
  constraint pricing_reference_import_files_storage_path_unique unique (storage_bucket, storage_path)
);

create table if not exists public.pricing_reference_snapshots (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null unique references public.pricing_reference_imports(id) on delete restrict,
  status text not null default 'cree',
  is_active boolean not null default false,
  activated_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  counters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_reference_snapshots_status_check check (status in ('cree', 'pret_activation', 'actif', 'archive')),
  constraint pricing_reference_snapshots_active_status_check check (
    (is_active = false and activated_at is null)
    or (is_active = true and status = 'actif' and activated_at is not null)
  )
);

create table if not exists public.pricing_classification_cir (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.pricing_reference_snapshots(id) on delete cascade,
  import_id uuid not null references public.pricing_reference_imports(id) on delete cascade,
  source_file_id uuid not null references public.pricing_reference_import_files(id) on delete restrict,
  source_row_number integer not null check (source_row_number > 0),
  mega text not null,
  fam text not null,
  sfa text not null,
  mega_lib text not null,
  fam_lib text not null,
  sfa_lib text not null,
  cir_key text not null,
  raw_values jsonb not null default '{}'::jsonb,
  normalized_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint pricing_classification_cir_values_trim check (
    mega = btrim(mega) and char_length(mega) > 0
    and fam = btrim(fam) and char_length(fam) > 0
    and sfa = btrim(sfa) and char_length(sfa) > 0
    and cir_key = btrim(cir_key) and char_length(cir_key) > 0
  ),
  constraint pricing_classification_cir_snapshot_key_unique unique (snapshot_id, cir_key)
);

create table if not exists public.pricing_supplier_segments (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.pricing_reference_snapshots(id) on delete cascade,
  import_id uuid not null references public.pricing_reference_imports(id) on delete cascade,
  source_file_id uuid not null references public.pricing_reference_import_files(id) on delete restrict,
  source_row_number integer not null check (source_row_number > 0),
  segment text not null,
  idnumerique text not null,
  marque text not null,
  cat_fab text not null,
  cat_fab_l text,
  strategiq text,
  codif_fair text,
  tarif_fab text,
  segment_key text not null,
  raw_values jsonb not null default '{}'::jsonb,
  normalized_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint pricing_supplier_segments_identity_trim check (
    segment = btrim(segment) and char_length(segment) > 0
    and idnumerique = btrim(idnumerique) and char_length(idnumerique) > 0
    and marque = btrim(marque) and char_length(marque) > 0
    and cat_fab = btrim(cat_fab) and char_length(cat_fab) > 0
    and segment_key = btrim(segment_key) and char_length(segment_key) > 0
  ),
  constraint pricing_supplier_segments_snapshot_key_unique unique (snapshot_id, segment_key)
);

create table if not exists public.pricing_segment_classification_links (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.pricing_reference_snapshots(id) on delete cascade,
  import_id uuid not null references public.pricing_reference_imports(id) on delete cascade,
  segment_id uuid not null references public.pricing_supplier_segments(id) on delete cascade,
  classification_id uuid references public.pricing_classification_cir(id) on delete set null,
  source_file_id uuid not null references public.pricing_reference_import_files(id) on delete restrict,
  source_row_number integer not null check (source_row_number > 0),
  mega_famille text,
  famille text,
  sous_famille text,
  cir_key text not null,
  link_status text not null,
  raw_values jsonb not null default '{}'::jsonb,
  normalized_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint pricing_segment_classification_links_status_check check (
    link_status in ('complete_valid', 'missing', 'partial', 'unknown_key', 'ambiguous')
  ),
  constraint pricing_segment_classification_links_key_unique unique (snapshot_id, segment_id, cir_key)
);

create table if not exists public.pricing_segment_purchase_grids (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.pricing_reference_snapshots(id) on delete cascade,
  import_id uuid not null references public.pricing_reference_imports(id) on delete cascade,
  segment_id uuid not null references public.pricing_supplier_segments(id) on delete cascade,
  source_file_id uuid not null references public.pricing_reference_import_files(id) on delete restrict,
  source_row_number integer not null check (source_row_number > 0),
  num_four text,
  remise_ha text,
  col_ha text,
  priorite text,
  type_grill text,
  date_debut_raw text,
  date_fin_raw text,
  date_debut_normalized text,
  date_fin_normalized text,
  borne_acha text,
  coef_retro text,
  coef_ha text,
  coef_majvte text,
  raw_values jsonb not null default '{}'::jsonb,
  normalized_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint pricing_segment_purchase_grids_row_unique unique (snapshot_id, source_file_id, source_row_number)
);

create table if not exists public.pricing_reference_anomalies (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.pricing_reference_imports(id) on delete cascade,
  snapshot_id uuid references public.pricing_reference_snapshots(id) on delete cascade,
  source_file_id uuid references public.pricing_reference_import_files(id) on delete set null,
  source_row_number integer check (source_row_number is null or source_row_number > 0),
  type text not null,
  severity text not null,
  object_type text,
  object_id text,
  columns text[] not null default '{}'::text[],
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_reference_anomalies_type_check check (
    type in (
      'missing_column',
      'empty_file',
      'classification_duplicate_key',
      'classification_required_empty',
      'segment_identity_incomplete',
      'segment_classification_incomplete',
      'segment_classification_unknown',
      'segment_ambiguous_link',
      'purchase_grid_missing',
      'invalid_file',
      'parse_failed'
    )
  ),
  constraint pricing_reference_anomalies_severity_check check (severity in ('bloquante', 'haute', 'moyenne', 'faible')),
  constraint pricing_reference_anomalies_message_check check (message = btrim(message) and char_length(message) > 0)
);

create table if not exists public.pricing_reference_diffs (
  id uuid primary key default gen_random_uuid(),
  base_snapshot_id uuid references public.pricing_reference_snapshots(id) on delete cascade,
  target_snapshot_id uuid not null references public.pricing_reference_snapshots(id) on delete cascade,
  diff_type text not null,
  object_type text not null,
  object_key text not null,
  severity text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint pricing_reference_diffs_severity_check check (severity in ('bloquante', 'haute', 'moyenne', 'faible'))
);

create unique index if not exists pricing_reference_snapshots_single_active_idx
  on public.pricing_reference_snapshots ((is_active))
  where is_active;

create index if not exists pricing_reference_imports_status_created_idx
  on public.pricing_reference_imports (status, created_at desc);
create index if not exists pricing_reference_import_files_import_idx
  on public.pricing_reference_import_files (import_id);
create index if not exists pricing_reference_snapshots_import_idx
  on public.pricing_reference_snapshots (import_id);
create index if not exists pricing_classification_cir_snapshot_idx
  on public.pricing_classification_cir (snapshot_id, cir_key);
create index if not exists pricing_classification_cir_mega_fam_idx
  on public.pricing_classification_cir (snapshot_id, mega, fam, sfa);
create index if not exists pricing_supplier_segments_snapshot_idx
  on public.pricing_supplier_segments (snapshot_id, segment_key);
create index if not exists pricing_supplier_segments_marque_cat_idx
  on public.pricing_supplier_segments (snapshot_id, marque, cat_fab);
create index if not exists pricing_supplier_segments_segment_idx
  on public.pricing_supplier_segments (snapshot_id, segment);
create index if not exists pricing_segment_links_segment_idx
  on public.pricing_segment_classification_links (segment_id);
create index if not exists pricing_segment_links_cir_status_idx
  on public.pricing_segment_classification_links (snapshot_id, cir_key, link_status);
create index if not exists pricing_segment_grids_segment_idx
  on public.pricing_segment_purchase_grids (segment_id);
create index if not exists pricing_segment_grids_supplier_idx
  on public.pricing_segment_purchase_grids (snapshot_id, num_four)
  where num_four is not null;
create index if not exists pricing_reference_anomalies_import_severity_idx
  on public.pricing_reference_anomalies (import_id, severity);
create index if not exists pricing_reference_anomalies_snapshot_type_idx
  on public.pricing_reference_anomalies (snapshot_id, type);
create index if not exists pricing_reference_diffs_target_idx
  on public.pricing_reference_diffs (target_snapshot_id, diff_type, object_type);

alter table public.pricing_reference_imports enable row level security;
alter table public.pricing_reference_imports force row level security;
alter table public.pricing_reference_import_files enable row level security;
alter table public.pricing_reference_import_files force row level security;
alter table public.pricing_reference_snapshots enable row level security;
alter table public.pricing_reference_snapshots force row level security;
alter table public.pricing_classification_cir enable row level security;
alter table public.pricing_classification_cir force row level security;
alter table public.pricing_supplier_segments enable row level security;
alter table public.pricing_supplier_segments force row level security;
alter table public.pricing_segment_classification_links enable row level security;
alter table public.pricing_segment_classification_links force row level security;
alter table public.pricing_segment_purchase_grids enable row level security;
alter table public.pricing_segment_purchase_grids force row level security;
alter table public.pricing_reference_anomalies enable row level security;
alter table public.pricing_reference_anomalies force row level security;
alter table public.pricing_reference_diffs enable row level security;
alter table public.pricing_reference_diffs force row level security;

drop trigger if exists set_updated_at_pricing_reference_imports on public.pricing_reference_imports;
create trigger set_updated_at_pricing_reference_imports
before update on public.pricing_reference_imports
for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at_pricing_reference_import_files on public.pricing_reference_import_files;
create trigger set_updated_at_pricing_reference_import_files
before update on public.pricing_reference_import_files
for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at_pricing_reference_snapshots on public.pricing_reference_snapshots;
create trigger set_updated_at_pricing_reference_snapshots
before update on public.pricing_reference_snapshots
for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at_pricing_reference_anomalies on public.pricing_reference_anomalies;
create trigger set_updated_at_pricing_reference_anomalies
before update on public.pricing_reference_anomalies
for each row execute function private.set_updated_at();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'pricing_reference_imports',
    'pricing_reference_import_files',
    'pricing_reference_snapshots',
    'pricing_classification_cir',
    'pricing_supplier_segments',
    'pricing_segment_classification_links',
    'pricing_segment_purchase_grids',
    'pricing_reference_anomalies',
    'pricing_reference_diffs'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_select', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      table_name || '_select',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_insert', table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.is_super_admin()))',
      table_name || '_insert',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_update', table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()))',
      table_name || '_update',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_delete', table_name);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.is_super_admin()))',
      table_name || '_delete',
      table_name
    );

    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
  end loop;
end
$$;
