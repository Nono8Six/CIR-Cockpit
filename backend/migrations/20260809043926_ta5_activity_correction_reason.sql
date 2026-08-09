create function private.prepare_activity_correction_reason()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(current_setting('app.activity_correction_reason', true)), '');
begin
  if v_reason is not null then
    new.reason := v_reason;
  end if;
  return new;
end;
$$;

revoke all on function private.prepare_activity_correction_reason() from public, anon, authenticated;

create trigger activity_corrections_prepare_reason
before insert on public.activity_corrections
for each row execute function private.prepare_activity_correction_reason();

alter table public.activity_corrections
  add constraint activity_corrections_reason_trim
  check (reason is null or (reason = btrim(reason) and char_length(reason) between 1 and 500));
