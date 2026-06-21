alter table public.entity_contacts
  add column if not exists is_primary boolean not null default false;

with ranked_contacts as (
  select
    id,
    row_number() over (
      partition by entity_id
      order by created_at asc, id asc
    ) as contact_rank
  from public.entity_contacts
  where archived_at is null
)
update public.entity_contacts contact
set is_primary = ranked_contacts.contact_rank = 1
from ranked_contacts
where contact.id = ranked_contacts.id
  and contact.is_primary is distinct from (ranked_contacts.contact_rank = 1);

create unique index if not exists entity_contacts_one_active_primary_idx
  on public.entity_contacts (entity_id)
  where is_primary = true and archived_at is null;
