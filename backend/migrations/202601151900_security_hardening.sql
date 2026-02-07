-- Security hardening (profiles + agency config)

-- Restrict profiles update to allowed fields for non-super_admin

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
on public.profiles
for update to authenticated
using (public.is_super_admin() or id = auth.uid())
with check (
  public.is_super_admin()
  or (
    id = auth.uid()
    and is_super_admin = false
    and email = (select p.email from public.profiles p where p.id = auth.uid())
    and created_at = (select p.created_at from public.profiles p where p.id = auth.uid())
  )
);

-- Restrict agency config to super_admin only

-- agency_statuses

drop policy if exists agency_statuses_insert on public.agency_statuses;
create policy agency_statuses_insert
on public.agency_statuses
for insert to authenticated
with check (public.is_super_admin());

drop policy if exists agency_statuses_update on public.agency_statuses;
create policy agency_statuses_update
on public.agency_statuses
for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists agency_statuses_delete on public.agency_statuses;
create policy agency_statuses_delete
on public.agency_statuses
for delete to authenticated
using (public.is_super_admin());

-- agency_services

drop policy if exists agency_services_insert on public.agency_services;
create policy agency_services_insert
on public.agency_services
for insert to authenticated
with check (public.is_super_admin());

drop policy if exists agency_services_update on public.agency_services;
create policy agency_services_update
on public.agency_services
for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists agency_services_delete on public.agency_services;
create policy agency_services_delete
on public.agency_services
for delete to authenticated
using (public.is_super_admin());

-- agency_entities

drop policy if exists agency_entities_insert on public.agency_entities;
create policy agency_entities_insert
on public.agency_entities
for insert to authenticated
with check (public.is_super_admin());

drop policy if exists agency_entities_update on public.agency_entities;
create policy agency_entities_update
on public.agency_entities
for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists agency_entities_delete on public.agency_entities;
create policy agency_entities_delete
on public.agency_entities
for delete to authenticated
using (public.is_super_admin());

-- agency_families

drop policy if exists agency_families_insert on public.agency_families;
create policy agency_families_insert
on public.agency_families
for insert to authenticated
with check (public.is_super_admin());

drop policy if exists agency_families_update on public.agency_families;
create policy agency_families_update
on public.agency_families
for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists agency_families_delete on public.agency_families;
create policy agency_families_delete
on public.agency_families
for delete to authenticated
using (public.is_super_admin());