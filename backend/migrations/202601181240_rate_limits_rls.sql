-- RLS policy for rate_limits: service_role only

drop policy if exists rate_limits_service_access on public.rate_limits;
create policy rate_limits_service_access
on public.rate_limits
for all
to service_role
using (true)
with check (true);
