alter table public.entities
  add column if not exists client_kind text;

update public.entities
set client_kind = 'company'
where entity_type = 'Client'
  and client_kind is null;

alter table public.entities
  drop constraint if exists entities_client_kind_check;

alter table public.entities
  add constraint entities_client_kind_check
  check (client_kind in ('company', 'individual') or client_kind is null);
