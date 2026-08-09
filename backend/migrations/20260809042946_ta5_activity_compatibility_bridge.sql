
create function private.activity_event_domain(p_event_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_event_type
    when 'reminder_change' then 'task'
    when 'stage_change' then 'opportunity'
    when 'amount_change' then 'opportunity'
    when 'order_ref_change' then 'quote_order'
    when 'status_change' then 'compatibility'
    else 'activity'
  end
$$;

revoke all on function private.activity_event_domain(text) from public, anon, authenticated;

create function private.sync_interaction_to_activity_v2()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity_id uuid;
  v_next_order integer;
  v_business_changed boolean := false;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  select a.id into v_activity_id
  from public.activities a
  where a.legacy_interaction_id = new.id;

  if v_activity_id is null then
    insert into public.activities (
      legacy_interaction_id, agency_id, author_id, created_by, updated_by,
      occurred_at, channel, activity_type, subject, report,
      organization_id, contact_id, lifecycle_status, version,
      created_at, updated_at
    ) values (
      new.id, new.agency_id, new.created_by, new.created_by, new.updated_by,
      new.created_at, new.channel, new.interaction_type, new.subject,
      nullif(btrim(new.notes), ''), new.entity_id, new.contact_id,
      'recorded', 1, new.created_at, new.updated_at
    )
    returning id into v_activity_id;

    insert into public.activity_participants (
      activity_id, agency_id, participant_kind, internal_profile_id,
      participant_role, created_by, created_at
    ) values (
      v_activity_id, new.agency_id, 'internal', new.created_by,
      'author', new.created_by, new.created_at
    );

    if new.contact_id is not null and new.entity_id is not null then
      insert into public.activity_participants (
        activity_id, agency_id, participant_kind, external_contact_id,
        organization_id, participant_role, created_by, created_at
      ) values (
        v_activity_id, new.agency_id, 'external', new.contact_id,
        new.entity_id, 'participant', new.created_by, new.created_at
      );
    end if;

    insert into public.activity_sources (
      activity_id, agency_id, source_type, source_reference,
      source_label, captured_at, created_by, created_at
    ) values (
      v_activity_id, new.agency_id, 'manual', new.id,
      'Saisie CIR Cockpit', new.created_at, new.created_by, new.created_at
    );
  else
    v_business_changed :=
      new.created_at is distinct from old.created_at
      or new.channel is distinct from old.channel
      or new.interaction_type is distinct from old.interaction_type
      or new.subject is distinct from old.subject
      or nullif(btrim(new.notes), '') is distinct from nullif(btrim(old.notes), '')
      or new.entity_id is distinct from old.entity_id
      or new.contact_id is distinct from old.contact_id;

    if v_business_changed then
      update public.activities
      set occurred_at = new.created_at,
          channel = new.channel,
          activity_type = new.interaction_type,
          subject = new.subject,
          report = nullif(btrim(new.notes), ''),
          organization_id = new.entity_id,
          contact_id = new.contact_id,
          version = version + 1,
          updated_by = new.updated_by
      where id = v_activity_id;
    end if;

    if new.entity_id is distinct from old.entity_id
       or new.contact_id is distinct from old.contact_id then
      delete from public.activity_participants
      where activity_id = v_activity_id
        and participant_kind = 'external';

      if new.contact_id is not null and new.entity_id is not null then
        insert into public.activity_participants (
          activity_id, agency_id, participant_kind, external_contact_id,
          organization_id, participant_role, created_by, created_at
        ) values (
          v_activity_id, new.agency_id, 'external', new.contact_id,
          new.entity_id, 'participant', coalesce(new.updated_by, new.created_by), now()
        );
      end if;
    end if;
  end if;

  select coalesce(max(ahe.event_order), 0) into v_next_order
  from public.activity_history_events ahe
  where ahe.activity_id = v_activity_id;

  insert into public.activity_history_events (
    activity_id, agency_id, event_order, legacy_event_id, event_type,
    event_domain, occurred_at, author_id, author_label_raw, content,
    raw_event, created_at
  )
  select
    v_activity_id,
    new.agency_id,
    v_next_order + row_number() over (order by event.ordinality),
    nullif(btrim(event.value ->> 'id'), ''),
    event.value ->> 'type',
    private.activity_event_domain(event.value ->> 'type'),
    case
      when nullif(event.value ->> 'date', '') is null then null
      else (event.value ->> 'date')::timestamptz
    end,
    null,
    nullif(btrim(event.value ->> 'author'), ''),
    event.value ->> 'content',
    event.value,
    now()
  from jsonb_array_elements(new.timeline) with ordinality event(value, ordinality)
  where nullif(btrim(event.value ->> 'id'), '') is not null
    and not exists (
      select 1
      from public.activity_history_events existing
      where existing.activity_id = v_activity_id
        and existing.legacy_event_id = nullif(btrim(event.value ->> 'id'), '')
    )
  order by event.ordinality;

  return new;
end;
$$;

revoke all on function private.sync_interaction_to_activity_v2() from public, anon, authenticated;

create trigger interactions_sync_activity_v2
after insert or update of created_at, channel, interaction_type, subject, notes,
  entity_id, contact_id, timeline, updated_by
on public.interactions
for each row execute function private.sync_interaction_to_activity_v2();

create function private.sync_activity_to_interaction_compat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 or new.legacy_interaction_id is null then
    return new;
  end if;

  update public.interactions
  set created_at = new.occurred_at,
      channel = new.channel,
      interaction_type = new.activity_type,
      subject = new.subject,
      notes = new.report,
      entity_id = new.organization_id,
      contact_id = new.contact_id,
      updated_by = new.updated_by
  where id = new.legacy_interaction_id
    and (
      created_at is distinct from new.occurred_at
      or channel is distinct from new.channel
      or interaction_type is distinct from new.activity_type
      or subject is distinct from new.subject
      or nullif(btrim(notes), '') is distinct from new.report
      or entity_id is distinct from new.organization_id
      or contact_id is distinct from new.contact_id
    );

  if new.organization_id is distinct from old.organization_id
     or new.contact_id is distinct from old.contact_id then
    delete from public.activity_participants
    where activity_id = new.id
      and participant_kind = 'external';

    if new.contact_id is not null and new.organization_id is not null then
      insert into public.activity_participants (
        activity_id, agency_id, participant_kind, external_contact_id,
        organization_id, participant_role, created_by, created_at
      ) values (
        new.id, new.agency_id, 'external', new.contact_id,
        new.organization_id, 'participant', coalesce(new.updated_by, new.created_by), now()
      );
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_activity_to_interaction_compat() from public, anon, authenticated;

create trigger activities_sync_interaction_compat
after update of occurred_at, channel, activity_type, subject, report,
  organization_id, contact_id, updated_by
on public.activities
for each row execute function private.sync_activity_to_interaction_compat();

create function private.validate_activity_interaction_parity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_legacy_interaction_id text := coalesce(
    nullif(to_jsonb(new) ->> 'legacy_interaction_id', ''),
    nullif(to_jsonb(old) ->> 'legacy_interaction_id', ''),
    nullif(to_jsonb(new) ->> 'id', ''),
    nullif(to_jsonb(old) ->> 'id', '')
  );
begin
  if exists (
    select 1
    from public.activities a
    join public.interactions i on i.id = a.legacy_interaction_id
    where a.legacy_interaction_id = v_legacy_interaction_id
      and (
        a.agency_id is distinct from i.agency_id
        or a.author_id is distinct from i.created_by
        or a.occurred_at is distinct from i.created_at
        or a.channel is distinct from i.channel
        or a.activity_type is distinct from i.interaction_type
        or a.subject is distinct from i.subject
        or a.report is distinct from nullif(btrim(i.notes), '')
        or a.organization_id is distinct from i.entity_id
        or a.contact_id is distinct from i.contact_id
        or exists (
          select 1
          from jsonb_array_elements(i.timeline) event(value)
          where nullif(btrim(event.value ->> 'id'), '') is not null
            and not exists (
              select 1
              from public.activity_history_events ahe
              where ahe.activity_id = a.id
                and ahe.legacy_event_id = nullif(btrim(event.value ->> 'id'), '')
            )
        )
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'TA5_ACTIVITY_INTERACTION_DIVERGENCE: parite canonique et compatibilite rompue';
  end if;

  return null;
end;
$$;

create constraint trigger interactions_validate_activity_parity
after insert or update on public.interactions
deferrable initially deferred
for each row execute function private.validate_activity_interaction_parity();

create constraint trigger activities_validate_interaction_parity
after insert or update on public.activities
deferrable initially deferred
for each row execute function private.validate_activity_interaction_parity();

revoke all on function private.validate_activity_interaction_parity() from public, anon, authenticated;

