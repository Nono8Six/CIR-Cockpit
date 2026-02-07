-- Tighten profiles update policy for must_change_password flow

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
on public.profiles
for update to authenticated
using (public.is_super_admin() or id = auth.uid())
with check (
  public.is_super_admin()
  or (
    id = auth.uid()
    and is_super_admin = false
    and email = (select p.email from public.profiles p where p.id = auth.uid())
    and created_at = (select p.created_at from public.profiles p where p.id = auth.uid())
    and (active_agency_id is null or public.is_member(active_agency_id))
    and (must_change_password or password_changed_at is not null)
  )
);
