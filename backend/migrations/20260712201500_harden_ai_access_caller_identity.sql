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
  profile_role public.user_role;
  profile_archived_at timestamptz;
  profile_is_system boolean;
  caller_uid uuid := (select auth.uid());
  caller_role text := (select auth.role());
begin
  if p_feature is null or pg_catalog.length(pg_catalog.btrim(p_feature)) = 0
     or p_user_id is null then
    raise exception using errcode = '22023', message = 'Parametres d acces IA invalides.';
  end if;

  if caller_uid is not null and caller_uid is distinct from p_user_id then
    raise exception using errcode = '42501', message = 'Identite d acces IA invalide.';
  end if;
  if caller_uid is null and coalesce(caller_role, '') <> 'service_role'
     and session_user not in ('postgres', 'supabase_admin') then
    raise exception using errcode = '42501', message = 'Identite d acces IA invalide.';
  end if;

  select p.role, p.archived_at, p.is_system
  into profile_role, profile_archived_at, profile_is_system
  from public.profiles p
  where p.id = p_user_id;
  if not found or profile_archived_at is not null or profile_is_system then
    return query select false, 'Acces non autorise'::text, 'default'::text;
    return;
  end if;

  if profile_role = 'super_admin'::public.user_role then
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

  if p_active_agency_id is not null and exists (
    select 1 from public.agency_members m
    where m.user_id = p_user_id and m.agency_id = p_active_agency_id
  ) then
    select g.* into selected_grant from public.ai_feature_grants g
    where g.feature = p_feature and g.scope = 'agency'
      and g.agency_id = p_active_agency_id;
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
