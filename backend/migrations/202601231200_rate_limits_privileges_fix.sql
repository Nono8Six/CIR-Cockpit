-- Ensure rate_limits access is locked down to service_role only.

revoke all on table public.rate_limits from public;
revoke all on table public.rate_limits from anon, authenticated;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, integer, integer) from anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
