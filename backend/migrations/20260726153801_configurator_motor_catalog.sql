-- Configurateurs C1 - catalogue technique moteur.
-- Les identifiants SQLite ne sont jamais reutilises comme identifiants metier.

create table configurator.motor_dimension_canonical (
  code text not null,
  vocabulary_version integer not null default 1,
  label_fr text not null,
  criterion_enabled boolean not null,
  created_at timestamptz not null default now(),
  constraint motor_dimension_canonical_pk
    primary key (vocabulary_version, code),
  constraint motor_dimension_canonical_version_check
    check (vocabulary_version = 1),
  constraint motor_dimension_canonical_code_check
    check (code in ('A', 'B', 'C', 'H', 'D', 'E', 'F', 'M', 'N', 'P', 'S', 'T', 'Z')),
  constraint motor_dimension_canonical_label_check
    check (label_fr = btrim(label_fr) and char_length(label_fr) between 1 and 255)
);

insert into configurator.motor_dimension_canonical (
  code,
  vocabulary_version,
  label_fr,
  criterion_enabled
) values
  ('A', 1, 'Entraxe longitudinal des pieds', true),
  ('B', 1, 'Entraxe transversal des pieds', true),
  ('C', 1, 'Distance au premier trou de fixation', true),
  ('H', 1, 'Hauteur d axe', true),
  ('D', 1, 'Diametre du bout d arbre', true),
  ('E', 1, 'Longueur du bout d arbre', true),
  ('F', 1, 'Largeur de clavette', true),
  ('M', 1, 'Entraxe des trous de bride', true),
  ('N', 1, 'Diametre de centrage de bride', true),
  ('P', 1, 'Diametre exterieur de bride', true),
  ('S', 1, 'Trou ou filetage de bride', true),
  ('T', 1, 'Epaisseur de bride', true),
  ('Z', 1, 'Nombre de trous de bride', true)
on conflict (vocabulary_version, code) do nothing;

comment on table configurator.motor_dimension_canonical is
  'Vocabulaire de saisie et de criteres phase 1. Les codes publies non mappes restent affichables mais ne deviennent pas des criteres.';

create function configurator.canonical_numeric_token_v1(p_value numeric)
returns text
language sql
immutable
strict
set search_path = ''
as $function$
  select replace(
    replace(
      case
        when position('.' in p_value::text) > 0
          then rtrim(rtrim(p_value::text, '0'), '.')
        else p_value::text
      end,
      '-',
      'n'
    ),
    '.',
    'p'
  );
$function$;

create function configurator.normalize_motor_designation_v1(
  p_designation text
)
returns text
language sql
immutable
strict
set search_path = ''
as $function$
  select lower(
    regexp_replace(
      normalize(replace(p_designation, '*', ''), NFKC),
      '[^a-zA-Z0-9]',
      '',
      'g'
    )
  );
$function$;

create function configurator.derive_motor_identity_discriminator_v1(
  p_inertia_kgm2 numeric,
  p_mass_kg numeric
)
returns text
language sql
immutable
set search_path = ''
as $function$
  select case
    when p_inertia_kgm2 is null and p_mass_kg is null then 'standard'
    else
      'j-' ||
      coalesce(
        configurator.canonical_numeric_token_v1(p_inertia_kgm2),
        'na'
      ) ||
      '-m-' ||
      coalesce(
        configurator.canonical_numeric_token_v1(p_mass_kg),
        'na'
      )
  end;
$function$;

create function configurator.derive_motor_model_key_v1(
  p_normalized_brand text,
  p_normalized_designation text,
  p_identity_discriminator text
)
returns text
language sql
immutable
strict
set search_path = ''
as $function$
  select p_normalized_brand || ':' ||
    p_normalized_designation || ':' ||
    p_identity_discriminator;
$function$;

revoke all on function configurator.canonical_numeric_token_v1(numeric)
  from public, anon;
revoke all on function configurator.normalize_motor_designation_v1(text)
  from public, anon;
revoke all on function configurator.derive_motor_identity_discriminator_v1(numeric, numeric)
  from public, anon;
