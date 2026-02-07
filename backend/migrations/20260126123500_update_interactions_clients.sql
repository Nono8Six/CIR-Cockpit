-- Add client/contact linkage to interactions

alter table public.interactions
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists contact_id uuid references public.client_contacts(id) on delete set null;

alter table public.interactions
  drop constraint if exists interactions_agency_id_fkey;

alter table public.interactions
  alter column agency_id drop not null;

alter table public.interactions
  add constraint interactions_agency_id_fkey
  foreign key (agency_id) references public.agencies(id) on delete set null;

alter table public.interactions
  alter column status_id drop not null;

create index if not exists idx_interactions_client_id
  on public.interactions (client_id);

drop index if exists public.idx_interactions_created_by;
create index idx_interactions_created_by
  on public.interactions (created_by, created_at desc);

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
  v_client_agency_id uuid;
begin
  if NEW.client_id is not null and NEW.agency_id is null then
    select c.agency_id
      into v_client_agency_id
    from public.clients c
    where c.id = NEW.client_id;
  end if;

  if NEW.status_id is not null then
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
    if NEW.agency_id is null then
      NEW.agency_id := v_client_agency_id;
    end if;

    if NEW.agency_id is null then
      return NEW;
    end if;

    select s.id, s.label, s.is_terminal
      into v_status_id, v_label, v_is_terminal
    from public.agency_statuses s
    where s.agency_id = NEW.agency_id
      and s.label = NEW.status;

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
