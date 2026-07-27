-- Configurateurs C1 - contexte RLS, ACL minimales, activation et rollback.

create or replace function private.configurator_actor_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select private.audit_actor_id())
      and p.archived_at is null
      and not p.is_system
      and p.role in ('super_admin', 'agency_admin', 'tcs')
  );
$function$;

create or replace function private.configurator_current_agency_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select p.active_agency_id
  from public.profiles p
  where p.id = (select private.audit_actor_id())
    and p.archived_at is null
    and not p.is_system;
$function$;

create or replace function private.configurator_snapshot_is_mutable(
  p_snapshot_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from configurator.catalog_snapshot s
    where s.id = p_snapshot_id
      and s.status = 'candidate'
      and not s.is_active
  );
$function$;

create or replace function private.configurator_prepare_saved_configuration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_id uuid := private.audit_actor_id();
  v_agency_id uuid := private.configurator_current_agency_id();
  v_entity_agency_id uuid;
begin
  if v_actor_id is null or not private.configurator_actor_is_active() then
    raise exception 'CONFIGURATOR_AUTH_REQUIRED: utilisateur CIR actif requis';
  end if;

  if tg_op = 'INSERT' then
    if v_agency_id is null then
      raise exception 'CONFIGURATOR_AGENCY_REQUIRED: agence active requise';
    end if;
    new.owner_id := v_actor_id;
    new.agency_id := v_agency_id;
  else
    if new.owner_id is distinct from old.owner_id
      or new.agency_id is distinct from old.agency_id
      or new.scope is distinct from old.scope
      or new.domain is distinct from old.domain
      or new.schema_version is distinct from old.schema_version
      or new.created_at is distinct from old.created_at
    then
      raise exception
        'CONFIGURATOR_CONFIGURATION_IDENTITY_IMMUTABLE: proprietaire, agence, portee, domaine et version sont immuables';
    end if;
  end if;

  if new.client_entity_id is not null then
    select e.agency_id
      into v_entity_agency_id
    from public.entities e
    where e.id = new.client_entity_id
      and e.archived_at is null;

    if v_entity_agency_id is distinct from new.agency_id then
      raise exception
        'CONFIGURATOR_CLIENT_AGENCY_MISMATCH: le client doit appartenir a l agence de la configuration';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function private.configurator_actor_is_active()
  from public, anon, authenticated, service_role;
revoke all on function private.configurator_current_agency_id()
  from public, anon, authenticated, service_role;
