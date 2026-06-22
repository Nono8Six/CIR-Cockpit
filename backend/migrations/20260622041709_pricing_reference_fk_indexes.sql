-- Tranche 1 referentiels CIR: index FK explicites signales par Supabase Advisor.

create index if not exists pricing_ref_imports_created_by_idx
  on public.pricing_reference_imports (created_by);

create index if not exists pricing_ref_imports_analyzed_by_idx
  on public.pricing_reference_imports (analyzed_by);

create index if not exists pricing_ref_import_files_uploaded_by_idx
  on public.pricing_reference_import_files (uploaded_by);

create index if not exists pricing_ref_snapshots_created_by_idx
  on public.pricing_reference_snapshots (created_by);

create index if not exists pricing_classification_import_idx
  on public.pricing_classification_cir (import_id);

create index if not exists pricing_classification_source_file_idx
  on public.pricing_classification_cir (source_file_id);

create index if not exists pricing_supplier_segments_import_idx
  on public.pricing_supplier_segments (import_id);

create index if not exists pricing_supplier_segments_source_file_idx
  on public.pricing_supplier_segments (source_file_id);

create index if not exists pricing_segment_links_import_idx
  on public.pricing_segment_classification_links (import_id);

create index if not exists pricing_segment_links_classification_idx
  on public.pricing_segment_classification_links (classification_id);

create index if not exists pricing_segment_links_source_file_idx
  on public.pricing_segment_classification_links (source_file_id);

create index if not exists pricing_segment_grids_import_idx
  on public.pricing_segment_purchase_grids (import_id);

create index if not exists pricing_segment_grids_source_file_idx
  on public.pricing_segment_purchase_grids (source_file_id);

create index if not exists pricing_anomalies_source_file_idx
  on public.pricing_reference_anomalies (source_file_id);

create index if not exists pricing_diffs_base_snapshot_idx
  on public.pricing_reference_diffs (base_snapshot_id);
