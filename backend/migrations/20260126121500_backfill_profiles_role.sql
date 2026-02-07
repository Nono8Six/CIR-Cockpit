-- Backfill profiles.role from legacy fields

update public.profiles p
set role = case
  when p.is_super_admin then 'super_admin'::public.user_role
  when exists (
    select 1
    from public.agency_members m
    where m.user_id = p.id
      and m.role = 'agency_admin'
  ) then 'agency_admin'::public.user_role
  else 'tcs'::public.user_role
end
where p.role is distinct from case
  when p.is_super_admin then 'super_admin'::public.user_role
  when exists (
    select 1
    from public.agency_members m
    where m.user_id = p.id
      and m.role = 'agency_admin'
  ) then 'agency_admin'::public.user_role
  else 'tcs'::public.user_role
end;
