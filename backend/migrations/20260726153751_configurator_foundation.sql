-- Configurateurs C1 - noyau commun, provenance, imports et snapshots.
-- Le schema reste hors Data API : la frontiere publique sera exclusivement tRPC.

create schema if not exists configurator;

revoke all on schema configurator from public, anon, authenticated;

alter default privileges in schema configurator
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema configurator
  revoke all on sequences from public, anon, authenticated;
alter default privileges in schema configurator
  revoke all on functions from public, anon, authenticated;

create table configurator.catalog_snapshot (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  label text not null,
  status text not null default 'candidate',
  is_active boolean not null default false,
  counters jsonb not null default '{}'::jsonb,
  activation_gate_status text not null default 'pending',
  activation_gate_checked_by uuid references public.profiles(id) on delete restrict,
  activation_gate_checked_at timestamptz,
  activated_by uuid references public.profiles(id) on delete restrict,
  activated_at timestamptz,
  deactivated_at timestamptz,
  activation_note text,
  activation_diff_sha256 text,
  volume_drop_justification text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_snapshot_domain_check
    check (domain in ('motor')),
  constraint catalog_snapshot_label_check
    check (label = btrim(label) and char_length(label) between 1 and 255),
  constraint catalog_snapshot_status_check
    check (status in ('candidate', 'ready', 'active', 'retired', 'rejected')),
  constraint catalog_snapshot_gate_status_check
    check (activation_gate_status in ('pending', 'passed', 'failed')),
  constraint catalog_snapshot_gate_audit_check
    check (
      (activation_gate_status = 'pending'
        and activation_gate_checked_by is null
        and activation_gate_checked_at is null)
      or
      (activation_gate_status in ('passed', 'failed')
        and activation_gate_checked_by is not null
        and activation_gate_checked_at is not null)
    ),
  constraint catalog_snapshot_diff_sha256_check
    check (
      activation_diff_sha256 is null
      or activation_diff_sha256 ~ '^[a-f0-9]{64}$'
    ),
  constraint catalog_snapshot_activation_state_check
    check (
      (
        is_active
        and status = 'active'
        and activation_gate_status = 'passed'
        and activated_by is not null
        and activated_at is not null
        and deactivated_at is null
        and activation_note is not null
        and activation_note = btrim(activation_note)
        and char_length(activation_note) > 0
        and activation_diff_sha256 is not null
      )
      or
      (
        not is_active
        and status <> 'active'
      )
    )
);

create unique index catalog_snapshot_one_active_per_domain_idx
  on configurator.catalog_snapshot (domain)
  where is_active;

create index catalog_snapshot_created_by_idx
  on configurator.catalog_snapshot (created_by);

create index catalog_snapshot_gate_checked_by_idx
  on configurator.catalog_snapshot (activation_gate_checked_by)
  where activation_gate_checked_by is not null;

create index catalog_snapshot_activated_by_idx
  on configurator.catalog_snapshot (activated_by)
  where activated_by is not null;

create index catalog_snapshot_domain_status_created_idx
  on configurator.catalog_snapshot (domain, status, created_at desc);

create table configurator.source_document (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  filename text not null,
  sha256 text not null,
  edition_label text not null,
  page_count integer not null,
  created_at timestamptz not null default now(),
  constraint source_document_brand_check
    check (brand = btrim(brand) and char_length(brand) between 1 and 255),
  constraint source_document_filename_check
    check (filename = btrim(filename) and char_length(filename) between 1 and 500),
  constraint source_document_sha256_check
    check (sha256 ~ '^[a-f0-9]{64}$'),
  constraint source_document_edition_check
    check (
      edition_label = btrim(edition_label)
      and char_length(edition_label) between 1 and 255
    ),
  constraint source_document_page_count_check
    check (page_count > 0),
  constraint source_document_sha256_unique unique (sha256)
);

create index source_document_brand_edition_idx
  on configurator.source_document (brand, edition_label);

create table configurator.source_ref (
  id bigint generated always as identity primary key,
  document_id uuid not null
    references configurator.source_document(id) on delete restrict,
  pdf_page integer not null,
  catalog_page text,
  table_index integer,
  extraction_method text not null,
  normalization_note text,
  extracted_at timestamptz not null,
  verified_by uuid references public.profiles(id) on delete restrict,
  verified_at timestamptz,
  constraint source_ref_pdf_page_check
    check (pdf_page > 0),
  constraint source_ref_catalog_page_check
    check (
      catalog_page is null
      or (
        catalog_page = btrim(catalog_page)
        and char_length(catalog_page) between 1 and 100
      )
    ),
  constraint source_ref_table_index_check
    check (table_index is null or table_index >= 0),
  constraint source_ref_extraction_method_check
    check (
      extraction_method in (
        'pdfplumber-table',
        'pdfplumber-rotated',
        'pdfplumber-anchored',
        'manual-entry',
        'computed'
      )
    ),
  constraint source_ref_verification_check
    check (
      (verified_by is null and verified_at is null)
      or (verified_by is not null and verified_at is not null)
    ),
  constraint source_ref_page_method_unique
    unique nulls not distinct (
      document_id,
      pdf_page,
      catalog_page,
      table_index,
      extraction_method,
      normalization_note
    )
);

create index source_ref_document_page_idx
  on configurator.source_ref (document_id, pdf_page);

create index source_ref_verified_by_idx
  on configurator.source_ref (verified_by)
  where verified_by is not null;

