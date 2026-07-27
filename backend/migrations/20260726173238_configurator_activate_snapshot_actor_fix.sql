-- Configurateurs C1 - correctif d'acteur sur l'activation de snapshot.
--
-- `configurator.activate_snapshot` est en SECURITY INVOKER et appelait
-- `private.audit_actor_id()`, dont l'EXECUTE n'est accorde qu'a `postgres`.
-- Tout appelant `authenticated`, super_admin compris, obtenait donc
-- "permission denied for function audit_actor_id" au lieu du controle metier :
-- l'activation et le rollback d'un snapshot etaient inoperants.
--
-- La migration `configurator_rls_actor_helper` avait introduit
-- `private.configurator_actor_id()` pour ce motif et corrige les politiques de
-- `saved_configuration`, mais pas cette fonction.
--
-- Seul l'appel change. Corps, controles, verrous et messages sont inchanges.
-- CREATE OR REPLACE conserve les privileges existants.

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
  v_actor_id uuid := private.configurator_actor_id();
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
