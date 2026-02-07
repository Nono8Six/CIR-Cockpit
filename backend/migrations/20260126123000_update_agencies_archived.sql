-- Add archived_at to agencies + unique name

alter table public.agencies
  add column if not exists archived_at timestamptz;

create unique index if not exists agencies_name_unique_idx
  on public.agencies (lower(name));
