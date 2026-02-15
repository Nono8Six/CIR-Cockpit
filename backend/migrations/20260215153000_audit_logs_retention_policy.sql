-- Add retention policy for audit_logs: archive rows older than 1 year.

create extension if not exists pg_cron;

create table if not exists public.audit_logs_archive (
  id uuid primary key,
  agency_id uuid references public.agencies(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_is_super_admin boolean not null default false,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_table text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);

create index if not exists idx_audit_logs_archive_agency_id
  on public.audit_logs_archive (agency_id);

create index if not exists idx_audit_logs_archive_actor_id
  on public.audit_logs_archive (actor_id);

create index if not exists idx_audit_logs_archive_created_at
  on public.audit_logs_archive (created_at desc);

alter table public.audit_logs_archive enable row level security;

drop policy if exists audit_logs_archive_select on public.audit_logs_archive;
create policy audit_logs_archive_select
on public.audit_logs_archive
for select to authenticated
using (
  public.is_super_admin()
  or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
);

create or replace function public.archive_audit_logs_older_than(
  p_before timestamptz default (timezone('utc', now()) - interval '1 year'),
  p_batch_size integer default 5000
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch_size integer := greatest(1, least(coalesce(p_batch_size, 5000), 50000));
  v_archived integer := 0;
begin
  with candidates as (
    select
      l.id,
      l.agency_id,
      l.actor_id,
      l.actor_is_super_admin,
      l.action,
      l.entity_table,
      l.entity_id,
      l.metadata,
      l.created_at
    from public.audit_logs l
    where l.created_at < p_before
    order by l.created_at asc
    limit v_batch_size
  ),
  moved as (
    insert into public.audit_logs_archive (
      id,
      agency_id,
      actor_id,
      actor_is_super_admin,
      action,
      entity_table,
      entity_id,
      metadata,
      created_at
    )
    select
      c.id,
      c.agency_id,
      c.actor_id,
      c.actor_is_super_admin,
      c.action,
      c.entity_table,
      c.entity_id,
      c.metadata,
      c.created_at
    from candidates c
    on conflict (id) do nothing
    returning id
  ),
  deleted as (
    delete from public.audit_logs l
    using moved m
    where l.id = m.id
    returning l.id
  )
  select count(*)::integer into v_archived from deleted;

  return v_archived;
end;
$$;

create or replace function public.run_audit_logs_retention(
  p_before timestamptz default (timezone('utc', now()) - interval '1 year'),
  p_batch_size integer default 5000,
  p_max_batches integer default 20
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer := 0;
  v_batch integer := 0;
  v_limit integer := greatest(1, least(coalesce(p_max_batches, 20), 500));
  v_once integer := 0;
begin
  for v_batch in 1..v_limit loop
    v_once := public.archive_audit_logs_older_than(p_before, p_batch_size);
    v_total := v_total + v_once;
    exit when v_once = 0;
  end loop;

  return v_total;
end;
$$;

revoke all on function public.archive_audit_logs_older_than(timestamptz, integer)
from public, anon, authenticated;
grant execute on function public.archive_audit_logs_older_than(timestamptz, integer)
to service_role;

revoke all on function public.run_audit_logs_retention(timestamptz, integer, integer)
from public, anon, authenticated;
grant execute on function public.run_audit_logs_retention(timestamptz, integer, integer)
to service_role;

do $$
declare
  v_job_id bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for v_job_id in
      select jobid
      from cron.job
      where jobname = 'audit_logs_retention_daily'
    loop
      perform cron.unschedule(v_job_id);
    end loop;

    perform cron.schedule(
      'audit_logs_retention_daily',
      '20 3 * * *',
      $job$select public.run_audit_logs_retention();$job$
    );
  end if;
end;
$$;