revoke all on function configurator.derive_motor_model_key_v1(text, text, text)
  from public, anon;

create table configurator.motor_model (
  id bigint generated always as identity,
  snapshot_id uuid not null
    references configurator.catalog_snapshot(id) on delete cascade,
  model_key text not null,
  model_key_rule text not null default 'cir.motor.model-key/v1',
  normalized_brand text not null,
  normalized_designation text not null,
  identity_discriminator text not null,
  identity_discriminator_rule text not null
    default 'cir.motor.identity-discriminator/v1',
  brand text not null,
  series text,
  designation text not null,
  article_no text,
  variant_key text,
  pole_config text not null,
  motor_technology text not null default 'asynchronous',
  casing_material text,
  protection_ip text,
  frame_size integer,
  frame_letter text,
  shaft_spec text,
  max_torque_nm numeric,
  inertia_kgm2 numeric,
  mass_kg numeric,
  mass_mounting text,
  lifecycle text not null default 'current',
  source_ref_id bigint not null
    references configurator.source_ref(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint motor_model_pk primary key (id),
  constraint motor_model_snapshot_id_id_unique unique (snapshot_id, id),
  constraint motor_model_snapshot_key_unique unique (snapshot_id, model_key),
  constraint motor_model_key_rule_check
    check (model_key_rule = 'cir.motor.model-key/v1'),
  constraint motor_model_discriminator_rule_check
    check (
      identity_discriminator_rule = 'cir.motor.identity-discriminator/v1'
    ),
  constraint motor_model_key_format_check
    check (
      model_key = lower(btrim(model_key))
      and model_key ~ '^[a-z0-9]+(?:[._:-][a-z0-9]+)*$'
    ),
  constraint motor_model_normalized_brand_check
    check (
      normalized_brand = lower(btrim(normalized_brand))
      and normalized_brand ~ '^[a-z0-9]+(?:[._-][a-z0-9]+)*$'
    ),
  constraint motor_model_normalized_designation_check
    check (
      normalized_designation =
        configurator.normalize_motor_designation_v1(designation)
      and normalized_designation ~ '^[a-z0-9]+$'
    ),
  constraint motor_model_identity_discriminator_check
    check (
      identity_discriminator = lower(btrim(identity_discriminator))
      and identity_discriminator ~ '^[a-z0-9]+(?:[._-][a-z0-9]+)*$'
    ),
  constraint motor_model_identity_discriminator_value_check
    check (
      identity_discriminator =
        configurator.derive_motor_identity_discriminator_v1(
          inertia_kgm2,
          mass_kg
        )
    ),
  constraint motor_model_key_components_check
    check (
      model_key = configurator.derive_motor_model_key_v1(
        normalized_brand,
        normalized_designation,
        identity_discriminator
      )
    ),
  constraint motor_model_brand_check
    check (brand = btrim(brand) and char_length(brand) between 1 and 255),
  constraint motor_model_designation_check
    check (
      designation = btrim(designation)
      and char_length(designation) between 1 and 255
    ),
  constraint motor_model_pole_config_check
    check (pole_config ~ '^(2|4|6|8|10|12)(/(2|4|6|8|10|12))*$'),
  constraint motor_model_technology_check
    check (motor_technology in ('asynchronous', 'PMaSynRM', 'SynRM', 'PM')),
  constraint motor_model_casing_check
    check (
      casing_material is null
      or casing_material in ('aluminium', 'cast-iron', 'steel')
    ),
  constraint motor_model_frame_size_check
    check (frame_size is null or frame_size between 56 and 450),
  constraint motor_model_max_torque_check
    check (max_torque_nm is null or max_torque_nm > 0),
  constraint motor_model_inertia_check
    check (inertia_kgm2 is null or inertia_kgm2 >= 0),
  constraint motor_model_mass_check
    check (mass_kg is null or mass_kg > 0),
  constraint motor_model_mass_mounting_check
    check (
      mass_mounting is null
      or mass_mounting in ('B3', 'B5', 'B14', 'B34', 'B35', 'V1')
    ),
  constraint motor_model_lifecycle_check
    check (lifecycle in ('current', 'legacy'))
);

comment on column configurator.motor_model.identity_discriminator is
  'cir.motor.identity-discriminator/v1: j-<inertie canonique ou na>-m-<masse canonique ou na>; standard seulement si les deux faits sont absents. Une collision restante est bloquante et ne peut etre resolue par variant_key seul.';

create index motor_model_snapshot_brand_idx
  on configurator.motor_model (snapshot_id, brand);

create index motor_model_snapshot_frame_idx
  on configurator.motor_model (snapshot_id, frame_size, pole_config);

create index motor_model_source_ref_idx
  on configurator.motor_model (source_ref_id);

create table configurator.motor_operating_point (
  id bigint generated always as identity,
  snapshot_id uuid not null,
  model_id bigint not null,
  poles integer not null,
  supply_mode text not null,
  frequency_hz numeric not null,
  voltage_v numeric,
  coupling text,
  rated_speed_rpm numeric not null,
  power_kw numeric not null,
  efficiency_class text,
  efficiency_standard text,
  rated_torque_nm numeric,
  rated_current_a numeric,
  max_current_a numeric,
  noise_db numeric,
  cos_phi numeric,
  starting_torque_ratio numeric,
  starting_current_ratio numeric,
  breakdown_torque_ratio numeric,
  source_ref_id bigint not null
    references configurator.source_ref(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint motor_operating_point_pk primary key (id),
  constraint motor_operating_point_snapshot_id_id_unique
    unique (snapshot_id, id),
  constraint motor_operating_point_model_fk
    foreign key (snapshot_id, model_id)
    references configurator.motor_model(snapshot_id, id)
    on delete cascade,
  constraint motor_operating_point_identity_unique
    unique nulls not distinct (
      snapshot_id,
      model_id,
      poles,
      supply_mode,
      frequency_hz,
      voltage_v,
      coupling
    ),
  constraint motor_operating_point_poles_check
    check (poles in (2, 4, 6, 8, 10, 12)),
  constraint motor_operating_point_supply_mode_check
    check (supply_mode in ('mains', 'vfd')),
  constraint motor_operating_point_frequency_check
    check (frequency_hz between 10 and 400),
  constraint motor_operating_point_voltage_check
    check (voltage_v is null or voltage_v between 100 and 1000),
  constraint motor_operating_point_coupling_check
    check (coupling is null or coupling in ('Y', 'D')),
  constraint motor_operating_point_speed_check
    check (rated_speed_rpm between 300 and 6500),
  constraint motor_operating_point_power_check
    check (power_kw > 0 and power_kw <= 1200),
  constraint motor_operating_point_efficiency_class_check
    check (
      efficiency_class is null
      or efficiency_class in ('IE1', 'IE2', 'IE3', 'IE4', 'IE5')
    ),
  constraint motor_operating_point_efficiency_standard_check
    check (
      efficiency_standard is null
      or efficiency_standard in ('IEC 60034-30-1', 'IEC TS 60034-30-2')
    ),
  constraint motor_operating_point_ie5_vfd_check
    check (efficiency_class is distinct from 'IE5' or supply_mode = 'vfd'),
  constraint motor_operating_point_rated_torque_check
    check (rated_torque_nm is null or rated_torque_nm > 0),
  constraint motor_operating_point_rated_current_check
    check (rated_current_a is null or rated_current_a > 0),
  constraint motor_operating_point_max_current_check
    check (max_current_a is null or max_current_a > 0),
  constraint motor_operating_point_noise_check
    check (noise_db is null or noise_db between 0 and 150),
  constraint motor_operating_point_cos_phi_check
    check (cos_phi is null or cos_phi between 0.1 and 1)
);

create index motor_operating_point_model_idx
  on configurator.motor_operating_point (snapshot_id, model_id);

create index motor_operating_point_lookup_idx
  on configurator.motor_operating_point (
    snapshot_id,
    power_kw,
    supply_mode,
    frequency_hz
  );

create index motor_operating_point_source_ref_idx
  on configurator.motor_operating_point (source_ref_id);

create table configurator.motor_efficiency_point (
  id bigint generated always as identity,
  snapshot_id uuid not null,
  operating_point_id bigint not null,
  load_fraction numeric not null,
  efficiency_pct numeric not null,
  cos_phi numeric,
  source_ref_id bigint not null
    references configurator.source_ref(id) on delete restrict,
  constraint motor_efficiency_point_pk primary key (id),
  constraint motor_efficiency_point_operating_fk
    foreign key (snapshot_id, operating_point_id)
    references configurator.motor_operating_point(snapshot_id, id)
    on delete cascade,
  constraint motor_efficiency_point_unique
    unique (snapshot_id, operating_point_id, load_fraction),
  constraint motor_efficiency_point_load_check
    check (load_fraction > 0 and load_fraction <= 1),
  constraint motor_efficiency_point_value_check
    check (efficiency_pct between 10 and 100),
  constraint motor_efficiency_point_cos_phi_check
    check (cos_phi is null or cos_phi between 0.1 and 1)
);

create index motor_efficiency_point_operating_idx
  on configurator.motor_efficiency_point (snapshot_id, operating_point_id);

create index motor_efficiency_point_source_ref_idx
  on configurator.motor_efficiency_point (source_ref_id);

create table configurator.motor_torque_point (
  id bigint generated always as identity,
  snapshot_id uuid not null,
  operating_point_id bigint not null,
  at_frequency_hz numeric not null,
  torque_nm numeric not null,
  source_ref_id bigint not null
    references configurator.source_ref(id) on delete restrict,
  constraint motor_torque_point_pk primary key (id),
  constraint motor_torque_point_operating_fk
    foreign key (snapshot_id, operating_point_id)
    references configurator.motor_operating_point(snapshot_id, id)
    on delete cascade,
  constraint motor_torque_point_unique
    unique (snapshot_id, operating_point_id, at_frequency_hz),
  constraint motor_torque_point_frequency_check
    check (at_frequency_hz > 0 and at_frequency_hz <= 400),
  constraint motor_torque_point_value_check
    check (torque_nm > 0)
);

create index motor_torque_point_operating_idx
  on configurator.motor_torque_point (snapshot_id, operating_point_id);

create index motor_torque_point_source_ref_idx
  on configurator.motor_torque_point (source_ref_id);

create table configurator.motor_dimension_definition (
  id bigint generated always as identity,
  snapshot_id uuid not null
    references configurator.catalog_snapshot(id) on delete cascade,
  published_code text not null,
  base_published_code text,
  canonical_vocabulary_version integer,
  canonical_code text,
  variant_context text,
  mapping_status text not null,
  source_ref_id bigint not null
    references configurator.source_ref(id) on delete restrict,
  constraint motor_dimension_definition_pk primary key (id),
  constraint motor_dimension_definition_snapshot_id_id_unique
    unique (snapshot_id, id),
  constraint motor_dimension_definition_published_code_check
    check (
      published_code = btrim(published_code)
      and char_length(published_code) between 1 and 100
    ),
  constraint motor_dimension_definition_base_code_check
    check (
      base_published_code is null
      or (
        base_published_code = btrim(base_published_code)
        and char_length(base_published_code) between 1 and 100
      )
    ),
  constraint motor_dimension_definition_mapping_status_check
    check (mapping_status in ('mapped', 'unmapped', 'header_contamination')),
  constraint motor_dimension_definition_canonical_fk
    foreign key (canonical_vocabulary_version, canonical_code)
    references configurator.motor_dimension_canonical(vocabulary_version, code)
    on delete restrict,
  constraint motor_dimension_definition_mapping_shape_check
    check (
      (
        mapping_status = 'mapped'
        and canonical_vocabulary_version = 1
        and canonical_code is not null
        and base_published_code is not null
      )
      or
      (
        mapping_status in ('unmapped', 'header_contamination')
        and canonical_vocabulary_version is null
        and canonical_code is null
      )
    ),
  constraint motor_dimension_definition_header_check
    check (
      published_code <> 'DPublished'
      or mapping_status = 'header_contamination'
    ),
  constraint motor_dimension_definition_prime_context_check
    check (
      published_code not in ('AD''', 'AF''', 'BA''', 'BE''', 'B''', 'CA''')
      or (
        variant_context is not null
        and base_published_code = rtrim(published_code, '''')
      )
    ),
  constraint motor_dimension_definition_unique
    unique nulls not distinct (
      snapshot_id,
      published_code,
      variant_context
    )
);

comment on table configurator.motor_dimension_definition is
  'Codes publies observes dans un snapshot. La comparaison textuelle PostgreSQL conserve x et X comme deux codes distincts.';

create index motor_dimension_definition_snapshot_mapping_idx
  on configurator.motor_dimension_definition (snapshot_id, mapping_status);

create index motor_dimension_definition_canonical_idx
  on configurator.motor_dimension_definition (
    canonical_vocabulary_version,
    canonical_code
  )
  where canonical_code is not null;

create index motor_dimension_definition_source_ref_idx
  on configurator.motor_dimension_definition (source_ref_id);

create or replace function private.configurator_validate_motor_dimension()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  v_definition configurator.motor_dimension_definition%rowtype;
begin
  select d.*
    into v_definition
  from configurator.motor_dimension_definition d
  where d.snapshot_id = new.snapshot_id
    and d.id = new.definition_id;

  if not found
    or new.published_code_verbatim is distinct from v_definition.published_code
    or new.canonical_vocabulary_version is distinct from
      v_definition.canonical_vocabulary_version
    or new.canonical_code is distinct from v_definition.canonical_code
    or new.variant_context is distinct from v_definition.variant_context
  then
    raise exception
      'CONFIGURATOR_DIMENSION_DEFINITION_MISMATCH: code publie, code canonique et contexte doivent correspondre a la definition du snapshot';
  end if;

  return new;
end;
$function$;

revoke all on function private.configurator_validate_motor_dimension()
  from public, anon, authenticated;

create table configurator.motor_dimension (
  id bigint generated always as identity,
  snapshot_id uuid not null,
  model_id bigint not null,
  definition_id bigint not null,
  mounting text not null,
  polarity integer,
  published_code_verbatim text not null,
  canonical_vocabulary_version integer,
  canonical_code text,
  variant_context text,
  value_mm numeric,
  value_text text,
  source_ref_id bigint not null
    references configurator.source_ref(id) on delete restrict,
  constraint motor_dimension_pk primary key (id),
  constraint motor_dimension_model_fk
    foreign key (snapshot_id, model_id)
    references configurator.motor_model(snapshot_id, id)
    on delete cascade,
  constraint motor_dimension_definition_fk
    foreign key (snapshot_id, definition_id)
    references configurator.motor_dimension_definition(snapshot_id, id)
    on delete restrict,
  constraint motor_dimension_canonical_fk
    foreign key (canonical_vocabulary_version, canonical_code)
    references configurator.motor_dimension_canonical(vocabulary_version, code)
    on delete restrict,
  constraint motor_dimension_mounting_check
    check (mounting in ('B3', 'B5', 'B14', 'B34', 'B35', 'V1', 'ANY')),
  constraint motor_dimension_polarity_check
    check (polarity is null or polarity in (2, 4, 6, 8, 10, 12)),
  constraint motor_dimension_published_code_check
    check (
      published_code_verbatim = btrim(published_code_verbatim)
      and char_length(published_code_verbatim) between 1 and 100
    ),
  constraint motor_dimension_canonical_pair_check
    check (
      (canonical_vocabulary_version is null and canonical_code is null)
      or (canonical_vocabulary_version = 1 and canonical_code is not null)
    ),
  constraint motor_dimension_value_check
    check (num_nonnulls(value_mm, value_text) = 1),
  constraint motor_dimension_value_mm_check
    check (value_mm is null or value_mm >= 0),
  constraint motor_dimension_unique
    unique nulls not distinct (
      snapshot_id,
      model_id,
      mounting,
      polarity,
      published_code_verbatim,
      variant_context
    )
);

create index motor_dimension_model_idx
  on configurator.motor_dimension (snapshot_id, model_id);

create index motor_dimension_definition_idx
  on configurator.motor_dimension (snapshot_id, definition_id);

create index motor_dimension_canonical_idx
  on configurator.motor_dimension (
    canonical_vocabulary_version,
    canonical_code
  )
  where canonical_code is not null;

create index motor_dimension_source_ref_idx
  on configurator.motor_dimension (source_ref_id);

create index motor_dimension_criterion_idx
  on configurator.motor_dimension (
    snapshot_id,
    canonical_code,
    mounting,
    polarity,
    model_id
  )
  where canonical_code is not null;

create trigger validate_motor_dimension
before insert or update of
  snapshot_id,
  definition_id,
  published_code_verbatim,
  canonical_vocabulary_version,
  canonical_code,
  variant_context
on configurator.motor_dimension
for each row execute function private.configurator_validate_motor_dimension();

create table configurator.motor_flange_option (
  id bigint generated always as identity,
  snapshot_id uuid not null,
  model_id bigint not null,
  mounting text not null,
  role text not null,
  order_code text,
  flange_ref text,
  din_ref text,
  bore_type text not null,
  dim_m_mm numeric,
  dim_n_mm numeric,
  dim_p_mm numeric,
  dim_s_mm numeric,
  dim_s_thread text,
  dim_t_mm numeric,
  dim_la_mm numeric,
  dim_le_mm numeric,
  holes integer,
  source_ref_id bigint not null
    references configurator.source_ref(id) on delete restrict,
  constraint motor_flange_option_pk primary key (id),
  constraint motor_flange_option_model_fk
    foreign key (snapshot_id, model_id)
    references configurator.motor_model(snapshot_id, id)
    on delete cascade,
  constraint motor_flange_option_mounting_check
    check (mounting in ('B5', 'B14', 'B34', 'B35')),
  constraint motor_flange_option_role_check
    check (role in ('standard', 'larger', 'smaller')),
  constraint motor_flange_option_bore_type_check
    check (bore_type in ('through', 'tapped')),
  constraint motor_flange_option_bore_value_check
    check (num_nonnulls(dim_s_mm, dim_s_thread) = 1),
  constraint motor_flange_option_bore_coherence_check
    check (
      (bore_type = 'through' and dim_s_mm is not null)
      or (bore_type = 'tapped' and dim_s_thread is not null)
    ),
  constraint motor_flange_option_holes_check
    check (holes is null or holes > 0),
  constraint motor_flange_option_unique
    unique (snapshot_id, model_id, mounting, role)
);

create index motor_flange_option_model_idx
  on configurator.motor_flange_option (snapshot_id, model_id);

create index motor_flange_option_source_ref_idx
  on configurator.motor_flange_option (source_ref_id);

create index motor_flange_option_reference_idx
  on configurator.motor_flange_option (snapshot_id, flange_ref)
  where flange_ref is not null;

create table configurator.motor_brake_option (
  id bigint generated always as identity,
  snapshot_id uuid not null,
  model_id bigint not null,
  brake_type text not null,
  brake_torque_nm numeric not null,
  order_code text,
  source_ref_id bigint not null
    references configurator.source_ref(id) on delete restrict,
  constraint motor_brake_option_pk primary key (id),
  constraint motor_brake_option_model_fk
    foreign key (snapshot_id, model_id)
    references configurator.motor_model(snapshot_id, id)
    on delete cascade,
  constraint motor_brake_option_type_check
    check (brake_type = btrim(brake_type) and char_length(brake_type) > 0),
  constraint motor_brake_option_torque_check
    check (brake_torque_nm > 0),
  constraint motor_brake_option_unique
    unique (snapshot_id, model_id, brake_type, brake_torque_nm)
);

create index motor_brake_option_model_idx
  on configurator.motor_brake_option (snapshot_id, model_id);

create index motor_brake_option_source_ref_idx
  on configurator.motor_brake_option (source_ref_id);

create table configurator.motor_vendor_correlation (
  id bigint generated always as identity primary key,
  snapshot_id uuid not null
    references configurator.catalog_snapshot(id) on delete cascade,
  brand text not null,
  power_kw numeric not null,
  poles integer not null,
  designation_from text not null,
  efficiency_from text not null,
  designation_to text not null,
  efficiency_to text not null,
  source_ref_id bigint not null
    references configurator.source_ref(id) on delete restrict,
  constraint motor_vendor_correlation_power_check check (power_kw > 0),
  constraint motor_vendor_correlation_poles_check
    check (poles in (2, 4, 6, 8, 10, 12)),
  constraint motor_vendor_correlation_efficiency_from_check
    check (efficiency_from in ('IE1', 'IE2', 'IE3', 'IE4', 'IE5')),
  constraint motor_vendor_correlation_efficiency_to_check
    check (efficiency_to in ('IE1', 'IE2', 'IE3', 'IE4', 'IE5')),
  constraint motor_vendor_correlation_unique
    unique (
      snapshot_id,
      brand,
      power_kw,
      poles,
      designation_from,
      efficiency_from,
      designation_to,
      efficiency_to
    )
);

create index motor_vendor_correlation_snapshot_idx
  on configurator.motor_vendor_correlation (snapshot_id);

create index motor_vendor_correlation_source_ref_idx
  on configurator.motor_vendor_correlation (source_ref_id);

create table configurator.motor_iec_threshold (
  id bigint generated always as identity primary key,
  snapshot_id uuid not null
    references configurator.catalog_snapshot(id) on delete cascade,
  efficiency_class text not null,
  poles integer not null,
  frequency_hz integer not null,
  power_kw numeric not null,
  min_efficiency numeric not null,
  standard_ref text not null,
  source_ref_id bigint not null
    references configurator.source_ref(id) on delete restrict,
  constraint motor_iec_threshold_class_check
    check (efficiency_class in ('IE1', 'IE2', 'IE3', 'IE4')),
  constraint motor_iec_threshold_poles_check
    check (poles in (2, 4, 6, 8)),
  constraint motor_iec_threshold_frequency_check
    check (frequency_hz in (50, 60)),
  constraint motor_iec_threshold_power_check check (power_kw > 0),
  constraint motor_iec_threshold_efficiency_check
    check (min_efficiency between 10 and 100),
  constraint motor_iec_threshold_unique
    unique (
      snapshot_id,
      efficiency_class,
      poles,
      frequency_hz,
      power_kw
    )
);

create index motor_iec_threshold_snapshot_idx
  on configurator.motor_iec_threshold (snapshot_id);

create index motor_iec_threshold_source_ref_idx
  on configurator.motor_iec_threshold (source_ref_id);

create table configurator.motor_iec_vsd_threshold (
  id bigint generated always as identity primary key,
  snapshot_id uuid not null
    references configurator.catalog_snapshot(id) on delete cascade,
  efficiency_class text not null,
  speed_min_rpm integer not null,
  speed_max_rpm integer not null,
  power_kw numeric not null,
  min_efficiency numeric not null,
  standard_ref text not null,
  source_ref_id bigint not null
    references configurator.source_ref(id) on delete restrict,
  constraint motor_iec_vsd_threshold_class_check
    check (efficiency_class in ('IE1', 'IE2', 'IE3', 'IE4', 'IE5')),
  constraint motor_iec_vsd_threshold_speed_check
    check (speed_min_rpm > 0 and speed_max_rpm >= speed_min_rpm),
  constraint motor_iec_vsd_threshold_power_check check (power_kw > 0),
  constraint motor_iec_vsd_threshold_efficiency_check
    check (min_efficiency between 10 and 100),
  constraint motor_iec_vsd_threshold_unique
    unique (
      snapshot_id,
      efficiency_class,
      speed_min_rpm,
      speed_max_rpm,
      power_kw
    )
);

create index motor_iec_vsd_threshold_snapshot_idx
  on configurator.motor_iec_vsd_threshold (snapshot_id);

create index motor_iec_vsd_threshold_source_ref_idx
  on configurator.motor_iec_vsd_threshold (source_ref_id);

create table configurator.motor_validation_issue (
  id bigint generated always as identity primary key,
  snapshot_id uuid not null
    references configurator.catalog_snapshot(id) on delete cascade,
  model_id bigint,
  operating_point_id bigint,
  severity text not null,
  rule_code text not null,
  message text not null,
  observed text,
  expected text,
  restriction text,
  source_ref_id bigint not null
    references configurator.source_ref(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint motor_validation_issue_model_fk
    foreign key (snapshot_id, model_id)
    references configurator.motor_model(snapshot_id, id)
    on delete cascade,
  constraint motor_validation_issue_operating_fk
    foreign key (snapshot_id, operating_point_id)
    references configurator.motor_operating_point(snapshot_id, id)
    on delete cascade,
  constraint motor_validation_issue_target_check
    check (num_nonnulls(model_id, operating_point_id) >= 1),
  constraint motor_validation_issue_severity_check
    check (severity in ('error', 'warning', 'info')),
  constraint motor_validation_issue_rule_code_check
    check (
      rule_code = upper(btrim(rule_code))
      and rule_code ~ '^[A-Z0-9_]+$'
    ),
  constraint motor_validation_issue_message_check
    check (message = btrim(message) and char_length(message) between 1 and 2000)
);

create index motor_validation_issue_model_idx
  on configurator.motor_validation_issue (snapshot_id, model_id)
  where model_id is not null;

create index motor_validation_issue_operating_idx
  on configurator.motor_validation_issue (snapshot_id, operating_point_id)
  where operating_point_id is not null;

create index motor_validation_issue_source_ref_idx
  on configurator.motor_validation_issue (source_ref_id);

create or replace function private.configurator_enforce_motor_supply_mode()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  v_snapshot_id uuid;
  v_model_id bigint;
  v_technology text;
begin
  if tg_table_name = 'motor_model' then
    if tg_op = 'DELETE' then
      v_snapshot_id := old.snapshot_id;
      v_model_id := old.id;
    else
      v_snapshot_id := new.snapshot_id;
      v_model_id := new.id;
    end if;
  elsif tg_op = 'DELETE' then
    v_snapshot_id := old.snapshot_id;
    v_model_id := old.model_id;
  else
    v_snapshot_id := new.snapshot_id;
    v_model_id := new.model_id;
  end if;

  select m.motor_technology
    into v_technology
  from configurator.motor_model m
  where m.snapshot_id = v_snapshot_id
    and m.id = v_model_id;

  if v_technology is distinct from 'asynchronous' then
    if not exists (
      select 1
      from configurator.motor_operating_point op
      where op.snapshot_id = v_snapshot_id
        and op.model_id = v_model_id
        and op.supply_mode = 'vfd'
    ) then
      raise exception
        'CONFIGURATOR_SYNC_REQUIRES_VFD: un moteur synchrone requiert au moins un point vfd';
    end if;

    if exists (
      select 1
      from configurator.motor_operating_point op
      where op.snapshot_id = v_snapshot_id
        and op.model_id = v_model_id
        and op.supply_mode <> 'vfd'
    ) then
      raise exception
        'CONFIGURATOR_SYNC_REQUIRES_VFD: un moteur synchrone ne peut porter qu un point vfd';
    end if;
  end if;

  return null;
end;
$function$;

revoke all on function private.configurator_enforce_motor_supply_mode()
  from public, anon, authenticated;

create constraint trigger motor_model_supply_mode_constraint
after insert or update of motor_technology
on configurator.motor_model
deferrable initially deferred
for each row execute function private.configurator_enforce_motor_supply_mode();

create constraint trigger motor_operating_point_supply_mode_constraint
after insert or update or delete
on configurator.motor_operating_point
deferrable initially deferred
for each row execute function private.configurator_enforce_motor_supply_mode();
