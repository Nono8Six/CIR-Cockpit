-- Add updated_by and last_action_at for interactions

alter table public.interactions
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

alter table public.interactions
  add column if not exists last_action_at timestamptz;

update public.interactions
set updated_by = created_by
where updated_by is null;

update public.interactions
set last_action_at = updated_at
where last_action_at is null;

alter table public.interactions
  alter column last_action_at set not null,
  alter column last_action_at set default now();

create or replace function public.set_interaction_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    new.updated_by = coalesce(auth.uid(), new.created_by);
    new.last_action_at = now();
  else
    new.updated_by = coalesce(auth.uid(), old.updated_by);
    new.last_action_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists set_interactions_audit_fields on public.interactions;
create trigger set_interactions_audit_fields
before insert or update on public.interactions
for each row execute function public.set_interaction_audit_fields();
