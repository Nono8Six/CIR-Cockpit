-- Tier V1 foundation: shared fields, CIR agency reference, and business keys.
-- Search view/API wiring is intentionally deferred to the dedicated search tranche.

create table if not exists public.cir_agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text,
  city text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cir_agencies_name_trim check (name = btrim(name) and char_length(name) > 0),
  constraint cir_agencies_region_trim check (region is null or (region = btrim(region) and char_length(region) > 0)),
  constraint cir_agencies_city_trim check (city is null or (city = btrim(city) and char_length(city) > 0))
);

alter table public.cir_agencies enable row level security;
alter table public.cir_agencies force row level security;

drop trigger if exists set_updated_at_cir_agencies on public.cir_agencies;
create trigger set_updated_at_cir_agencies
before update on public.cir_agencies
for each row execute function private.set_updated_at();

drop policy if exists cir_agencies_select on public.cir_agencies;
create policy cir_agencies_select
on public.cir_agencies
for select to authenticated
using (true);

drop policy if exists cir_agencies_insert on public.cir_agencies;
create policy cir_agencies_insert
on public.cir_agencies
for insert to authenticated
with check (private.is_super_admin());

drop policy if exists cir_agencies_update on public.cir_agencies;
create policy cir_agencies_update
on public.cir_agencies
for update to authenticated
using (private.is_super_admin())
with check (private.is_super_admin());

drop policy if exists cir_agencies_delete on public.cir_agencies;
create policy cir_agencies_delete
on public.cir_agencies
for delete to authenticated
using (private.is_super_admin());

grant select, insert, update, delete on table public.cir_agencies to authenticated;

create index if not exists idx_cir_agencies_archived_name
  on public.cir_agencies (archived_at, lower(name));

alter table public.entities
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists primary_phone text,
  add column if not exists primary_email text,
  add column if not exists supplier_code text,
  add column if not exists supplier_number text,
  add column if not exists cir_agency_id uuid references public.cir_agencies(id) on delete set null;

alter table public.profiles
  add column if not exists phone text;

alter table public.entities
  drop constraint if exists entities_first_name_trim,
  drop constraint if exists entities_last_name_trim,
  drop constraint if exists entities_primary_phone_trim,
  drop constraint if exists entities_primary_email_trim,
  drop constraint if exists entities_supplier_code_format,
  drop constraint if exists entities_supplier_number_format;

alter table public.entities
  add constraint entities_first_name_trim
  check (first_name is null or (first_name = btrim(first_name) and char_length(first_name) > 0)),
  add constraint entities_last_name_trim
  check (last_name is null or (last_name = btrim(last_name) and char_length(last_name) > 0)),
  add constraint entities_primary_phone_trim
  check (primary_phone is null or (primary_phone = btrim(primary_phone) and char_length(primary_phone) > 0)),
  add constraint entities_primary_email_trim
  check (primary_email is null or (primary_email = lower(btrim(primary_email)) and char_length(primary_email) > 0)),
  add constraint entities_supplier_code_format
  check (supplier_code is null or (supplier_code = upper(btrim(supplier_code)) and supplier_code ~ '^[A-Z0-9]{1,4}$')),
  add constraint entities_supplier_number_format
  check (supplier_number is null or (supplier_number = btrim(supplier_number) and supplier_number ~ '^[0-9]{1,15}$'));

alter table public.profiles
  drop constraint if exists profiles_phone_trim;

alter table public.profiles
  add constraint profiles_phone_trim
  check (phone is null or (phone = btrim(phone) and char_length(phone) > 0));

drop index if exists public.entities_client_number_client_unique;
drop index if exists public.entities_client_number_key;

create unique index if not exists entities_client_number_unique
  on public.entities (lower(client_number))
  where client_number is not null;

create unique index if not exists entities_supplier_code_unique
  on public.entities (lower(supplier_code))
  where supplier_code is not null;

create unique index if not exists entities_supplier_number_unique
  on public.entities (supplier_number)
  where supplier_number is not null;

create index if not exists idx_entities_cir_agency_id
  on public.entities (cir_agency_id);

create index if not exists idx_entities_first_name_lower
  on public.entities (lower(first_name))
  where first_name is not null;

create index if not exists idx_entities_last_name_lower
  on public.entities (lower(last_name))
  where last_name is not null;

create index if not exists idx_entities_primary_phone_digits
  on public.entities ((regexp_replace(primary_phone, '\D', '', 'g')))
  where primary_phone is not null;

create index if not exists idx_entities_primary_email_lower
  on public.entities (lower(primary_email))
  where primary_email is not null;

create index if not exists idx_entities_supplier_code_lower
  on public.entities (lower(supplier_code))
  where supplier_code is not null;

create index if not exists idx_entities_supplier_number
  on public.entities (supplier_number)
  where supplier_number is not null;

create index if not exists idx_profiles_phone_digits
  on public.profiles ((regexp_replace(phone, '\D', '', 'g')))
  where phone is not null;

create unique index if not exists interactions_solicitation_phone_agency_unique
  on public.interactions (agency_id, (regexp_replace(contact_phone, '\D', '', 'g')))
  where entity_type = 'Sollicitation'
    and agency_id is not null
    and contact_phone is not null
    and btrim(contact_phone) <> '';

update public.entities
set entity_type = 'Prospect'
where entity_type = 'Prospect / Particulier';

update public.interactions
set entity_type = 'Prospect'
where entity_type = 'Prospect / Particulier';
