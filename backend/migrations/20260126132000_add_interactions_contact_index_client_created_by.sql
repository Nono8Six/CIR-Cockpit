-- Add missing FK index for interactions.contact_id + default created_by on clients

create index if not exists idx_interactions_contact_id
  on public.interactions (contact_id);

create or replace function public.set_client_created_by()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is null then
    new.created_by := public.audit_actor_id();
  end if;
  return new;
end;
$$;

drop trigger if exists set_client_created_by on public.clients;
create trigger set_client_created_by
before insert on public.clients
for each row execute function public.set_client_created_by();
