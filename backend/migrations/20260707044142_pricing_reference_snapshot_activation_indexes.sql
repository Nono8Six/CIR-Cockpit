create index if not exists pricing_ref_snapshots_activated_by_idx
  on public.pricing_reference_snapshots (activated_by)
  where activated_by is not null;
