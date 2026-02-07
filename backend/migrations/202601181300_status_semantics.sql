alter table public.agency_statuses
  add column if not exists category text not null default 'in_progress',
  add column if not exists is_terminal boolean not null default false;

update public.agency_statuses
  set category = 'todo'
  where is_default = true;

update public.agency_statuses
  set category = 'done'
  where label ilike 'clos - gagn%' or label ilike 'clos - perdu%';

update public.agency_statuses
  set is_terminal = (category = 'done');

alter table public.agency_statuses
  add constraint agency_statuses_category_check
    check (category in ('todo', 'in_progress', 'done'));

alter table public.agency_statuses
  add constraint agency_statuses_terminal_check
    check ((category = 'done') = is_terminal);
