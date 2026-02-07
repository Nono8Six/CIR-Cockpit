-- Add role + archived_at to profiles

alter table public.profiles
  add column if not exists role public.user_role not null default 'tcs',
  add column if not exists archived_at timestamptz;
