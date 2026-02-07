-- Restrict agency config writes to super_admin only

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
