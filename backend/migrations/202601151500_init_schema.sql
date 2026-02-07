-- Initial schema and RLS for CIR Cockpit

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum (
      'super_admin',
      'agency_admin',
      'tcs'
    );
  end if;
end $$;

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agency_members (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, user_id)
);

create table if not exists public.interactions (
  id text primary key,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  channel text not null,
  lead_source text not null,
  supplier_ref text,
  entity_type text not null,
  contact_service text not null,
  company_name text not null,
  contact_name text not null,
  contact_phone text not null,
  mega_families text[] not null default '{}',
  subject text not null,
  order_ref text,
  status text not null,
  reminder_at timestamptz,
  notes text,
  timeline jsonb not null default '[]'::jsonb
);

create table if not exists public.agency_statuses (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  label text not null,
  sort_order integer not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, label)
);

create table if not exists public.agency_services (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  label text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, label)
);

create table if not exists public.agency_entities (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  label text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, label)
);

create table if not exists public.agency_families (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  label text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, label)
);

create index if not exists idx_agency_members_user_id on public.agency_members (user_id);
create index if not exists idx_agency_members_agency_id on public.agency_members (agency_id);

create index if not exists idx_interactions_agency_created_at on public.interactions (agency_id, created_at desc);
create index if not exists idx_interactions_status on public.interactions (agency_id, status);
create index if not exists idx_interactions_company on public.interactions (agency_id, company_name);
create index if not exists idx_interactions_reminder on public.interactions (agency_id, reminder_at);

