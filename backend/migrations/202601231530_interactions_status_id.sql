-- Normalize interaction status using a foreign key to agency_statuses.
-- Keeps backward compatibility: status text is still accepted and mapped to status_id.

ALTER TABLE public.interactions
  ADD COLUMN IF NOT EXISTS status_id uuid;

UPDATE public.interactions i
SET status_id = s.id
FROM public.agency_statuses s
WHERE i.status_id IS NULL
  AND i.status IS NOT NULL
  AND i.agency_id = s.agency_id
  AND i.status = s.label;

DO $$
begin
  if exists (
    select 1
    from public.interactions
    where status_id is null
  ) then
    raise exception 'interactions.status_id backfill failed: % rows without status_id',
      (select count(*) from public.interactions where status_id is null);
  end if;
end $$;

DO $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'interactions_status_id_fkey'
      and conrelid = 'public.interactions'::regclass
  ) then
    alter table public.interactions
      add constraint interactions_status_id_fkey
      foreign key (status_id) references public.agency_statuses(id) on delete restrict;
  end if;
end $$;

ALTER TABLE public.interactions
  ALTER COLUMN status_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interactions_status_id
  ON public.interactions (agency_id, status_id);

CREATE OR REPLACE FUNCTION public.sync_interaction_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_status_id uuid;
  v_label text;
  v_agency_id uuid;
begin
  if NEW.status is not null then
    select s.id, s.label, s.agency_id
      into v_status_id, v_label, v_agency_id
    from public.agency_statuses s
    where s.agency_id = NEW.agency_id
      and s.label = NEW.status;

    if v_status_id is null then
      raise exception 'Invalid status % for agency %', NEW.status, NEW.agency_id;
    end if;

    NEW.status_id := v_status_id;
    NEW.status := v_label;
  elsif NEW.status_id is not null then
    select s.label, s.agency_id
      into v_label, v_agency_id
    from public.agency_statuses s
    where s.id = NEW.status_id;

    if v_label is null then
      raise exception 'Invalid status_id %', NEW.status_id;
    end if;

    if NEW.agency_id is null then
      NEW.agency_id := v_agency_id;
    elsif NEW.agency_id <> v_agency_id then
      raise exception 'status_id does not belong to agency %', NEW.agency_id;
    end if;

    NEW.status := v_label;
  else
    raise exception 'status or status_id must be provided';
  end if;

  return NEW;
end;
$function$;

DO $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'sync_interactions_status'
  ) then
    create trigger sync_interactions_status
      before insert or update on public.interactions
      for each row execute function public.sync_interaction_status();
  end if;
end $$;
