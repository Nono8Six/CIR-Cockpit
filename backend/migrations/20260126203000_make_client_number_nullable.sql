alter table public.clients
  alter column client_number drop not null;

drop index if exists clients_client_number_key;

create unique index if not exists clients_client_number_key
  on public.clients (lower(client_number))
  where client_number is not null;
