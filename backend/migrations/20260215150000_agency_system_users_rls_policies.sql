-- Harden RLS for agency_system_users: explicit policies, super-admin only.

alter table public.agency_system_users enable row level security;

drop policy if exists agency_system_users_select on public.agency_system_users;
create policy agency_system_users_select
on public.agency_system_users
for select to authenticated
using (public.is_super_admin());

drop policy if exists agency_system_users_insert on public.agency_system_users;
create policy agency_system_users_insert
on public.agency_system_users
for insert to authenticated
with check (public.is_super_admin());

drop policy if exists agency_system_users_update on public.agency_system_users;
create policy agency_system_users_update
on public.agency_system_users
for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists agency_system_users_delete on public.agency_system_users;
create policy agency_system_users_delete
on public.agency_system_users
for delete to authenticated
using (public.is_super_admin());
