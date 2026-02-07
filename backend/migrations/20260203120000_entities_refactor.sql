-- Unify entities (clients/prospects/fournisseurs) + contacts, cleanup source

create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  client_number text,
  account_type public.account_type,
  name text not null,
  agency_id uuid references public.agencies(id) on delete set null,
  address text,
  postal_code text,
  department text,
  city text,
  country text not null default 'France',
  siret text,
  notes text,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entities_entity_type_trim check (entity_type = btrim(entity_type) and char_length(entity_type) > 0),
  constraint entities_name_trim check (name = btrim(name) and char_length(name) > 0),
  constraint entities_client_number_format check (client_number is null or client_number ~ '^[0-9]{1,10}$'),
  constraint entities_client_number_trim check (client_number is null or client_number = btrim(client_number)),
  constraint entities_postal_code_format check (postal_code is null or postal_code ~ '^[0-9]{5}$'),
  constraint entities_postal_code_trim check (postal_code is null or postal_code = btrim(postal_code)),
  constraint entities_department_format check (department is null or department ~ '^[0-9]{2}$'),
  constraint entities_department_trim check (department is null or department = btrim(department)),
  constraint entities_address_trim check (address is null or (address = btrim(address) and char_length(address) > 0)),
  constraint entities_city_trim check (city is null or (city = btrim(city) and char_length(city) > 0))
);

create unique index if not exists entities_client_number_key
  on public.entities (lower(client_number))
  where client_number is not null;

create index if not exists idx_entities_agency_id
  on public.entities (agency_id);

create index if not exists idx_entities_created_by
  on public.entities (created_by);

create index if not exists idx_entities_name_search
  on public.entities (lower(name));

create index if not exists idx_entities_archived_active
  on public.entities (archived_at);

create index if not exists idx_entities_entity_type
  on public.entities (lower(entity_type));

alter table public.entities enable row level security;

drop trigger if exists set_updated_at_entities on public.entities;
create trigger set_updated_at_entities
before update on public.entities
for each row execute function public.set_updated_at();

create or replace function public.set_entity_created_by()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is null then
    new.created_by := public.audit_actor_id();
  end if;
  return new;
end;
$$;

drop trigger if exists set_entity_created_by on public.entities;
create trigger set_entity_created_by
before insert on public.entities
for each row execute function public.set_entity_created_by();

create or replace function public.prevent_entity_agency_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.agency_id is distinct from old.agency_id and not public.is_super_admin() then
    raise exception 'entity agency update is restricted to super_admin';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_entity_agency_change on public.entities;
create trigger prevent_entity_agency_change
before update of agency_id on public.entities
for each row execute function public.prevent_entity_agency_change();

create table if not exists public.entity_contacts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  first_name text,
  last_name text not null,
  email text,
  phone text,
  position text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entity_contacts_last_name_trim check (last_name = btrim(last_name) and char_length(last_name) > 0),
  constraint entity_contacts_email_trim check (email is null or email = btrim(email)),
  constraint entity_contacts_phone_trim check (phone is null or phone = btrim(phone))
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'entity_contacts_phone_or_email') then
    alter table public.entity_contacts
      add constraint entity_contacts_phone_or_email
      check (
        (email is not null and btrim(email) <> '')
        or (phone is not null and btrim(phone) <> '')
      );
  end if;
end $$;

create index if not exists idx_entity_contacts_entity_id
  on public.entity_contacts (entity_id);

create index if not exists idx_entity_contacts_archived_active
  on public.entity_contacts (archived_at);

create index if not exists idx_entity_contacts_last_name_search
  on public.entity_contacts (lower(last_name));

alter table public.entity_contacts enable row level security;

drop trigger if exists set_updated_at_entity_contacts on public.entity_contacts;
create trigger set_updated_at_entity_contacts
before update on public.entity_contacts
for each row execute function public.set_updated_at();

-- Migrate clients -> entities
insert into public.entities (
  id,
  entity_type,
  client_number,
  account_type,
  name,
  agency_id,
  address,
  postal_code,
  department,
  city,
  country,
  siret,
  notes,
  archived_at,
  created_by,
  created_at,
  updated_at
)
select
  c.id,
  'Client',
  c.client_number,
  c.account_type,
  c.name,
  c.agency_id,
  c.address,
  c.postal_code,
  c.department,
  c.city,
  c.country,
  c.siret,
  c.notes,
  c.archived_at,
  c.created_by,
  c.created_at,
  c.updated_at
from public.clients c
on conflict (id) do nothing;

insert into public.entity_contacts (
  id,
  entity_id,
  first_name,
  last_name,
  email,
  phone,
  position,
  notes,
  archived_at,
  created_at,
  updated_at
)
select
  cc.id,
  cc.client_id,
  cc.first_name,
  cc.last_name,
  cc.email,
  cc.phone,
  cc.position,
  cc.notes,
  cc.archived_at,
  cc.created_at,
  cc.updated_at
from public.client_contacts cc
on conflict (id) do nothing;

