-- Fix profiles update policy recursion + enforce immutable identity fields

create or replace function public.prevent_profile_identity_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if NEW.email is distinct from OLD.email then
      raise exception 'profile email is immutable';
    end if;
    if NEW.created_at is distinct from OLD.created_at then
      raise exception 'profile created_at is immutable';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists prevent_profile_identity_change on public.profiles;
create trigger prevent_profile_identity_change
before update of email, created_at on public.profiles
for each row execute function public.prevent_profile_identity_change();

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
on public.profiles
for update to authenticated
using (public.is_super_admin() or id = (select auth.uid()))
with check (
  public.is_super_admin()
  or (
    id = (select auth.uid())
    and ((active_agency_id is null) or public.is_member(active_agency_id))
    and (must_change_password or password_changed_at is not null)
  )
);
