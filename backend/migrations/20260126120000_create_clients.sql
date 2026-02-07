-- Create clients table

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  client_number text not null,
  name text not null,
  agency_id uuid references public.agencies(id) on delete set null,
  address text not null,
  postal_code text not null,
  department text not null,
  city text not null,
  country text not null default 'France',
  siret text,
  notes text,
  archived_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_client_number_format check (client_number ~ '^[0-9]{1,10}$'),
  constraint clients_client_number_trim check (client_number = btrim(client_number)),
  constraint clients_postal_code_format check (postal_code ~ '^[0-9]{5}$'),
  constraint clients_postal_code_trim check (postal_code = btrim(postal_code)),
  constraint clients_department_format check (department ~ '^[0-9]{2}$'),
  constraint clients_department_trim check (department = btrim(department)),
  constraint clients_name_trim check (name = btrim(name) and char_length(name) > 0),
  constraint clients_address_trim check (address = btrim(address) and char_length(address) > 0),
  constraint clients_city_trim check (city = btrim(city) and char_length(city) > 0)
);

create unique index if not exists clients_client_number_key
  on public.clients (lower(client_number));

create index if not exists idx_clients_agency_id
  on public.clients (agency_id);

create index if not exists idx_clients_created_by
  on public.clients (created_by);

create index if not exists idx_clients_name_search
  on public.clients (lower(name));

create index if not exists idx_clients_archived_active
  on public.clients (archived_at)
  where archived_at is null;

alter table public.clients enable row level security;

drop trigger if exists set_updated_at_clients on public.clients;
create trigger set_updated_at_clients
before update on public.clients
for each row execute function public.set_updated_at();
