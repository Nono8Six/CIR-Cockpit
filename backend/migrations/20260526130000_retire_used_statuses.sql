alter table public.agency_statuses
  add column if not exists is_active boolean not null default true,
  add column if not exists deactivated_at timestamptz;

create index if not exists idx_agency_statuses_agency_active_sort
  on public.agency_statuses (agency_id, is_active, sort_order);

create or replace function public.sync_interaction_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status_id uuid;
  v_label text;
  v_agency_id uuid;
  v_is_terminal boolean;
  v_is_active boolean;
  v_entity_agency_id uuid;
  v_status_changed boolean := false;
begin
  if TG_OP = 'INSERT' then
    v_status_changed := true;
  elsif TG_OP = 'UPDATE' then
    v_status_changed :=
      NEW.status_id is distinct from OLD.status_id
      or NEW.status is distinct from OLD.status;
  end if;

  if NEW.entity_id is not null and NEW.agency_id is null then
    select e.agency_id
      into v_entity_agency_id
    from public.entities e
    where e.id = NEW.entity_id;
  end if;

  if NEW.status_id is not null then
    select s.label, s.agency_id, s.is_terminal, s.is_active
      into v_label, v_agency_id, v_is_terminal, v_is_active
    from public.agency_statuses s
    where s.id = NEW.status_id;

    if v_label is null then
      raise exception 'Invalid status_id %', NEW.status_id;
    end if;

    if v_status_changed and not v_is_active then
      raise exception 'Inactive status_id %', NEW.status_id;
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
    if NEW.agency_id is null then
      NEW.agency_id := v_entity_agency_id;
    end if;

    if NEW.agency_id is null then
      return NEW;
    end if;

    select s.id, s.label, s.is_terminal
      into v_status_id, v_label, v_is_terminal
    from public.agency_statuses s
    where s.agency_id = NEW.agency_id
      and s.label = NEW.status
      and s.is_active = true;

    if v_status_id is null then
      return NEW;
    end if;

    NEW.status_id := v_status_id;
    NEW.status := v_label;
    NEW.status_is_terminal := v_is_terminal;
    return NEW;
  end if;

  return NEW;
end;
$$;
