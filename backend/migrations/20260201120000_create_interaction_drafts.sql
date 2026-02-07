create table if not exists public.interaction_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  form_type text not null default 'interaction',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists interaction_drafts_user_agency_form_idx
  on public.interaction_drafts (user_id, agency_id, form_type);

create index if not exists interaction_drafts_user_id_idx
  on public.interaction_drafts (user_id);

create index if not exists interaction_drafts_agency_id_idx
  on public.interaction_drafts (agency_id);

create index if not exists interaction_drafts_updated_at_idx
  on public.interaction_drafts (updated_at);

alter table public.interaction_drafts enable row level security;

drop policy if exists interaction_drafts_select on public.interaction_drafts;
create policy interaction_drafts_select on public.interaction_drafts
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists interaction_drafts_insert on public.interaction_drafts;
create policy interaction_drafts_insert on public.interaction_drafts
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists interaction_drafts_update on public.interaction_drafts;
create policy interaction_drafts_update on public.interaction_drafts
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists interaction_drafts_delete on public.interaction_drafts;
create policy interaction_drafts_delete on public.interaction_drafts
  for delete
  to authenticated
  using (user_id = auth.uid());

drop trigger if exists set_updated_at_interaction_drafts on public.interaction_drafts;
create trigger set_updated_at_interaction_drafts
  before update on public.interaction_drafts
  for each row execute function public.set_updated_at();
