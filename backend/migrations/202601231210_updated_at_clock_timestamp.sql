-- Use a per-statement timestamp so optimistic concurrency checks work in a single transaction.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;
