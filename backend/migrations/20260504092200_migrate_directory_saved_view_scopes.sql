with normalized_views as (
  select
    id,
    state,
    case
      when jsonb_typeof(state -> 'scope') = 'object' then state -> 'scope'
      when jsonb_typeof(state -> 'agencyIds') = 'array'
        and jsonb_array_length(state -> 'agencyIds') > 0
        then jsonb_build_object('mode', 'selected_agencies', 'agencyIds', state -> 'agencyIds')
      when jsonb_typeof(state -> 'agencyIds') = 'string'
        and nullif(trim(state ->> 'agencyIds'), '') is not null
        then jsonb_build_object('mode', 'selected_agencies', 'agencyIds', jsonb_build_array(state ->> 'agencyIds'))
      when jsonb_typeof(state -> 'agencyId') = 'string'
        and nullif(trim(state ->> 'agencyId'), '') is not null
        then jsonb_build_object('mode', 'selected_agencies', 'agencyIds', jsonb_build_array(state ->> 'agencyId'))
      else jsonb_build_object('mode', 'active_agency')
    end as next_scope,
    case
      when state ? 'departments' then state -> 'departments'
      when jsonb_typeof(state -> 'department') = 'array' then state -> 'department'
      when jsonb_typeof(state -> 'department') = 'string'
        and nullif(trim(state ->> 'department'), '') is not null
        then jsonb_build_array(state ->> 'department')
      else null
    end as next_departments,
    case
      when state ? 'cirCommercialIds' then state -> 'cirCommercialIds'
      when jsonb_typeof(state -> 'cirCommercialId') = 'array' then state -> 'cirCommercialId'
      when jsonb_typeof(state -> 'cirCommercialId') = 'string'
        and nullif(trim(state ->> 'cirCommercialId'), '') is not null
        then jsonb_build_array(state ->> 'cirCommercialId')
      else null
    end as next_cir_commercial_ids
  from public.directory_saved_views
  where state ? 'agencyId'
    or state ? 'agencyIds'
    or state ? 'department'
    or state ? 'cirCommercialId'
    or not state ? 'scope'
)
update public.directory_saved_views as saved_view
set state = jsonb_strip_nulls(
  normalized_views.state
    - 'agencyId'
    - 'agencyIds'
    - 'department'
    - 'cirCommercialId'
    || jsonb_build_object('scope', normalized_views.next_scope)
    || case
      when normalized_views.next_departments is null then '{}'::jsonb
      else jsonb_build_object('departments', normalized_views.next_departments)
    end
    || case
      when normalized_views.next_cir_commercial_ids is null then '{}'::jsonb
      else jsonb_build_object('cirCommercialIds', normalized_views.next_cir_commercial_ids)
    end
)
from normalized_views
where saved_view.id = normalized_views.id;
