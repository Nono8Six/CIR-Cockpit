-- Phase 3.2 - Reconcile pg_trgm placement and restore missing FK-covering indexes.

create schema if not exists extensions;

do $$
declare
  extension_schema text;
begin
  select n.nspname
    into extension_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_trgm';

  if extension_schema = 'public' then
    execute 'alter extension pg_trgm set schema extensions';
  end if;
end
$$;

create index if not exists idx_audit_logs_archive_actor_id
  on public.audit_logs_archive using btree (actor_id);

create index if not exists idx_audit_logs_archive_agency_id
  on public.audit_logs_archive using btree (agency_id);

create index if not exists interaction_drafts_agency_id_idx
  on public.interaction_drafts using btree (agency_id);

create index if not exists idx_interactions_contact_id
  on public.interactions using btree (contact_id);

create index if not exists idx_interactions_created_by
  on public.interactions using btree (created_by, created_at desc);

create index if not exists idx_interactions_status_id_only
  on public.interactions using btree (status_id);

create index if not exists idx_interactions_updated_by
  on public.interactions using btree (updated_by);

create index if not exists idx_profiles_active_agency_id
  on public.profiles using btree (active_agency_id);
