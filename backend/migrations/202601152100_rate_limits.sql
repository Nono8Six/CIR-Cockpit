-- Rate limiting support for Edge Functions

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count integer not null
);

create index if not exists idx_rate_limits_window_start on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;

revoke all on table public.rate_limits from public;

create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count integer;
begin
  if p_key is null or length(p_key) = 0 then
    return false;
  end if;
  if p_limit is null or p_limit <= 0 then
    return false;
  end if;
  if p_window_seconds is null or p_window_seconds <= 0 then
    return false;
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key)
  do update set
    count = case
      when public.rate_limits.window_start = v_window_start then public.rate_limits.count + 1
      else 1
    end,
    window_start = v_window_start
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
