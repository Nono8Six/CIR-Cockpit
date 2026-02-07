-- Make audit_logs.agency_id nullable + update audit log handling for clients/contacts

alter table public.audit_logs
  drop constraint if exists audit_logs_agency_id_fkey;

alter table public.audit_logs
  alter column agency_id drop not null;

alter table public.audit_logs
  add constraint audit_logs_agency_id_fkey
  foreign key (agency_id) references public.agencies(id) on delete set null;

create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text := lower(TG_OP);
  v_actor_id uuid := public.audit_actor_id();
  v_is_super_admin boolean := coalesce(public.is_super_admin(), false);
  v_agency_id uuid;
  v_entity_id text;
  v_metadata jsonb;
  v_client_id uuid;
begin
  if TG_TABLE_NAME = 'agencies' then
    v_agency_id := coalesce(NEW.id, OLD.id);
    v_entity_id := v_agency_id::text;
  else
    v_entity_id := coalesce(NEW.id, OLD.id)::text;
  end if;

  if TG_TABLE_NAME = 'client_contacts' then
    v_client_id := coalesce(NEW.client_id, OLD.client_id);
    select c.agency_id into v_agency_id
    from public.clients c
    where c.id = v_client_id;
  elsif TG_TABLE_NAME = 'interactions' then
    v_agency_id := coalesce(NEW.agency_id, OLD.agency_id);
    if v_agency_id is null then
      v_client_id := coalesce(NEW.client_id, OLD.client_id);
      select c.agency_id into v_agency_id
      from public.clients c
      where c.id = v_client_id;
    end if;
  else
    v_agency_id := coalesce(NEW.agency_id, OLD.agency_id);
  end if;

  v_metadata := jsonb_build_object(
    'agency_id', v_agency_id::text,
    'entity_id', v_entity_id
  );

  if TG_TABLE_NAME = 'agencies' then
    v_metadata := v_metadata || jsonb_build_object(
      'name', coalesce(NEW.name, OLD.name)
    );
  elsif TG_TABLE_NAME = 'clients' then
    v_metadata := v_metadata || jsonb_build_object(
      'client_number', coalesce(NEW.client_number, OLD.client_number),
      'name', coalesce(NEW.name, OLD.name)
    );
  elsif TG_TABLE_NAME = 'client_contacts' then
    v_metadata := v_metadata || jsonb_build_object(
      'client_id', coalesce(NEW.client_id, OLD.client_id),
      'email', coalesce(NEW.email, OLD.email),
      'phone', coalesce(NEW.phone, OLD.phone),
      'position', coalesce(NEW.position, OLD.position)
    );
  elsif TG_TABLE_NAME = 'interactions' then
    if TG_OP = 'INSERT' then
      v_metadata := v_metadata || jsonb_build_object('status_after', NEW.status);
    elsif TG_OP = 'UPDATE' then
      if NEW.status is distinct from OLD.status then
        v_metadata := v_metadata || jsonb_build_object(
          'status_before', OLD.status,
          'status_after', NEW.status
        );
      end if;
    else
      v_metadata := v_metadata || jsonb_build_object('status_before', OLD.status);
    end if;
  elsif TG_TABLE_NAME = 'agency_members' then
    v_metadata := v_metadata || jsonb_build_object(
      'user_id', coalesce(NEW.user_id, OLD.user_id)
    );
  elsif TG_TABLE_NAME in ('agency_statuses', 'agency_services', 'agency_entities', 'agency_families') then
    v_metadata := v_metadata || jsonb_build_object(
      'label', coalesce(NEW.label, OLD.label)
    );
  end if;

  insert into public.audit_logs (
    agency_id,
    actor_id,
    actor_is_super_admin,
    action,
    entity_table,
    entity_id,
    metadata
  ) values (
    v_agency_id,
    v_actor_id,
    v_is_super_admin,
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    v_metadata
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

drop trigger if exists audit_clients on public.clients;
create trigger audit_clients
after insert or update or delete on public.clients
for each row execute function public.log_audit_event();

drop trigger if exists audit_client_contacts on public.client_contacts;
create trigger audit_client_contacts
after insert or update or delete on public.client_contacts
for each row execute function public.log_audit_event();

drop trigger if exists audit_agencies on public.agencies;
create trigger audit_agencies
after insert or update or delete on public.agencies
for each row execute function public.log_audit_event();