create table configurator.import_batch (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  candidate_snapshot_id uuid not null
    references configurator.catalog_snapshot(id) on delete restrict,
  fingerprint_sha256 text not null,
  status text not null default 'prepared',
  counters jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  analyzed_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  analysis_started_at timestamptz,
  analysis_completed_at timestamptz,
  constraint import_batch_domain_check
    check (domain in ('motor')),
  constraint import_batch_fingerprint_check
    check (fingerprint_sha256 ~ '^[a-f0-9]{64}$'),
  constraint import_batch_status_check
    check (
      status in (
        'prepared',
        'loading',
        'analyzing',
        'analysis_failed',
        'ready',
        'rejected',
        'archived'
      )
    ),
  constraint import_batch_analysis_dates_check
    check (
      analysis_completed_at is null
      or (
        analysis_started_at is not null
        and analysis_completed_at >= analysis_started_at
      )
    ),
  constraint import_batch_snapshot_unique unique (candidate_snapshot_id),
  constraint import_batch_fingerprint_unique unique (domain, fingerprint_sha256)
);

create index import_batch_created_by_idx
  on configurator.import_batch (created_by);

create index import_batch_analyzed_by_idx
  on configurator.import_batch (analyzed_by)
  where analyzed_by is not null;

create index import_batch_status_created_idx
  on configurator.import_batch (domain, status, created_at desc);

create table configurator.import_file (
  id bigint generated always as identity primary key,
  batch_id uuid not null
    references configurator.import_batch(id) on delete cascade,
  file_role text not null,
  filename text not null,
  sha256 text not null,
  size_bytes bigint not null,
  row_count integer,
  read_status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint import_file_role_check
    check (
      file_role in (
        'manifest',
        'models',
        'operating_points',
        'efficiency_points',
        'torque_points',
        'dimensions',
        'flanges',
        'brakes',
        'correlations',
        'iec_thresholds',
        'validation_issues'
      )
    ),
  constraint import_file_filename_check
    check (filename = btrim(filename) and char_length(filename) between 1 and 500),
  constraint import_file_sha256_check
    check (sha256 ~ '^[a-f0-9]{64}$'),
  constraint import_file_size_check
    check (size_bytes > 0),
  constraint import_file_row_count_check
    check (row_count is null or row_count >= 0),
  constraint import_file_read_status_check
    check (read_status in ('pending', 'readable', 'unreadable')),
  constraint import_file_batch_role_unique unique (batch_id, file_role),
  constraint import_file_batch_sha_unique unique (batch_id, sha256)
);

create index import_file_batch_idx
  on configurator.import_file (batch_id);

create table configurator.import_issue (
  id bigint generated always as identity primary key,
  batch_id uuid not null
    references configurator.import_batch(id) on delete cascade,
  file_id bigint references configurator.import_file(id) on delete cascade,
  source_ref_id bigint references configurator.source_ref(id) on delete restrict,
  severity text not null,
  issue_code text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  activation_blocking boolean not null,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  constraint import_issue_severity_check
    check (severity in ('error', 'warning', 'info')),
  constraint import_issue_code_check
    check (
      issue_code = upper(btrim(issue_code))
      and issue_code ~ '^[A-Z0-9_]+$'
    ),
  constraint import_issue_message_check
    check (message = btrim(message) and char_length(message) between 1 and 2000),
  constraint import_issue_resolution_check
    check (
      (resolved_at is null and resolution_note is null)
      or (
        resolved_at is not null
        and resolution_note is not null
        and resolution_note = btrim(resolution_note)
        and char_length(resolution_note) > 0
      )
    )
);

create index import_issue_batch_blocking_idx
  on configurator.import_issue (batch_id, activation_blocking)
  where resolved_at is null;

create index import_issue_batch_idx
  on configurator.import_issue (batch_id);

create index import_issue_file_idx
  on configurator.import_issue (file_id)
  where file_id is not null;

create index import_issue_source_ref_idx
  on configurator.import_issue (source_ref_id)
  where source_ref_id is not null;

create index import_issue_batch_severity_code_idx
  on configurator.import_issue (batch_id, severity, issue_code);

create table configurator.saved_configuration (
  id uuid primary key default gen_random_uuid(),
  schema_version integer not null,
  domain text not null,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  scope text not null,
  label text not null,
  client_entity_id uuid references public.entities(id) on delete set null,
  snapshot_id uuid not null
    references configurator.catalog_snapshot(id) on delete restrict,
  configuration jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint saved_configuration_schema_version_check
    check (schema_version = 1),
  constraint saved_configuration_domain_check
    check (domain in ('motor')),
  constraint saved_configuration_scope_check
    check (scope in ('personal', 'agency')),
  constraint saved_configuration_label_check
    check (label = btrim(label) and char_length(label) between 1 and 200),
  constraint saved_configuration_payload_check
    check (
      jsonb_typeof(configuration) = 'object'
      and configuration ->> 'domain' = domain
      and configuration ->> 'payload_schema_version' = schema_version::text
    )
);

create index saved_configuration_owner_active_idx
  on configurator.saved_configuration (owner_id, updated_at desc)
  where archived_at is null;

create index saved_configuration_owner_idx
  on configurator.saved_configuration (owner_id);

create index saved_configuration_agency_scope_active_idx
  on configurator.saved_configuration (agency_id, scope, updated_at desc)
  where archived_at is null;

create index saved_configuration_agency_idx
  on configurator.saved_configuration (agency_id);

create index saved_configuration_snapshot_idx
  on configurator.saved_configuration (snapshot_id);

create index saved_configuration_client_idx
  on configurator.saved_configuration (client_entity_id)
  where client_entity_id is not null;

drop trigger if exists set_updated_at_catalog_snapshot
  on configurator.catalog_snapshot;
create trigger set_updated_at_catalog_snapshot
before update on configurator.catalog_snapshot
for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at_saved_configuration
  on configurator.saved_configuration;
create trigger set_updated_at_saved_configuration
before update on configurator.saved_configuration
for each row execute function private.set_updated_at();
