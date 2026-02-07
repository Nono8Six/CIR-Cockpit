-- Fix sync_interaction_status to allow status changes by label while keeping status_id authoritative.

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
  if TG_OP = 'UPDATE'
    and NEW.status is not null
    and (OLD.status is distinct from NEW.status) then
    -- Status label changed explicitly: resolve to matching status_id
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
    return NEW;
  end if;

  if NEW.status_id is not null then
    -- Prefer status_id for canonical source of truth
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
    return NEW;
  end if;

  if NEW.status is not null then
    -- Fallback for inserts (or legacy clients)
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
    return NEW;
  end if;

  raise exception 'status or status_id must be provided';
end;
$function$;
