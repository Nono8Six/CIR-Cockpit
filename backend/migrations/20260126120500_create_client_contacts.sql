-- Create client_contacts table

create table if not exists public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  first_name text,
  last_name text not null,
  email text,
  phone text,
  position text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_contacts_last_name_trim check (last_name = btrim(last_name) and char_length(last_name) > 0)
);

create index if not exists idx_client_contacts_client_id
  on public.client_contacts (client_id);

create index if not exists idx_client_contacts_archived_active
  on public.client_contacts (archived_at)
  where archived_at is null;

alter table public.client_contacts enable row level security;

drop trigger if exists set_updated_at_client_contacts on public.client_contacts;
create trigger set_updated_at_client_contacts
before update on public.client_contacts
for each row execute function public.set_updated_at();