revoke all on function private.configurator_snapshot_is_mutable(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.configurator_prepare_saved_configuration()
  from public, anon, authenticated, service_role;

grant execute on function private.configurator_actor_is_active()
  to authenticated;
grant execute on function private.configurator_current_agency_id()
  to authenticated;
grant execute on function private.configurator_snapshot_is_mutable(uuid)
  to authenticated;

drop trigger if exists prepare_saved_configuration
  on configurator.saved_configuration;
create trigger prepare_saved_configuration
before insert or update on configurator.saved_configuration
for each row execute function private.configurator_prepare_saved_configuration();

create or replace function configurator.activate_snapshot(
  p_snapshot_id uuid,
  p_activation_note text,
  p_diff_sha256 text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor_id uuid := private.audit_actor_id();
  v_domain text;
  v_batch_id uuid;
begin
  if not private.configurator_actor_is_active()
    or not private.is_super_admin()
  then
    raise exception
      'CONFIGURATOR_ACTIVATION_FORBIDDEN: super_admin requis';
  end if;

  if p_activation_note is null
    or char_length(btrim(p_activation_note)) = 0
  then
    raise exception
      'CONFIGURATOR_ACTIVATION_NOTE_REQUIRED: note d activation requise';
  end if;

  if p_diff_sha256 is null or p_diff_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception
      'CONFIGURATOR_ACTIVATION_DIFF_REQUIRED: empreinte SHA-256 du diff requise';
  end if;

  select s.domain
    into v_domain
  from configurator.catalog_snapshot s
  where s.id = p_snapshot_id
    and s.status in ('ready', 'retired')
    and not s.is_active
    and s.activation_gate_status = 'passed'
  for update;

  if v_domain is null then
    raise exception
      'CONFIGURATOR_SNAPSHOT_NOT_READY: snapshot absent ou non activable';
  end if;

  perform 1
  from configurator.catalog_snapshot s
  where s.domain = v_domain
  for update;

  select b.id
    into v_batch_id
  from configurator.import_batch b
  where b.candidate_snapshot_id = p_snapshot_id
    and b.status = 'ready';

  if v_batch_id is null then
    raise exception
      'CONFIGURATOR_IMPORT_NOT_READY: lot analyse requis';
  end if;

  if exists (
    select 1
    from configurator.import_issue i
    where i.batch_id = v_batch_id
      and i.activation_blocking
      and i.resolved_at is null
  ) then
    raise exception
      'CONFIGURATOR_ACTIVATION_BLOCKED: anomalie bloquante non resolue';
  end if;

  update configurator.catalog_snapshot
  set
    is_active = false,
    status = 'retired',
    deactivated_at = now()
  where domain = v_domain
    and is_active;

  update configurator.catalog_snapshot
  set
    is_active = true,
    status = 'active',
    activated_by = v_actor_id,
    activated_at = now(),
    deactivated_at = null,
    activation_note = btrim(p_activation_note),
    activation_diff_sha256 = p_diff_sha256
  where id = p_snapshot_id;

  return p_snapshot_id;
end;
$function$;

comment on function configurator.activate_snapshot(uuid, text, text) is
  'Active ou restaure atomiquement un snapshot pret, sans suppression physique.';

revoke all on function configurator.activate_snapshot(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function configurator.activate_snapshot(uuid, text, text)
  to authenticated;

grant usage on schema configurator to authenticated;

grant execute on function configurator.canonical_numeric_token_v1(numeric)
  to authenticated;
grant execute on function configurator.normalize_motor_designation_v1(text)
  to authenticated;
grant execute on function configurator.derive_motor_identity_discriminator_v1(numeric, numeric)
  to authenticated;
grant execute on function configurator.derive_motor_model_key_v1(text, text, text)
  to authenticated;

grant select on table
  configurator.catalog_snapshot,
  configurator.source_document,
  configurator.source_ref,
  configurator.motor_dimension_canonical,
  configurator.motor_model,
  configurator.motor_operating_point,
  configurator.motor_efficiency_point,
  configurator.motor_torque_point,
  configurator.motor_dimension_definition,
  configurator.motor_dimension,
  configurator.motor_flange_option,
  configurator.motor_brake_option,
  configurator.motor_vendor_correlation,
  configurator.motor_iec_threshold,
  configurator.motor_iec_vsd_threshold,
  configurator.motor_validation_issue
to authenticated;

grant select, insert, update on table
  configurator.catalog_snapshot,
  configurator.import_batch,
  configurator.import_file,
  configurator.import_issue
to authenticated;

grant insert on table
  configurator.source_document,
  configurator.source_ref,
  configurator.motor_model,
  configurator.motor_operating_point,
  configurator.motor_efficiency_point,
  configurator.motor_torque_point,
  configurator.motor_dimension_definition,
  configurator.motor_dimension,
  configurator.motor_flange_option,
  configurator.motor_brake_option,
  configurator.motor_vendor_correlation,
  configurator.motor_iec_threshold,
  configurator.motor_iec_vsd_threshold,
  configurator.motor_validation_issue
to authenticated;

grant select on table
  configurator.import_batch,
  configurator.import_file,
  configurator.import_issue,
  configurator.saved_configuration
to authenticated;

grant insert (
  id,
  schema_version,
  domain,
  scope,
  label,
  client_entity_id,
  snapshot_id,
  configuration
) on configurator.saved_configuration
to authenticated;

grant update (
  label,
  client_entity_id,
  snapshot_id,
  configuration,
  archived_at
) on configurator.saved_configuration
to authenticated;

do $block$
declare
  v_table text;
begin
  foreach v_table in array array[
    'catalog_snapshot',
    'source_document',
    'source_ref',
    'import_batch',
    'import_file',
    'import_issue',
    'saved_configuration',
    'motor_dimension_canonical',
    'motor_model',
    'motor_operating_point',
    'motor_efficiency_point',
    'motor_torque_point',
    'motor_dimension_definition',
    'motor_dimension',
    'motor_flange_option',
    'motor_brake_option',
    'motor_vendor_correlation',
    'motor_iec_threshold',
    'motor_iec_vsd_threshold',
    'motor_validation_issue'
  ]
  loop
    execute format(
      'alter table configurator.%I enable row level security',
      v_table
    );
    execute format(
      'alter table configurator.%I force row level security',
      v_table
    );
  end loop;
end
$block$;

do $block$
declare
  v_table text;
begin
  foreach v_table in array array[
    'catalog_snapshot',
    'source_document',
    'source_ref',
    'import_batch',
    'import_file',
    'import_issue',
    'motor_dimension_canonical',
    'motor_model',
    'motor_operating_point',
    'motor_efficiency_point',
    'motor_torque_point',
    'motor_dimension_definition',
    'motor_dimension',
    'motor_flange_option',
    'motor_brake_option',
    'motor_vendor_correlation',
    'motor_iec_threshold',
    'motor_iec_vsd_threshold',
    'motor_validation_issue'
  ]
  loop
    execute format(
      'create policy %I on configurator.%I for select to authenticated using ((select private.configurator_actor_is_active()))',
      v_table || '_select',
      v_table
    );
  end loop;
end
$block$;

do $block$
declare
  v_table text;
begin
  foreach v_table in array array[
    'catalog_snapshot',
    'source_document',
    'source_ref',
    'import_batch',
    'import_file',
    'import_issue'
  ]
  loop
    execute format(
      'create policy %I on configurator.%I for insert to authenticated with check ((select private.configurator_actor_is_active()) and (select private.is_super_admin()))',
      v_table || '_insert',
      v_table
    );
  end loop;
end
$block$;

do $block$
declare
  v_table text;
begin
  foreach v_table in array array[
    'motor_model',
    'motor_operating_point',
    'motor_efficiency_point',
    'motor_torque_point',
    'motor_dimension_definition',
    'motor_dimension',
    'motor_flange_option',
    'motor_brake_option',
    'motor_vendor_correlation',
    'motor_iec_threshold',
    'motor_iec_vsd_threshold',
    'motor_validation_issue'
  ]
  loop
    execute format(
      'create policy %I on configurator.%I for insert to authenticated with check ((select private.configurator_actor_is_active()) and (select private.is_super_admin()) and (select private.configurator_snapshot_is_mutable(snapshot_id)))',
      v_table || '_insert',
      v_table
    );
  end loop;
end
$block$;

create policy catalog_snapshot_update
on configurator.catalog_snapshot
for update to authenticated
using (
  (select private.configurator_actor_is_active())
  and (select private.is_super_admin())
)
with check (
  (select private.configurator_actor_is_active())
  and (select private.is_super_admin())
);

create policy import_batch_update
on configurator.import_batch
for update to authenticated
using (
  (select private.configurator_actor_is_active())
  and (select private.is_super_admin())
)
with check (
  (select private.configurator_actor_is_active())
  and (select private.is_super_admin())
);

create policy import_file_update
on configurator.import_file
for update to authenticated
using (
  (select private.configurator_actor_is_active())
  and (select private.is_super_admin())
)
with check (
  (select private.configurator_actor_is_active())
  and (select private.is_super_admin())
);

create policy import_issue_update
on configurator.import_issue
for update to authenticated
using (
  (select private.configurator_actor_is_active())
  and (select private.is_super_admin())
)
with check (
  (select private.configurator_actor_is_active())
  and (select private.is_super_admin())
);

create policy saved_configuration_select
on configurator.saved_configuration
for select to authenticated
using (
  (select private.configurator_actor_is_active())
  and (
    (select private.is_super_admin())
    or (
      scope = 'personal'
      and owner_id = (select private.audit_actor_id())
    )
    or (
      scope = 'agency'
      and agency_id = (select private.configurator_current_agency_id())
    )
  )
);

create policy saved_configuration_insert
on configurator.saved_configuration
for insert to authenticated
with check (
  (select private.configurator_actor_is_active())
  and owner_id = (select private.audit_actor_id())
  and agency_id = (select private.configurator_current_agency_id())
);

create policy saved_configuration_update
on configurator.saved_configuration
for update to authenticated
using (
  (select private.configurator_actor_is_active())
  and (
    (select private.is_super_admin())
    or owner_id = (select private.audit_actor_id())
    or (
      scope = 'agency'
      and agency_id = (select private.configurator_current_agency_id())
      and (
        select private.has_agency_role(
          agency_id,
          array['agency_admin']::public.user_role[]
        )
      )
    )
  )
)
with check (
  (select private.configurator_actor_is_active())
  and (
    (select private.is_super_admin())
    or owner_id = (select private.audit_actor_id())
    or (
      scope = 'agency'
      and agency_id = (select private.configurator_current_agency_id())
      and (
        select private.has_agency_role(
          agency_id,
          array['agency_admin']::public.user_role[]
        )
      )
    )
  )
);
