-- Add first_name/last_name to profiles and backfill existing records

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

update public.profiles
set
  last_name = coalesce(
    nullif(btrim(last_name), ''),
    nullif(split_part(btrim(coalesce(display_name, '')), ' ', 1), ''),
    nullif(initcap(replace(split_part(email, '@', 1), '.', ' ')), ''),
    'Utilisateur'
  ),
  first_name = coalesce(
    nullif(btrim(first_name), ''),
    nullif(
      btrim(
        regexp_replace(
          btrim(coalesce(display_name, '')),
          '^[^\\s]+\\s*',
          ''
        )
      ),
      ''
    )
  );

alter table public.profiles
  alter column last_name set not null;

alter table public.profiles
  drop constraint if exists profiles_last_name_trim;

alter table public.profiles
  add constraint profiles_last_name_trim
  check (last_name = btrim(last_name) and char_length(last_name) > 0);

alter table public.profiles
  drop constraint if exists profiles_first_name_trim;

alter table public.profiles
  add constraint profiles_first_name_trim
  check (
    first_name is null
    or (first_name = btrim(first_name) and char_length(first_name) > 0)
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_first_name text := nullif(btrim(new.raw_user_meta_data->>'first_name'), '');
  v_last_name text := nullif(btrim(new.raw_user_meta_data->>'last_name'), '');
  v_full_name text := nullif(btrim(new.raw_user_meta_data->>'full_name'), '');
  v_email_local text := split_part(new.email, '@', 1);
begin
  if v_last_name is null and v_full_name is not null then
    v_last_name := nullif(split_part(v_full_name, ' ', 1), '');
  end if;

  if v_first_name is null and v_full_name is not null then
    v_first_name := nullif(
      btrim(regexp_replace(v_full_name, '^[^\\s]+\\s*', '')),
      ''
    );
  end if;

  if v_last_name is null then
    v_last_name := coalesce(nullif(initcap(replace(v_email_local, '.', ' ')), ''), 'Utilisateur');
  end if;

  if v_full_name is null then
    v_full_name := nullif(concat_ws(' ', v_last_name, v_first_name), '');
  end if;

  insert into public.profiles (id, email, display_name, first_name, last_name)
  values (new.id, new.email, v_full_name, v_first_name, v_last_name)
  on conflict (id) do nothing;

  return new;
end;
$function$;
