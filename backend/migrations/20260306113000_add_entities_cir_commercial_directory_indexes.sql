create extension if not exists pg_trgm;

alter table public.entities
  add column if not exists cir_commercial_id uuid references public.profiles(id) on delete set null;

drop index if exists public.entities_client_number_key;
create unique index if not exists entities_client_number_client_unique
  on public.entities (lower(client_number))
  where entity_type = 'Client' and client_number is not null;

create index if not exists idx_entities_cir_commercial_id
  on public.entities (cir_commercial_id);

create index if not exists idx_entities_directory_scope
  on public.entities (entity_type, archived_at, agency_id, updated_at desc);

create index if not exists idx_entities_directory_department
  on public.entities (department);

create index if not exists idx_entities_directory_city
  on public.entities (lower(city));

create index if not exists idx_entities_directory_name_trgm
  on public.entities using gin (lower(name) gin_trgm_ops);

create index if not exists idx_entities_directory_client_number_trgm
  on public.entities using gin (lower(client_number) gin_trgm_ops)
  where client_number is not null;
