-- Phase 4 Assistant IA: acces ferme par defaut, avec overrides global/agence/utilisateur.
create table public.ai_feature_grants (
  id uuid primary key default gen_random_uuid(),
  feature text not null check (length(trim(feature)) > 0),
  scope text not null check (scope in ('global', 'agency', 'user')),
  agency_id uuid references public.agencies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  allowed boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_feature_grants_scope_target_check check (
    (scope = 'global' and agency_id is null and user_id is null)
    or (scope = 'agency' and agency_id is not null and user_id is null)
    or (scope = 'user' and agency_id is null and user_id is not null)
  )
);

create index ai_feature_grants_feature_scope_idx
  on public.ai_feature_grants(feature, scope);
create index ai_feature_grants_agency_id_idx
  on public.ai_feature_grants(agency_id) where agency_id is not null;
create index ai_feature_grants_user_id_idx
  on public.ai_feature_grants(user_id) where user_id is not null;
create index ai_feature_grants_created_by_idx
  on public.ai_feature_grants(created_by) where created_by is not null;
create index ai_feature_grants_updated_by_idx
  on public.ai_feature_grants(updated_by) where updated_by is not null;
create unique index ai_feature_grants_global_unique
  on public.ai_feature_grants(feature) where scope = 'global';
create unique index ai_feature_grants_agency_unique
  on public.ai_feature_grants(feature, agency_id) where scope = 'agency';
create unique index ai_feature_grants_user_unique
  on public.ai_feature_grants(feature, user_id) where scope = 'user';

drop trigger if exists set_updated_at_ai_feature_grants on public.ai_feature_grants;
create trigger set_updated_at_ai_feature_grants
before update on public.ai_feature_grants
for each row execute function private.set_updated_at();

alter table public.ai_feature_grants enable row level security;
alter table public.ai_feature_grants force row level security;

create policy ai_feature_grants_select_super_admin on public.ai_feature_grants
for select to authenticated using ((select private.is_super_admin()));
create policy ai_feature_grants_insert_super_admin on public.ai_feature_grants
for insert to authenticated with check ((select private.is_super_admin()));
create policy ai_feature_grants_update_super_admin on public.ai_feature_grants
for update to authenticated using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));
create policy ai_feature_grants_delete_super_admin on public.ai_feature_grants
for delete to authenticated using ((select private.is_super_admin()));

revoke all on table public.ai_feature_grants from public, anon, authenticated;
grant select, insert, update, delete on table public.ai_feature_grants to service_role;

create or replace function private.resolve_ai_feature_access(
  p_feature text,
  p_user_id uuid,
  p_active_agency_id uuid
)
returns table (allowed boolean, reason text, origin text)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  selected_grant public.ai_feature_grants%rowtype;
begin
  if p_feature is null or length(pg_catalog.trim(p_feature)) = 0 or p_user_id is null then
    raise exception using errcode = '22023', message = 'Parametres d acces IA invalides.';
  end if;
  if current_user <> 'service_role' and (select auth.uid()) is distinct from p_user_id then
    raise exception using errcode = '42501', message = 'Identite d acces IA invalide.';
  end if;
  if (select private.is_super_admin()) then
    return query select true, null::text, 'superadmin'::text;
    return;
  end if;

  select g.* into selected_grant from public.ai_feature_grants g
  where g.feature = p_feature and g.scope = 'user' and g.user_id = p_user_id;
  if found then
    return query select selected_grant.allowed,
      case when selected_grant.allowed then null::text else 'Acces non autorise'::text end,
      'user'::text;
    return;
  end if;

  if p_active_agency_id is not null and (select private.is_member(p_active_agency_id)) then
    select g.* into selected_grant from public.ai_feature_grants g
    where g.feature = p_feature and g.scope = 'agency' and g.agency_id = p_active_agency_id;
    if found then
      return query select selected_grant.allowed,
        case when selected_grant.allowed then null::text else 'Acces non autorise'::text end,
        'agency'::text;
      return;
    end if;
  end if;

  select g.* into selected_grant from public.ai_feature_grants g
  where g.feature = p_feature and g.scope = 'global';
  if found then
    return query select selected_grant.allowed,
      case when selected_grant.allowed then null::text else 'Acces non autorise'::text end,
      'global'::text;
    return;
  end if;

  return query select false, 'Acces non autorise'::text, 'default'::text;
end;
$$;

revoke all on function private.resolve_ai_feature_access(text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.resolve_ai_feature_access(text, uuid, uuid)
  to authenticated, service_role;

insert into public.ai_feature_grants(feature, scope, allowed)
values ('assistant.referentiels', 'global', false)
on conflict (feature) where scope = 'global' do nothing;