alter table public.interactions
  drop constraint if exists interactions_client_id_fkey;

alter table public.interactions
  rename column client_id to entity_id;

alter table public.interactions
  add constraint interactions_entity_id_fkey
  foreign key (entity_id) references public.entities(id) on delete set null;

alter table public.interactions
  drop constraint if exists interactions_contact_id_fkey;

alter table public.interactions
  add constraint interactions_contact_id_fkey
  foreign key (contact_id) references public.entity_contacts(id) on delete set null;

alter table public.interactions
  drop column if exists lead_source;

alter table public.interactions
  drop column if exists supplier_ref;

drop index if exists idx_interactions_client_id;
create index if not exists idx_interactions_entity_id
  on public.interactions (entity_id);

-- Update sync status to resolve agency from entity
create or replace function public.sync_interaction_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status_id uuid;
  v_label text;
  v_agency_id uuid;
  v_is_terminal boolean;
  v_entity_agency_id uuid;
begin
  if NEW.entity_id is not null and NEW.agency_id is null then
    select e.agency_id
      into v_entity_agency_id
    from public.entities e
    where e.id = NEW.entity_id;
  end if;

  if NEW.status_id is not null then
    select s.label, s.agency_id, s.is_terminal
      into v_label, v_agency_id, v_is_terminal
    from public.agency_statuses s
    where s.id = NEW.status_id;

    if v_label is null then
      raise exception 'Invalid status_id %', NEW.status_id;
    end if;

    if NEW.agency_id is null then
      NEW.agency_id := v_agency_id;
    elsif NEW.agency_id <> v_agency_id then
      raise exception 'status_id does not belong to agency %', NEW.agency_id;
    end if;

    NEW.status := v_label;
    NEW.status_is_terminal := v_is_terminal;
    return NEW;
  end if;

  if NEW.status is not null then
    if NEW.agency_id is null then
      NEW.agency_id := v_entity_agency_id;
    end if;

    if NEW.agency_id is null then
      return NEW;
    end if;

    select s.id, s.label, s.is_terminal
      into v_status_id, v_label, v_is_terminal
    from public.agency_statuses s
    where s.agency_id = NEW.agency_id
      and s.label = NEW.status;

    if v_status_id is null then
      return NEW;
    end if;

    NEW.status_id := v_status_id;
    NEW.status := v_label;
    NEW.status_is_terminal := v_is_terminal;
    return NEW;
  end if;

  return NEW;
end;
$$;

-- Audit log updates for entities
create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text := lower(TG_OP);
  v_actor_id uuid := public.audit_actor_id();
  v_is_super_admin boolean := coalesce(public.is_super_admin(), false);
  v_agency_id uuid;
  v_entity_id text;
  v_metadata jsonb;
  v_entity_ref uuid;
