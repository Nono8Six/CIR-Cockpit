-- Restrict hard_delete_agency execution to service_role only.

revoke all on function public.hard_delete_agency(uuid) from public;
revoke all on function public.hard_delete_agency(uuid) from anon;
revoke all on function public.hard_delete_agency(uuid) from authenticated;

grant execute on function public.hard_delete_agency(uuid) to service_role;
