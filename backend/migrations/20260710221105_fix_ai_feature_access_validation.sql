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
  if p_feature is null or length(pg_catalog.btrim(p_feature)) = 0 or p_user_id is null then
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
