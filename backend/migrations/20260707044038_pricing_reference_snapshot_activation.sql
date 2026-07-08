alter table public.pricing_reference_snapshots
  add column if not exists activated_by uuid references public.profiles(id),
  add column if not exists deactivated_at timestamptz;

alter table public.pricing_reference_snapshots
  drop constraint if exists pricing_reference_snapshots_active_status_check;

alter table public.pricing_reference_snapshots
  add constraint pricing_reference_snapshots_active_status_check check (
    (
      is_active = true
      and status = 'actif'
      and activated_at is not null
      and deactivated_at is null
    )
    or (
      is_active = false
      and status in ('cree', 'pret_activation', 'archive')
    )
  );

with latest_analyzed_snapshot as (
  select s.id
  from public.pricing_reference_snapshots s
  join public.pricing_reference_imports i on i.id = s.import_id
  where i.status = 'analyse_ok'
  order by i.analysis_completed_at desc nulls last, s.created_at desc
  limit 1
)
update public.pricing_reference_snapshots s
set
  is_active = true,
  status = 'actif',
  activated_at = coalesce(s.activated_at, now()),
  deactivated_at = null
from latest_analyzed_snapshot latest
where s.id = latest.id
  and not exists (
    select 1
    from public.pricing_reference_snapshots active_snapshot
    where active_snapshot.is_active = true
  );
