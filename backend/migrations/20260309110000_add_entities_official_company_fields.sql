alter table public.entities
  add column if not exists siren text,
  add column if not exists naf_code text,
  add column if not exists official_name text,
  add column if not exists official_data_source text,
  add column if not exists official_data_synced_at timestamptz;
