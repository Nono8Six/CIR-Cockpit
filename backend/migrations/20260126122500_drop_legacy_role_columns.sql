-- Drop legacy role columns

alter table public.profiles
  drop column if exists is_super_admin;

alter table public.agency_members
  drop column if exists role;
