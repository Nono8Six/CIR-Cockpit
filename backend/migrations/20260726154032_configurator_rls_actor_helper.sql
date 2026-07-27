create function private.configurator_actor_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select private.audit_actor_id();
$function$;

revoke all on function private.configurator_actor_id() from public, anon;
grant execute on function private.configurator_actor_id() to authenticated;

alter policy saved_configuration_select
on configurator.saved_configuration
using (
  (select private.configurator_actor_is_active())
  and (
    (select private.is_super_admin())
    or (
      scope = 'personal'
      and owner_id = (select private.configurator_actor_id())
    )
    or (
      scope = 'agency'
      and agency_id = (select private.configurator_current_agency_id())
    )
  )
);

alter policy saved_configuration_insert
on configurator.saved_configuration
with check (
  (select private.configurator_actor_is_active())
  and owner_id = (select private.configurator_actor_id())
  and agency_id = (select private.configurator_current_agency_id())
);

alter policy saved_configuration_update
on configurator.saved_configuration
using (
  (select private.configurator_actor_is_active())
  and (
    (select private.is_super_admin())
    or owner_id = (select private.configurator_actor_id())
    or (
      scope = 'agency'
      and agency_id = (select private.configurator_current_agency_id())
      and (
        select private.has_agency_role(
          saved_configuration.agency_id,
          array['agency_admin'::public.user_role]
        )
      )
    )
  )
)
with check (
  (select private.configurator_actor_is_active())
  and (
    (select private.is_super_admin())
    or owner_id = (select private.configurator_actor_id())
    or (
      scope = 'agency'
      and agency_id = (select private.configurator_current_agency_id())
      and (
        select private.has_agency_role(
          saved_configuration.agency_id,
          array['agency_admin'::public.user_role]
        )
      )
    )
  )
);
