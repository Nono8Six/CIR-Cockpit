-- Update RLS policies for clients/contacts/interactions/admin tables

-- Clients
alter table public.clients enable row level security;

drop policy if exists clients_select on public.clients;
create policy clients_select
on public.clients
for select to authenticated
using (
  public.is_super_admin()
  or public.is_member(agency_id)
  or agency_id is null
);

drop policy if exists clients_insert on public.clients;
create policy clients_insert
on public.clients
for insert to authenticated
with check (
  public.is_super_admin()
  or (public.is_member(agency_id) and created_by = (select auth.uid()))
);

drop policy if exists clients_update on public.clients;
create policy clients_update
on public.clients
for update to authenticated
using (
  public.is_super_admin()
  or public.is_member(agency_id)
  or agency_id is null
)
with check (
  public.is_super_admin()
  or public.is_member(agency_id)
  or agency_id is null
);

drop policy if exists clients_delete on public.clients;
create policy clients_delete
on public.clients
for delete to authenticated
using (public.is_super_admin());

-- Client contacts
alter table public.client_contacts enable row level security;

drop policy if exists client_contacts_select on public.client_contacts;
create policy client_contacts_select
on public.client_contacts
for select to authenticated
using (
  exists (
    select 1
    from public.clients c
    where c.id = client_contacts.client_id
      and (
        public.is_super_admin()
        or public.is_member(c.agency_id)
        or c.agency_id is null
      )
  )
);

drop policy if exists client_contacts_insert on public.client_contacts;
create policy client_contacts_insert
on public.client_contacts
for insert to authenticated
with check (
  exists (
    select 1
    from public.clients c
    where c.id = client_contacts.client_id
      and (
        public.is_super_admin()
        or public.is_member(c.agency_id)
        or c.agency_id is null
      )
  )
);

drop policy if exists client_contacts_update on public.client_contacts;
create policy client_contacts_update
on public.client_contacts
for update to authenticated
using (
  exists (
    select 1
    from public.clients c
    where c.id = client_contacts.client_id
      and (
        public.is_super_admin()
        or public.is_member(c.agency_id)
        or c.agency_id is null
      )
  )
)
with check (
  exists (
    select 1
    from public.clients c
    where c.id = client_contacts.client_id
      and (
        public.is_super_admin()
        or public.is_member(c.agency_id)
        or c.agency_id is null
      )
  )
);

drop policy if exists client_contacts_delete on public.client_contacts;
create policy client_contacts_delete
on public.client_contacts
for delete to authenticated
using (
  exists (
    select 1
    from public.clients c
    where c.id = client_contacts.client_id
      and (
        public.is_super_admin()
        or public.is_member(c.agency_id)
        or c.agency_id is null
      )
  )
);

-- Interactions
alter table public.interactions enable row level security;

drop policy if exists interactions_select on public.interactions;
create policy interactions_select
on public.interactions
for select to authenticated
using (
  public.is_super_admin()
  or created_by = (select auth.uid())
  or (
    client_id is not null and exists (
      select 1
      from public.clients c
      where c.id = interactions.client_id
        and (
          public.is_super_admin()
          or public.is_member(c.agency_id)
          or c.agency_id is null
        )
    )
  )
  or (
    client_id is null and agency_id is not null and public.is_member(agency_id)
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
      (client_id is not null and exists (
        select 1
        from public.clients c
        where c.id = interactions.client_id
          and (
            public.is_super_admin()
            or public.is_member(c.agency_id)
            or c.agency_id is null
          )
      ))
      or (client_id is null and agency_id is not null and public.is_member(agency_id))
    )
  )
);

