-- Keep interactions.status in sync when agency_statuses.label changes.

CREATE OR REPLACE FUNCTION public.sync_status_label_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if NEW.label is distinct from OLD.label then
    update public.interactions
    set status = NEW.label
    where status_id = NEW.id;
  end if;
  return NEW;
end;
$function$;

DO $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'sync_agency_status_label'
  ) then
    create trigger sync_agency_status_label
      after update of label on public.agency_statuses
      for each row execute function public.sync_status_label_on_update();
  end if;
end $$;
