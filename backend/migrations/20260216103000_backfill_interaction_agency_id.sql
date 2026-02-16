-- Backfill interaction agency_id from linked entities before strict RLS rollout.

update public.interactions i
set agency_id = e.agency_id
from public.entities e
where i.entity_id = e.id
  and i.agency_id is null
  and e.agency_id is not null;