create index if not exists idx_agency_statuses_agency_id on public.agency_statuses (agency_id);
create index if not exists idx_agency_services_agency_id on public.agency_services (agency_id);
create index if not exists idx_agency_entities_agency_id on public.agency_entities (agency_id);
create index if not exists idx_agency_families_agency_id on public.agency_families (agency_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Updated_at triggers

drop trigger if exists set_updated_at_agencies on public.agencies;
create trigger set_updated_at_agencies
before update on public.agencies
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_agency_members on public.agency_members;
create trigger set_updated_at_agency_members
before update on public.agency_members
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_interactions on public.interactions;
create trigger set_updated_at_interactions
before update on public.interactions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_agency_statuses on public.agency_statuses;
create trigger set_updated_at_agency_statuses
before update on public.agency_statuses
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_agency_services on public.agency_services;
create trigger set_updated_at_agency_services
before update on public.agency_services
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_agency_entities on public.agency_entities;
create trigger set_updated_at_agency_entities
before update on public.agency_entities
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_agency_families on public.agency_families;
create trigger set_updated_at_agency_families
before update on public.agency_families
for each row execute function public.set_updated_at();

-- Auth profile sync

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email on auth.users
for each row execute function public.handle_user_update();

-- Helper functions for RLS

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select is_super_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_member(target_agency_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agency_members m
    where m.agency_id = target_agency_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_agency_role(target_agency_id uuid, roles public.user_role[])
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agency_members m
    where m.agency_id = target_agency_id
      and m.user_id = auth.uid()
      and m.role = any(roles)
  );
$$;

-- Seed defaults for new agencies

create or replace function public.seed_agency_defaults(target_agency_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.agency_statuses (agency_id, label, sort_order, is_default)
  select target_agency_id, value, idx, (idx = 1)
  from unnest(array[
    'A traiter',
    'En attente Info Client',
    'En attente Fournisseur',
    'Devis Envoye',
    'Clos - Gagne',
    'Clos - Perdu'
  ]) with ordinality as t(value, idx)
  on conflict (agency_id, label) do nothing;

  insert into public.agency_services (agency_id, label, sort_order)
  select target_agency_id, value, idx
  from unnest(array[
    'Maintenance/Technique',
    'Achats',
    'Comptabilite',
    'Direction',
    'Magasin/Reception'
  ]) with ordinality as t(value, idx)
  on conflict (agency_id, label) do nothing;

  insert into public.agency_entities (agency_id, label, sort_order)
  select target_agency_id, value, idx
  from unnest(array[
    'Client En Compte',
    'Prospect',
    'Client Particulier',
    'Fournisseur',
    'Transporteur',
    'Interne CIR'
  ]) with ordinality as t(value, idx)
  on conflict (agency_id, label) do nothing;

  insert into public.agency_families (agency_id, label, sort_order)
  select target_agency_id, value, idx
  from unnest(array[
    'PNEUMATIQUE',
    'HYDRAULIQUE',
    'ROULEMENT',
    'TRANSMISSION',
    'ETANCHEITE',
    'LINEAIRE',
    'AUTOMATISME',
    'OUTILLAGE',
    'LUBRIFICATION',
    'ASSEMBLAGE',
    'EPI'
  ]) with ordinality as t(value, idx)
  on conflict (agency_id, label) do nothing;
end;
$$;

create or replace function public.handle_new_agency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_agency_defaults(new.id);
  return new;
end;
$$;

drop trigger if exists on_agency_created on public.agencies;
create trigger on_agency_created
after insert on public.agencies
for each row execute function public.handle_new_agency();

-- RLS

alter table public.agencies enable row level security;
alter table public.profiles enable row level security;
alter table public.agency_members enable row level security;
alter table public.interactions enable row level security;
alter table public.agency_statuses enable row level security;
alter table public.agency_services enable row level security;
alter table public.agency_entities enable row level security;
alter table public.agency_families enable row level security;

-- Policies: agencies

drop policy if exists agencies_select on public.agencies;
create policy agencies_select
on public.agencies
for select to authenticated
using (public.is_super_admin() or public.is_member(id));

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

-- Policies: profiles

drop policy if exists profiles_select on public.profiles;
create policy profiles_select
on public.profiles
for select to authenticated
using (public.is_super_admin() or id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
on public.profiles
for update to authenticated
using (public.is_super_admin() or id = auth.uid())
with check (public.is_super_admin() or id = auth.uid());

-- Policies: agency_members

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

-- Policies: interactions

drop policy if exists interactions_select on public.interactions;
create policy interactions_select
on public.interactions
for select to authenticated
using (public.is_super_admin() or public.is_member(agency_id));

drop policy if exists interactions_insert on public.interactions;
create policy interactions_insert
on public.interactions
for insert to authenticated
with check (
  public.is_super_admin()
  or (public.is_member(agency_id) and created_by = auth.uid())
);

drop policy if exists interactions_update on public.interactions;
create policy interactions_update
on public.interactions
for update to authenticated
using (public.is_super_admin() or public.is_member(agency_id))
with check (public.is_super_admin() or public.is_member(agency_id));

drop policy if exists interactions_delete on public.interactions;
create policy interactions_delete
on public.interactions
for delete to authenticated
using (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
);

-- Policies: agency_statuses

drop policy if exists agency_statuses_select on public.agency_statuses;
create policy agency_statuses_select
on public.agency_statuses
for select to authenticated
using (public.is_super_admin() or public.is_member(agency_id));

drop policy if exists agency_statuses_insert on public.agency_statuses;
create policy agency_statuses_insert
on public.agency_statuses
for insert to authenticated
with check (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
);

drop policy if exists agency_statuses_update on public.agency_statuses;
create policy agency_statuses_update
on public.agency_statuses
for update to authenticated
using (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
)
with check (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
);

drop policy if exists agency_statuses_delete on public.agency_statuses;
create policy agency_statuses_delete
on public.agency_statuses
for delete to authenticated
using (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
);

-- Policies: agency_services

drop policy if exists agency_services_select on public.agency_services;
create policy agency_services_select
on public.agency_services
for select to authenticated
using (public.is_super_admin() or public.is_member(agency_id));

drop policy if exists agency_services_insert on public.agency_services;
create policy agency_services_insert
on public.agency_services
for insert to authenticated
with check (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
);

drop policy if exists agency_services_update on public.agency_services;
create policy agency_services_update
on public.agency_services
for update to authenticated
using (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
)
with check (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
);

drop policy if exists agency_services_delete on public.agency_services;
create policy agency_services_delete
on public.agency_services
for delete to authenticated
using (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
);

-- Policies: agency_entities

drop policy if exists agency_entities_select on public.agency_entities;
create policy agency_entities_select
on public.agency_entities
for select to authenticated
using (public.is_super_admin() or public.is_member(agency_id));

drop policy if exists agency_entities_insert on public.agency_entities;
create policy agency_entities_insert
on public.agency_entities
for insert to authenticated
with check (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
);

drop policy if exists agency_entities_update on public.agency_entities;
create policy agency_entities_update
on public.agency_entities
for update to authenticated
using (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
)
with check (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
);

drop policy if exists agency_entities_delete on public.agency_entities;
create policy agency_entities_delete
on public.agency_entities
for delete to authenticated
using (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
);

-- Policies: agency_families

drop policy if exists agency_families_select on public.agency_families;
create policy agency_families_select
on public.agency_families
for select to authenticated
using (public.is_super_admin() or public.is_member(agency_id));

drop policy if exists agency_families_insert on public.agency_families;
create policy agency_families_insert
on public.agency_families
for insert to authenticated
with check (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
);

drop policy if exists agency_families_update on public.agency_families;
create policy agency_families_update
on public.agency_families
for update to authenticated
using (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
)
with check (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
);

drop policy if exists agency_families_delete on public.agency_families;
create policy agency_families_delete
on public.agency_families
for delete to authenticated
using (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
);