begin
  if TG_TABLE_NAME = 'agencies' then
    v_entity_id := coalesce(NEW.id, OLD.id)::text;
    if TG_OP = 'DELETE' then
      v_agency_id := null;
    else
      v_agency_id := coalesce(NEW.id, OLD.id);
    end if;
  else
    v_entity_id := coalesce(NEW.id, OLD.id)::text;
  end if;

  if TG_TABLE_NAME = 'entity_contacts' then
    v_entity_ref := coalesce(NEW.entity_id, OLD.entity_id);
    select e.agency_id into v_agency_id
    from public.entities e
    where e.id = v_entity_ref;
  elsif TG_TABLE_NAME = 'interactions' then
    v_agency_id := coalesce(NEW.agency_id, OLD.agency_id);
    if v_agency_id is null then
      v_entity_ref := coalesce(NEW.entity_id, OLD.entity_id);
      select e.agency_id into v_agency_id
      from public.entities e
      where e.id = v_entity_ref;
    end if;
  elsif TG_TABLE_NAME <> 'agencies' then
    v_agency_id := coalesce(NEW.agency_id, OLD.agency_id);
  end if;

  v_metadata := jsonb_build_object(
    'agency_id', v_agency_id::text,
    'entity_id', v_entity_id
  );

  if TG_TABLE_NAME = 'agencies' then
    v_metadata := v_metadata || jsonb_build_object(
      'name', coalesce(NEW.name, OLD.name)
    );
  elsif TG_TABLE_NAME = 'entities' then
    v_metadata := v_metadata || jsonb_build_object(
      'entity_type', coalesce(NEW.entity_type, OLD.entity_type),
      'client_number', coalesce(NEW.client_number, OLD.client_number),
      'name', coalesce(NEW.name, OLD.name)
    );
  elsif TG_TABLE_NAME = 'entity_contacts' then
    v_metadata := v_metadata || jsonb_build_object(
      'entity_id', coalesce(NEW.entity_id, OLD.entity_id),
      'email', coalesce(NEW.email, OLD.email),
      'phone', coalesce(NEW.phone, OLD.phone),
      'position', coalesce(NEW.position, OLD.position)
    );
  elsif TG_TABLE_NAME = 'interactions' then
    if TG_OP = 'INSERT' then
      v_metadata := v_metadata || jsonb_build_object('status_after', NEW.status);
    elsif TG_OP = 'UPDATE' then
      if NEW.status is distinct from OLD.status then
        v_metadata := v_metadata || jsonb_build_object(
          'status_before', OLD.status,
          'status_after', NEW.status
        );
      end if;
    else
      v_metadata := v_metadata || jsonb_build_object('status_before', OLD.status);
    end if;
  elsif TG_TABLE_NAME = 'agency_members' then
    v_metadata := v_metadata || jsonb_build_object(
      'user_id', coalesce(NEW.user_id, OLD.user_id)
    );
  elsif TG_TABLE_NAME in ('agency_statuses', 'agency_services', 'agency_entities', 'agency_families') then
    v_metadata := v_metadata || jsonb_build_object(
      'label', coalesce(NEW.label, OLD.label)
    );
  end if;

  insert into public.audit_logs (
    agency_id,
    actor_id,
    actor_is_super_admin,
    action,
    entity_table,
    entity_id,
    metadata
  ) values (
    v_agency_id,
    v_actor_id,
    v_is_super_admin,
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    v_metadata
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

-- Audit triggers

drop trigger if exists audit_entities on public.entities;
create trigger audit_entities
after insert or update or delete on public.entities
for each row execute function public.log_audit_event();

drop trigger if exists audit_entity_contacts on public.entity_contacts;
create trigger audit_entity_contacts
after insert or update or delete on public.entity_contacts
for each row execute function public.log_audit_event();

-- RLS policies for entities

drop policy if exists entities_select on public.entities;
create policy entities_select
on public.entities
for select to authenticated
using (
  public.is_super_admin()
  or public.is_member(agency_id)
  or agency_id is null
);

drop policy if exists entities_insert on public.entities;
create policy entities_insert
on public.entities
for insert to authenticated
with check (
  public.is_super_admin()
  or (public.is_member(agency_id) and created_by = (select auth.uid()))
);

drop policy if exists entities_update on public.entities;
create policy entities_update
on public.entities
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

drop policy if exists entities_delete on public.entities;
create policy entities_delete
on public.entities
for delete to authenticated
using (public.is_super_admin());

-- RLS policies for entity_contacts

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
        or e.agency_id is null
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
        or e.agency_id is null
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
        or e.agency_id is null
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
        or e.agency_id is null
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
        or e.agency_id is null
      )
  )
);

-- Interactions policies (replace client_id with entity_id)

drop policy if exists interactions_select on public.interactions;
create policy interactions_select
on public.interactions
for select to authenticated
using (
  public.is_super_admin()
  or created_by = (select auth.uid())
  or (
    entity_id is not null and exists (
      select 1
      from public.entities e
      where e.id = interactions.entity_id
        and (
          public.is_super_admin()
          or public.is_member(e.agency_id)
          or e.agency_id is null
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
            or e.agency_id is null
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
  or created_by = (select auth.uid())
  or (
    entity_id is not null and exists (
      select 1
      from public.entities e
      where e.id = interactions.entity_id
        and (
          public.is_super_admin()
          or public.is_member(e.agency_id)
          or e.agency_id is null
        )
    )
  )
  or (
    entity_id is null and agency_id is not null and public.is_member(agency_id)
  )
)
with check (
  public.is_super_admin()
  or created_by = (select auth.uid())
  or (
    entity_id is not null and exists (
      select 1
      from public.entities e
      where e.id = interactions.entity_id
        and (
          public.is_super_admin()
          or public.is_member(e.agency_id)
          or e.agency_id is null
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
  or created_by = (select auth.uid())
  or (
    entity_id is not null and exists (
      select 1
      from public.entities e
      where e.id = interactions.entity_id
        and (
          public.is_super_admin()
          or public.is_member(e.agency_id)
          or e.agency_id is null
        )
    )
  )
  or (
    entity_id is null and agency_id is not null and public.is_member(agency_id)
  )
);

-- Cleanup old clients tables + policies + functions

drop policy if exists clients_select on public.clients;
drop policy if exists clients_insert on public.clients;
drop policy if exists clients_update on public.clients;
drop policy if exists clients_delete on public.clients;

drop policy if exists client_contacts_select on public.client_contacts;
drop policy if exists client_contacts_insert on public.client_contacts;
drop policy if exists client_contacts_update on public.client_contacts;
drop policy if exists client_contacts_delete on public.client_contacts;

drop trigger if exists audit_clients on public.clients;
drop trigger if exists audit_client_contacts on public.client_contacts;

drop trigger if exists set_updated_at_clients on public.clients;
drop trigger if exists set_updated_at_client_contacts on public.client_contacts;

drop trigger if exists set_client_created_by on public.clients;
drop trigger if exists prevent_client_agency_change on public.clients;

drop table if exists public.client_contacts;
drop table if exists public.clients;

drop function if exists public.set_client_created_by();
drop function if exists public.prevent_client_agency_change();
