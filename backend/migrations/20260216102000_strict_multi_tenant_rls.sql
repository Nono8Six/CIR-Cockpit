-- Enforce strict tenant isolation: remove access fallback on NULL agency_id.

drop policy if exists entities_select on public.entities;
create policy entities_select
on public.entities
for select to authenticated
using (
  public.is_super_admin()
  or public.is_member(agency_id)
);

drop policy if exists entities_update on public.entities;
create policy entities_update
on public.entities
for update to authenticated
using (
  public.is_super_admin()
  or public.is_member(agency_id)
)
with check (
  public.is_super_admin()
  or public.is_member(agency_id)
);

drop policy if exists entities_insert on public.entities;
create policy entities_insert
on public.entities
for insert to authenticated
with check (
  (public.is_super_admin() and agency_id is not null)
  or (public.is_member(agency_id) and agency_id is not null and created_by = (select auth.uid()))
);

drop policy if exists entities_delete on public.entities;
create policy entities_delete
on public.entities
for delete to authenticated
using (public.is_super_admin());

drop policy if exists entity_contacts_select on public.entity_contacts;
create policy entity_contacts_select
on public.entity_contacts
for select to authenticated
using (
  exists (
    select 1
    from public.entities e
    where e.id = entity_contacts.entity_id
      and (
        public.is_super_admin()
        or public.is_member(e.agency_id)
      )
  )
);

drop policy if exists entity_contacts_insert on public.entity_contacts;
create policy entity_contacts_insert
on public.entity_contacts
for insert to authenticated
with check (
  exists (
    select 1
    from public.entities e
    where e.id = entity_contacts.entity_id
      and (
        public.is_super_admin()
        or public.is_member(e.agency_id)
      )
  )
);

drop policy if exists entity_contacts_update on public.entity_contacts;
create policy entity_contacts_update
on public.entity_contacts
for update to authenticated
using (
  exists (
    select 1
    from public.entities e
    where e.id = entity_contacts.entity_id
      and (
        public.is_super_admin()
        or public.is_member(e.agency_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.entities e
    where e.id = entity_contacts.entity_id
      and (
        public.is_super_admin()
        or public.is_member(e.agency_id)
      )
  )
);

drop policy if exists entity_contacts_delete on public.entity_contacts;
create policy entity_contacts_delete
on public.entity_contacts
for delete to authenticated
using (
  exists (
    select 1
    from public.entities e
    where e.id = entity_contacts.entity_id
      and (
        public.is_super_admin()
        or public.is_member(e.agency_id)
      )
  )
);

drop policy if exists interactions_select on public.interactions;
create policy interactions_select
on public.interactions
for select to authenticated
using (
  public.is_super_admin()
  or (
    entity_id is not null and exists (
      select 1
      from public.entities e
      where e.id = interactions.entity_id
        and (
          public.is_super_admin()
          or public.is_member(e.agency_id)
        )
    )
  )
  or (
    entity_id is null and agency_id is not null and public.is_member(agency_id)
  )
);

drop policy if exists interactions_insert on public.interactions;
create policy interactions_insert
on public.interactions
for insert to authenticated
with check (
  public.is_super_admin()
  or (
    created_by = (select auth.uid())
    and (
      (entity_id is not null and exists (
        select 1
        from public.entities e
        where e.id = interactions.entity_id
          and (
            public.is_super_admin()
            or public.is_member(e.agency_id)
          )
      ))
      or (entity_id is null and agency_id is not null and public.is_member(agency_id))
    )
  )
);

drop policy if exists interactions_update on public.interactions;
create policy interactions_update
on public.interactions
for update to authenticated
using (
  public.is_super_admin()
  or (
    entity_id is not null and exists (
      select 1
      from public.entities e
      where e.id = interactions.entity_id
        and (
          public.is_super_admin()
          or public.is_member(e.agency_id)
        )
    )
  )
  or (
    entity_id is null and agency_id is not null and public.is_member(agency_id)
  )
)
with check (
  public.is_super_admin()
  or (
    entity_id is not null and exists (
      select 1
      from public.entities e
      where e.id = interactions.entity_id
        and (
          public.is_super_admin()
          or public.is_member(e.agency_id)
        )
    )
  )
  or (
    entity_id is null and agency_id is not null and public.is_member(agency_id)
  )
);

drop policy if exists interactions_delete on public.interactions;
create policy interactions_delete
on public.interactions
for delete to authenticated
using (
  public.is_super_admin()
  or (
    entity_id is not null and exists (
      select 1
      from public.entities e
      where e.id = interactions.entity_id
        and (
          public.is_super_admin()
          or public.is_member(e.agency_id)
        )
    )
  )
  or (
    entity_id is null and agency_id is not null and public.is_member(agency_id)
  )
);
