set lock_timeout = '5s';
set statement_timeout = '60s';

select pg_advisory_xact_lock(hashtextextended('cir_cockpit_ta1_tiers_foundation', 0));

do $preflight$
begin
  if (select count(*) from public.entities) <> 6
    or (select count(*) from public.entity_contacts) <> 41
    or (select count(*) from public.interactions) <> 8
  then
    raise exception using
      errcode = 'P0001',
      message = 'TA1_PREFLIGHT_STATE_CHANGED: comptages Tiers/contacts/interactions modifies';
  end if;

  if exists (
    select 1
    from public.entities
    where lower(entity_type) not in ('client', 'prospect', 'fournisseur')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'TA1_UNMAPPED_ENTITY_TYPE: un type de tiers existant ne peut pas etre converti';
  end if;

  if (select count(*) from public.entities where lower(entity_type) = 'client') <> 4
    or exists (
      select 1
      from public.entities
      where lower(entity_type) = 'client'
        and (client_number is null or agency_id is null or account_type is null)
    )
    or exists (
      select lower(client_number)
      from public.entities
      where client_number is not null
      group by lower(client_number)
      having count(*) > 1
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'TA1_CLIENT_ACCOUNT_PREFLIGHT_FAILED: compte client incomplet ou numero duplique';
  end if;

  if exists (
    select 1
    from public.entities e
    where lower(e.entity_type) = 'client'
      and e.cir_commercial_id is not null
      and not exists (
        select 1
        from public.agency_members m
        where m.agency_id = e.agency_id
          and m.user_id = e.cir_commercial_id
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'TA1_PRIMARY_COMMERCIAL_AGENCY_MISMATCH: commercial principal hors agence';
  end if;
end
$preflight$;

alter table public.entities
  add column legal_form_code text;

alter table public.entities
  add constraint entities_legal_form_code_trim
  check (
    legal_form_code is null
    or (legal_form_code = btrim(legal_form_code) and char_length(legal_form_code) > 0)
  );

comment on column public.entities.legal_form_code is
  'Code de forme juridique, distinct du code NAF, du role envers CIR et du profil metier.';

create table public.tier_role_types (
  code text primary key,
  label text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tier_role_types_code_format
    check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint tier_role_types_label_trim
    check (label = btrim(label) and char_length(label) > 0),
  constraint tier_role_types_description_trim
    check (description is null or (description = btrim(description) and char_length(description) > 0)),
  constraint tier_role_types_sort_order_nonnegative
    check (sort_order >= 0)
);

insert into public.tier_role_types (code, label, description, sort_order)
values
  ('client', 'Client', 'Organisation ou personne disposant d un compte client CIR.', 10),
  ('prospect', 'Prospect', 'Organisation ou personne en relation commerciale avant ouverture de compte.', 20),
  ('supplier', 'Fournisseur', 'Organisation aupres de laquelle CIR achete.', 30),
  ('manufacturer', 'Fabricant', 'Organisation portant la responsabilite industrielle d un produit.', 40);

create table public.tier_roles (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  role_code text not null references public.tier_role_types(code) on delete restrict,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  source_system text not null,
  source_record_id text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tier_roles_validity_check
    check (valid_to is null or valid_to >= valid_from),
  constraint tier_roles_source_system_check
    check (source_system in ('entities_compatibility', 'canonical')),
  constraint tier_roles_source_record_id_trim
    check (source_record_id = btrim(source_record_id) and char_length(source_record_id) > 0)
);

create unique index tier_roles_one_active_role_idx
  on public.tier_roles (entity_id, role_code)
  where valid_to is null;
create index tier_roles_entity_id_idx on public.tier_roles (entity_id);
create index tier_roles_role_code_idx on public.tier_roles (role_code);

create table public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null unique references public.entities(id) on delete cascade,
  client_number text not null,
  account_type public.account_type not null,
  account_status text,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  primary_commercial_id uuid references public.profiles(id) on delete restrict,
  number_authority text not null default 'erp_as400',
  status_authority text not null default 'erp_as400',
  source_system text not null,
  source_record_id text not null,
  source_synced_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_accounts_client_number_format
    check (client_number = btrim(client_number) and client_number ~ '^[0-9]{1,10}$'),
  constraint customer_accounts_status_trim
    check (account_status is null or (account_status = btrim(account_status) and char_length(account_status) > 0)),
  constraint customer_accounts_number_authority_check
    check (number_authority = 'erp_as400'),
  constraint customer_accounts_status_authority_check
    check (status_authority = 'erp_as400'),
  constraint customer_accounts_source_system_check
    check (source_system in ('entities_compatibility', 'canonical', 'erp_as400')),
  constraint customer_accounts_source_record_id_trim
    check (source_record_id = btrim(source_record_id) and char_length(source_record_id) > 0),
  constraint customer_accounts_primary_commercial_required
    check (source_system = 'entities_compatibility' or primary_commercial_id is not null)
);

create unique index customer_accounts_client_number_unique
  on public.customer_accounts (lower(client_number));
create index customer_accounts_agency_id_idx on public.customer_accounts (agency_id);
create index customer_accounts_primary_commercial_id_idx
  on public.customer_accounts (primary_commercial_id)
  where primary_commercial_id is not null;
create index customer_accounts_active_agency_idx
  on public.customer_accounts (agency_id, updated_at desc)
  where archived_at is null;

create table public.customer_account_secondary_commercials (
  id uuid primary key default gen_random_uuid(),
  customer_account_id uuid not null references public.customer_accounts(id) on delete cascade,
  commercial_id uuid not null references public.profiles(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint customer_account_secondary_commercials_unique
    unique (customer_account_id, commercial_id)
);

create index customer_account_secondary_commercials_account_idx
  on public.customer_account_secondary_commercials (customer_account_id);
create index customer_account_secondary_commercials_commercial_idx
  on public.customer_account_secondary_commercials (commercial_id);

create table public.business_profile_types (
  code text primary key,
  label text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_profile_types_code_format
    check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint business_profile_types_label_trim
    check (label = btrim(label) and char_length(label) > 0),
  constraint business_profile_types_description_trim
    check (description is null or (description = btrim(description) and char_length(description) > 0)),
  constraint business_profile_types_sort_order_nonnegative
    check (sort_order >= 0)
);

create unique index business_profile_types_label_unique
  on public.business_profile_types (lower(label));
create index business_profile_types_active_order_idx
  on public.business_profile_types (is_active, sort_order, code);

create table public.organization_business_profiles (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  profile_code text not null references public.business_profile_types(code) on delete restrict,
  is_primary boolean not null default false,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  source_system text not null,
  source_record_id text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_business_profiles_validity_check
    check (valid_to is null or valid_to >= valid_from),
  constraint organization_business_profiles_source_system_trim
    check (source_system = btrim(source_system) and char_length(source_system) > 0),
  constraint organization_business_profiles_source_record_id_trim
    check (source_record_id = btrim(source_record_id) and char_length(source_record_id) > 0)
);

create unique index organization_business_profiles_one_active_type_idx
  on public.organization_business_profiles (entity_id, profile_code)
  where valid_to is null;
create unique index organization_business_profiles_one_primary_idx
  on public.organization_business_profiles (entity_id)
  where is_primary and valid_to is null;
create index organization_business_profiles_entity_id_idx
  on public.organization_business_profiles (entity_id);
create index organization_business_profiles_profile_code_idx
  on public.organization_business_profiles (profile_code);

comment on table public.tier_roles is
  'Roles temporels envers CIR, distincts de l identite, de la forme juridique, du code NAF et du profil metier.';
comment on table public.customer_accounts is
  'Compte client global CIR. Le numero et le statut sont autoritaires dans ERP AS400; l agence est unique.';
comment on table public.business_profile_types is
  'Referentiel gouverne des profils metier. Aucune valeur libre ne constitue une source de verite.';
comment on table public.organization_business_profiles is
  'Profils metier principal et secondaires d une organisation, distincts de ses roles envers CIR.';

create trigger set_updated_at_tier_role_types
before update on public.tier_role_types
for each row execute function private.set_updated_at();

create trigger set_updated_at_tier_roles
before update on public.tier_roles
for each row execute function private.set_updated_at();

create trigger set_updated_at_customer_accounts
before update on public.customer_accounts
for each row execute function private.set_updated_at();

create trigger set_updated_at_business_profile_types
before update on public.business_profile_types
for each row execute function private.set_updated_at();

create trigger set_updated_at_organization_business_profiles
before update on public.organization_business_profiles
for each row execute function private.set_updated_at();

create function private.validate_customer_account_commercials()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.primary_commercial_id is not null and not exists (
    select 1
    from public.agency_members m
    where m.agency_id = new.agency_id
      and m.user_id = new.primary_commercial_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'TA1_PRIMARY_COMMERCIAL_AGENCY_MISMATCH: le commercial principal doit appartenir a l agence du compte';
  end if;

  if new.primary_commercial_id is not null and exists (
    select 1
    from public.customer_account_secondary_commercials s
    where s.customer_account_id = new.id
      and s.commercial_id = new.primary_commercial_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'TA1_COMMERCIAL_ROLE_CONFLICT: le commercial principal ne peut pas etre secondaire';
  end if;

  if exists (
    select 1
    from public.customer_account_secondary_commercials s
    where s.customer_account_id = new.id
      and not exists (
        select 1
        from public.agency_members m
        where m.agency_id = new.agency_id
          and m.user_id = s.commercial_id
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'TA1_SECONDARY_COMMERCIAL_AGENCY_MISMATCH: un commercial secondaire est hors agence';
  end if;

  return new;
end
$function$;

create trigger validate_customer_account_commercials
before insert or update of agency_id, primary_commercial_id
on public.customer_accounts
for each row execute function private.validate_customer_account_commercials();

create function private.validate_customer_account_secondary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_agency_id uuid;
  v_primary_commercial_id uuid;
begin
  select account.agency_id, account.primary_commercial_id
    into v_agency_id, v_primary_commercial_id
  from public.customer_accounts account
  where account.id = new.customer_account_id;

  if v_agency_id is null then
    raise exception using
      errcode = '23503',
      message = 'TA1_CUSTOMER_ACCOUNT_NOT_FOUND: compte client introuvable';
  end if;

  if new.commercial_id = v_primary_commercial_id then
    raise exception using
      errcode = '23514',
      message = 'TA1_COMMERCIAL_ROLE_CONFLICT: le commercial principal ne peut pas etre secondaire';
  end if;

  if not exists (
    select 1
    from public.agency_members m
    where m.agency_id = v_agency_id
      and m.user_id = new.commercial_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'TA1_SECONDARY_COMMERCIAL_AGENCY_MISMATCH: le commercial secondaire doit appartenir a l agence du compte';
  end if;

  return new;
end
$function$;

create trigger validate_customer_account_secondary
before insert or update of customer_account_id, commercial_id
on public.customer_account_secondary_commercials
for each row execute function private.validate_customer_account_secondary();

create function private.assert_business_profile_primary(p_entity_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_active_count integer;
  v_primary_count integer;
begin
  select count(*), count(*) filter (where is_primary)
    into v_active_count, v_primary_count
  from public.organization_business_profiles
  where entity_id = p_entity_id
    and valid_to is null;

  if v_active_count > 0 and v_primary_count <> 1 then
    raise exception using
      errcode = '23514',
      message = 'TA1_BUSINESS_PROFILE_PRIMARY_REQUIRED: un profil metier principal actif est requis';
  end if;
end
$function$;

create function private.enforce_business_profile_primary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform private.assert_business_profile_primary(old.entity_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE')
    and (tg_op = 'INSERT' or new.entity_id is distinct from old.entity_id)
  then
    perform private.assert_business_profile_primary(new.entity_id);
  elsif tg_op = 'UPDATE' then
    perform private.assert_business_profile_primary(new.entity_id);
  end if;

  return null;
end
$function$;

create constraint trigger enforce_business_profile_primary
after insert or update or delete on public.organization_business_profiles
deferrable initially deferred
for each row execute function private.enforce_business_profile_primary();

create function private.compatibility_tier_role_code(p_entity_type text)
returns text
language sql
immutable
set search_path = ''
as $function$
  select case lower(p_entity_type)
    when 'client' then 'client'
    when 'prospect' then 'prospect'
    when 'fournisseur' then 'supplier'
    when 'fabricant' then 'manufacturer'
    else null
  end;
$function$;

create function private.sync_tier_foundation_from_entity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_role_code text := private.compatibility_tier_role_code(new.entity_type);
  v_now timestamptz := clock_timestamp();
begin
  if v_role_code is null then
    raise exception using
      errcode = '23514',
      message = 'TA1_UNMAPPED_ENTITY_TYPE: type de tiers sans role canonique';
  end if;

  update public.tier_roles
  set valid_to = coalesce(new.archived_at, v_now)
  where entity_id = new.id
    and valid_to is null
    and (role_code <> v_role_code or new.archived_at is not null);

  if new.archived_at is null then
    insert into public.tier_roles (
      entity_id, role_code, valid_from, source_system, source_record_id, created_by
    )
    select
      new.id, v_role_code, coalesce(new.created_at, v_now),
      'entities_compatibility', new.id::text, new.created_by
    where not exists (
      select 1
      from public.tier_roles role
      where role.entity_id = new.id
        and role.role_code = v_role_code
        and role.valid_to is null
    );
  end if;

  if v_role_code = 'client' then
    if new.client_number is null or new.account_type is null or new.agency_id is null then
      raise exception using
        errcode = '23514',
        message = 'TA1_CLIENT_ACCOUNT_REQUIRED_FIELDS: numero, type de compte et agence sont requis';
    end if;

    insert into public.customer_accounts (
      entity_id,
      client_number,
      account_type,
      agency_id,
      primary_commercial_id,
      number_authority,
      status_authority,
      source_system,
      source_record_id,
      archived_at,
      created_by,
      created_at,
      updated_at
    ) values (
      new.id,
      new.client_number,
      new.account_type,
      new.agency_id,
      new.cir_commercial_id,
      'erp_as400',
      'erp_as400',
      'entities_compatibility',
      new.id::text,
      new.archived_at,
      new.created_by,
      new.created_at,
      new.updated_at
    )
    on conflict (entity_id) do update
    set client_number = excluded.client_number,
        account_type = excluded.account_type,
        agency_id = excluded.agency_id,
        primary_commercial_id = excluded.primary_commercial_id,
        source_system = 'entities_compatibility',
        source_record_id = excluded.source_record_id,
        archived_at = excluded.archived_at,
        updated_at = excluded.updated_at;
  elsif tg_op = 'UPDATE' and lower(old.entity_type) = 'client' then
    update public.customer_accounts
    set archived_at = coalesce(new.archived_at, v_now)
    where entity_id = new.id
      and archived_at is null;
  end if;

  return new;
end
$function$;

insert into public.tier_roles (
  entity_id,
  role_code,
  valid_from,
  valid_to,
  source_system,
  source_record_id,
  created_by,
  created_at,
  updated_at
)
select
  e.id,
  private.compatibility_tier_role_code(e.entity_type),
  e.created_at,
  e.archived_at,
  'entities_compatibility',
  e.id::text,
  e.created_by,
  e.created_at,
  e.updated_at
from public.entities e;

insert into public.customer_accounts (
  entity_id,
  client_number,
  account_type,
  agency_id,
  primary_commercial_id,
  number_authority,
  status_authority,
  source_system,
  source_record_id,
  archived_at,
  created_by,
  created_at,
  updated_at
)
select
  e.id,
  e.client_number,
  e.account_type,
  e.agency_id,
  e.cir_commercial_id,
  'erp_as400',
  'erp_as400',
  'entities_compatibility',
  e.id::text,
  e.archived_at,
  e.created_by,
  e.created_at,
  e.updated_at
from public.entities e
where lower(e.entity_type) = 'client';

create trigger sync_tier_foundation_from_entity
after insert or update of entity_type, client_number, account_type, agency_id,
  cir_commercial_id, archived_at
on public.entities
for each row execute function private.sync_tier_foundation_from_entity();

create or replace function private.hard_delete_agency(p_agency_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if exists (
    select 1
    from public.customer_accounts account
    where account.agency_id = p_agency_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'TA1_AGENCY_HAS_CUSTOMER_ACCOUNTS: reaffecter les comptes clients avant de supprimer l agence';
  end if;

  update public.profiles
  set active_agency_id = null
  where active_agency_id = p_agency_id;

  update public.entities
  set agency_id = null
  where agency_id = p_agency_id;

  delete from public.agency_members where agency_id = p_agency_id;
  delete from public.agency_statuses where agency_id = p_agency_id;
  delete from public.agency_services where agency_id = p_agency_id;
  delete from public.agency_entities where agency_id = p_agency_id;
  delete from public.agency_families where agency_id = p_agency_id;
  delete from public.agency_interaction_types where agency_id = p_agency_id;
  delete from public.agencies where id = p_agency_id;
end
$function$;

create function private.log_tier_foundation_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_actor_id uuid := private.audit_actor_id();
  v_is_super_admin boolean := coalesce(private.is_super_admin(), false);
  v_agency_id uuid;
  v_entity_ref uuid;
  v_audit_entity_id text;
  v_metadata jsonb;
begin
  if tg_table_name = 'customer_accounts' then
    v_entity_ref := (v_row ->> 'entity_id')::uuid;
    v_agency_id := (v_row ->> 'agency_id')::uuid;
  elsif tg_table_name = 'customer_account_secondary_commercials' then
    select account.entity_id, account.agency_id
      into v_entity_ref, v_agency_id
    from public.customer_accounts account
    where account.id = (v_row ->> 'customer_account_id')::uuid;
  elsif tg_table_name in ('tier_roles', 'organization_business_profiles') then
    v_entity_ref := (v_row ->> 'entity_id')::uuid;
    select e.agency_id into v_agency_id
    from public.entities e
    where e.id = v_entity_ref;
  end if;

  v_audit_entity_id := coalesce(v_entity_ref::text, v_row ->> 'id', v_row ->> 'code');
  v_metadata := jsonb_strip_nulls(jsonb_build_object(
    'source', 'tier_foundation',
    'agency_id', v_agency_id,
    'entity_id', v_entity_ref,
    'record_id', coalesce(v_row ->> 'id', v_row ->> 'code'),
    'role_code', v_row ->> 'role_code',
    'profile_code', v_row ->> 'profile_code',
    'commercial_id', v_row ->> 'commercial_id',
    'source_system', v_row ->> 'source_system'
  ));

  insert into public.audit_logs (
    agency_id, actor_id, actor_is_super_admin, action, entity_table, entity_id, metadata
  ) values (
    v_agency_id,
    v_actor_id,
    v_is_super_admin,
    lower(tg_op),
    tg_table_name,
    v_audit_entity_id,
    v_metadata
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$function$;

create trigger audit_tier_role_types
after insert or update or delete on public.tier_role_types
for each row execute function private.log_tier_foundation_event();
create trigger audit_tier_roles
after insert or update or delete on public.tier_roles
for each row execute function private.log_tier_foundation_event();
create trigger audit_customer_accounts
after insert or update or delete on public.customer_accounts
for each row execute function private.log_tier_foundation_event();
create trigger audit_customer_account_secondary_commercials
after insert or update or delete on public.customer_account_secondary_commercials
for each row execute function private.log_tier_foundation_event();
create trigger audit_business_profile_types
after insert or update or delete on public.business_profile_types
for each row execute function private.log_tier_foundation_event();
create trigger audit_organization_business_profiles
after insert or update or delete on public.organization_business_profiles
for each row execute function private.log_tier_foundation_event();

alter table public.tier_role_types enable row level security;
alter table public.tier_role_types force row level security;
alter table public.tier_roles enable row level security;
alter table public.tier_roles force row level security;
alter table public.customer_accounts enable row level security;
alter table public.customer_accounts force row level security;
alter table public.customer_account_secondary_commercials enable row level security;
alter table public.customer_account_secondary_commercials force row level security;
alter table public.business_profile_types enable row level security;
alter table public.business_profile_types force row level security;
alter table public.organization_business_profiles enable row level security;
alter table public.organization_business_profiles force row level security;

create policy tier_role_types_select on public.tier_role_types
for select to authenticated using (true);
create policy tier_role_types_insert on public.tier_role_types
for insert to authenticated with check ((select private.is_super_admin()));
create policy tier_role_types_update on public.tier_role_types
for update to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));
create policy tier_role_types_delete on public.tier_role_types
for delete to authenticated using ((select private.is_super_admin()));

create policy tier_roles_select on public.tier_roles
for select to authenticated using (
  exists (
    select 1 from public.entities e
    where e.id = tier_roles.entity_id
      and ((select private.is_super_admin()) or private.is_member(e.agency_id))
  )
);
create policy tier_roles_insert on public.tier_roles
for insert to authenticated with check ((select private.is_super_admin()));
create policy tier_roles_update on public.tier_roles
for update to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));
create policy tier_roles_delete on public.tier_roles
for delete to authenticated using ((select private.is_super_admin()));

create policy customer_accounts_select on public.customer_accounts
for select to authenticated
using ((select private.is_super_admin()) or private.is_member(agency_id));
create policy customer_accounts_insert on public.customer_accounts
for insert to authenticated with check ((select private.is_super_admin()));
create policy customer_accounts_update on public.customer_accounts
for update to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));
create policy customer_accounts_delete on public.customer_accounts
for delete to authenticated using ((select private.is_super_admin()));

create policy customer_account_secondary_commercials_select
on public.customer_account_secondary_commercials
for select to authenticated using (
  exists (
    select 1 from public.customer_accounts account
    where account.id = customer_account_secondary_commercials.customer_account_id
      and ((select private.is_super_admin()) or private.is_member(account.agency_id))
  )
);
create policy customer_account_secondary_commercials_insert
on public.customer_account_secondary_commercials
for insert to authenticated with check ((select private.is_super_admin()));
create policy customer_account_secondary_commercials_update
on public.customer_account_secondary_commercials
for update to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));
create policy customer_account_secondary_commercials_delete
on public.customer_account_secondary_commercials
for delete to authenticated using ((select private.is_super_admin()));

create policy business_profile_types_select on public.business_profile_types
for select to authenticated using (true);
create policy business_profile_types_insert on public.business_profile_types
for insert to authenticated with check ((select private.is_super_admin()));
create policy business_profile_types_update on public.business_profile_types
for update to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));
create policy business_profile_types_delete on public.business_profile_types
for delete to authenticated using ((select private.is_super_admin()));

create policy organization_business_profiles_select
on public.organization_business_profiles
for select to authenticated using (
  exists (
    select 1 from public.entities e
    where e.id = organization_business_profiles.entity_id
      and ((select private.is_super_admin()) or private.is_member(e.agency_id))
  )
);
create policy organization_business_profiles_insert
on public.organization_business_profiles
for insert to authenticated with check ((select private.is_super_admin()));
create policy organization_business_profiles_update
on public.organization_business_profiles
for update to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));
create policy organization_business_profiles_delete
on public.organization_business_profiles
for delete to authenticated using ((select private.is_super_admin()));

revoke all on table
  public.tier_role_types,
  public.tier_roles,
  public.customer_accounts,
  public.customer_account_secondary_commercials,
  public.business_profile_types,
  public.organization_business_profiles
from anon;

grant select, insert, update, delete on table
  public.tier_role_types,
  public.tier_roles,
  public.customer_accounts,
  public.customer_account_secondary_commercials,
  public.business_profile_types,
  public.organization_business_profiles
to authenticated, service_role;

revoke all on function private.validate_customer_account_commercials() from public, anon, authenticated;
revoke all on function private.validate_customer_account_secondary() from public, anon, authenticated;
revoke all on function private.assert_business_profile_primary(uuid) from public, anon, authenticated;
revoke all on function private.enforce_business_profile_primary() from public, anon, authenticated;
revoke all on function private.compatibility_tier_role_code(text) from public, anon, authenticated;
revoke all on function private.sync_tier_foundation_from_entity() from public, anon, authenticated;
revoke all on function private.log_tier_foundation_event() from public, anon, authenticated;

do $postcondition$
begin
  if (select count(*) from public.tier_roles) <> 6
    or (select count(*) from public.tier_roles where valid_to is null) <> 5
    or exists (
      select 1
      from public.entities e
      left join public.tier_roles role
        on role.entity_id = e.id
       and role.role_code = private.compatibility_tier_role_code(e.entity_type)
      where role.id is null
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'TA1_ROLE_POSTCONDITION_FAILED: conversion des roles incomplete';
  end if;

  if (select count(*) from public.customer_accounts) <> 4
    or exists (
      select 1
      from public.entities e
      full join public.customer_accounts account on account.entity_id = e.id
      where lower(coalesce(e.entity_type, '')) = 'client'
        and (
          account.id is null
          or account.client_number is distinct from e.client_number
          or account.agency_id is distinct from e.agency_id
          or account.primary_commercial_id is distinct from e.cir_commercial_id
        )
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'TA1_ACCOUNT_POSTCONDITION_FAILED: conversion des comptes clients incomplete';
  end if;

  if (select count(*) from public.customer_accounts where primary_commercial_id is null) <> 4
    or (select count(*) from public.business_profile_types) <> 0
    or (select count(*) from public.organization_business_profiles) <> 0
  then
    raise exception using
      errcode = 'P0001',
      message = 'TA1_NO_INFERENCE_POSTCONDITION_FAILED: donnees non sourcees detectees';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'configurator.saved_configuration'::regclass
      and contype = 'f'
      and confrelid = 'public.entities'::regclass
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'TA1_CONFIGURATOR_COMPATIBILITY_FAILED: reference Configurateurs vers entities absente';
  end if;
end
$postcondition$;