drop policy if exists interactions_update on public.interactions;
create policy interactions_update
on public.interactions
for update to authenticated
using (
  public.is_super_admin()
  or created_by = (select auth.uid())
  or (
    client_id is not null and exists (
      select 1
      from public.clients c
      where c.id = interactions.client_id
        and (
          public.is_super_admin()
          or public.is_member(c.agency_id)
          or c.agency_id is null
        )
    )
  )
  or (
    client_id is null and agency_id is not null and public.is_member(agency_id)
  )
)
with check (
  public.is_super_admin()
  or created_by = (select auth.uid())
  or (
    client_id is not null and exists (
      select 1
      from public.clients c
      where c.id = interactions.client_id
        and (
          public.is_super_admin()
          or public.is_member(c.agency_id)
          or c.agency_id is null
        )
    )
  )
  or (
    client_id is null and agency_id is not null and public.is_member(agency_id)
  )
);

drop policy if exists interactions_delete on public.interactions;
create policy interactions_delete
on public.interactions
for delete to authenticated
using (
  public.is_super_admin()
  or created_by = (select auth.uid())
  or (
    client_id is not null and exists (
      select 1
      from public.clients c
      where c.id = interactions.client_id
        and (
          public.is_super_admin()
          or public.is_member(c.agency_id)
          or c.agency_id is null
        )
    )
  )
  or (
    client_id is null and agency_id is not null and public.is_member(agency_id)
  )
);

-- Agencies
alter table public.agencies enable row level security;

drop policy if exists agencies_select on public.agencies;
create policy agencies_select
on public.agencies
for select to authenticated
using (
  public.is_super_admin()
  or (public.is_member(id) and archived_at is null)
);

drop policy if exists agencies_insert on public.agencies;
create policy agencies_insert
on public.agencies
for insert to authenticated
with check (public.is_super_admin());

drop policy if exists agencies_update on public.agencies;
create policy agencies_update
on public.agencies
for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists agencies_delete on public.agencies;
create policy agencies_delete
on public.agencies
for delete to authenticated
using (public.is_super_admin());

-- Agency members
alter table public.agency_members enable row level security;

drop policy if exists agency_members_select on public.agency_members;
create policy agency_members_select
on public.agency_members
for select to authenticated
using (public.is_super_admin() or public.is_member(agency_id));

drop policy if exists agency_members_insert on public.agency_members;
create policy agency_members_insert
on public.agency_members
for insert to authenticated
with check (public.is_super_admin());

drop policy if exists agency_members_update on public.agency_members;
create policy agency_members_update
on public.agency_members
for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists agency_members_delete on public.agency_members;
create policy agency_members_delete
on public.agency_members
for delete to authenticated
using (public.is_super_admin());

-- Profiles
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select
on public.profiles
for select to authenticated
using (public.is_super_admin() or id = (select auth.uid()));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
on public.profiles
for update to authenticated
using (public.is_super_admin() or id = (select auth.uid()))
with check (
  public.is_super_admin()
  or (
    id = (select auth.uid())
    and email = (select p.email from public.profiles p where p.id = (select auth.uid()))
    and created_at = (select p.created_at from public.profiles p where p.id = (select auth.uid()))
    and ((active_agency_id is null) or public.is_member(active_agency_id))
    and (must_change_password or password_changed_at is not null)
  )
);

-- Audit logs
alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select
on public.audit_logs
for select to authenticated
using (
  public.is_super_admin()
  or (public.user_role() = 'agency_admin' and public.is_member(agency_id))
);

-- Agency config tables (unchanged behavior)

drop policy if exists agency_statuses_select on public.agency_statuses;
create policy agency_statuses_select
on public.agency_statuses
for select to authenticated
using (public.is_super_admin() or public.is_member(agency_id));

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

-- Repeat for services/entities/families

drop policy if exists agency_services_select on public.agency_services;
create policy agency_services_select
on public.agency_services
for select to authenticated
using (public.is_super_admin() or public.is_member(agency_id));

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


drop policy if exists agency_entities_select on public.agency_entities;
create policy agency_entities_select
on public.agency_entities
for select to authenticated
using (public.is_super_admin() or public.is_member(agency_id));

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


drop policy if exists agency_families_select on public.agency_families;
create policy agency_families_select
on public.agency_families
for select to authenticated
using (public.is_super_admin() or public.is_member(agency_id));

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
