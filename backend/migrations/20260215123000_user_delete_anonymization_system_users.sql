-- Add system users to support anonymized ownership transfer before hard user delete.

alter table public.profiles
  add column if not exists is_system boolean not null default false;

create table if not exists public.agency_system_users (
  agency_id uuid primary key references public.agencies(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_agency_system_users_user_id
  on public.agency_system_users (user_id);

drop trigger if exists set_updated_at_agency_system_users on public.agency_system_users;
create trigger set_updated_at_agency_system_users
before update on public.agency_system_users
for each row
execute function public.set_updated_at();

alter table public.agency_system_users enable row level security;
