-- Add terminal flag to interactions for fast "active" filtering.

ALTER TABLE public.interactions
  ADD COLUMN IF NOT EXISTS status_is_terminal boolean DEFAULT false;

UPDATE public.interactions i
SET status_is_terminal = s.is_terminal
FROM public.agency_statuses s
WHERE i.status_id = s.id;

ALTER TABLE public.interactions
  ALTER COLUMN status_is_terminal SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interactions_active
  ON public.interactions (agency_id, last_action_at DESC)
  WHERE status_is_terminal = false;

CREATE OR REPLACE FUNCTION public.sync_interaction_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_status_id uuid;
  v_label text;
  v_agency_id uuid;
  v_is_terminal boolean;
begin
  if TG_OP = 'UPDATE'
    and NEW.status is not null
    and (OLD.status is distinct from NEW.status) then
    -- Status label changed explicitly: resolve to matching status_id
    select s.id, s.label, s.agency_id, s.is_terminal
      into v_status_id, v_label, v_agency_id, v_is_terminal
    from public.agency_statuses s
    where s.agency_id = NEW.agency_id
      and s.label = NEW.status;

    if v_status_id is null then
      raise exception 'Invalid status % for agency %', NEW.status, NEW.agency_id;
    end if;

    NEW.status_id := v_status_id;
    NEW.status := v_label;
    NEW.status_is_terminal := v_is_terminal;
    return NEW;
  end if;

  if NEW.status_id is not null then
    -- Prefer status_id for canonical source of truth
    select s.label, s.agency_id, s.is_terminal
      into v_label, v_agency_id, v_is_terminal
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
    NEW.status_is_terminal := v_is_terminal;
    return NEW;
  end if;

  if NEW.status is not null then
    -- Fallback for inserts (or legacy clients)
    select s.id, s.label, s.agency_id, s.is_terminal
      into v_status_id, v_label, v_agency_id, v_is_terminal
    from public.agency_statuses s
    where s.agency_id = NEW.agency_id
      and s.label = NEW.status;

    if v_status_id is null then
      raise exception 'Invalid status % for agency %', NEW.status, NEW.agency_id;
    end if;

    NEW.status_id := v_status_id;
    NEW.status := v_label;
    NEW.status_is_terminal := v_is_terminal;
    return NEW;
  end if;

  raise exception 'status or status_id must be provided';
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_status_label_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if NEW.label is distinct from OLD.label
     or NEW.is_terminal is distinct from OLD.is_terminal then
    update public.interactions
    set status = NEW.label,
        status_is_terminal = NEW.is_terminal
    where status_id = NEW.id;
  end if;
  return NEW;
end;
$function$;
