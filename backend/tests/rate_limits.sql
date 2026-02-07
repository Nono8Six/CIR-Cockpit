-- Rate limit RLS + function tests
-- Run only in dev/staging. Uses a transaction and rolls back.

begin;

do $$
declare
  v_has boolean;
begin
  select has_table_privilege('authenticated', 'public.rate_limits', 'select,insert,update,delete')
  into v_has;
  if v_has then
    raise exception 'authenticated should not have rate_limits privileges';
  end if;

  select has_function_privilege('authenticated', 'public.check_rate_limit(text, integer, integer)', 'execute')
  into v_has;
  if v_has then
    raise exception 'authenticated should not execute check_rate_limit';
  end if;

  select has_function_privilege('service_role', 'public.check_rate_limit(text, integer, integer)', 'execute')
  into v_has;
  if not v_has then
    raise exception 'service_role should execute check_rate_limit';
  end if;
end;
$$;

rollback;
