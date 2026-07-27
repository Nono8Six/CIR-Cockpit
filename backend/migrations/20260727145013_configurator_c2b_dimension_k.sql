-- Configurateurs C2b - K devient la cote canonique du diametre de trou de pied.
-- La migration ne fabrique aucune valeur : elle ne fait que mapper les lignes K
-- deja publiees et sourcees.

begin;

alter table configurator.motor_dimension_canonical
  drop constraint motor_dimension_canonical_code_check;

alter table configurator.motor_dimension_canonical
  add constraint motor_dimension_canonical_code_check
  check (code in ('A', 'B', 'C', 'H', 'K', 'D', 'E', 'F', 'M', 'N', 'P', 'S', 'T', 'Z'));

insert into configurator.motor_dimension_canonical (
  code,
  vocabulary_version,
  label_fr,
  criterion_enabled
) values (
  'K',
  1,
  'Diametre du trou de fixation du pied',
  true
)
on conflict (vocabulary_version, code) do update
set
  label_fr = excluded.label_fr,
  criterion_enabled = excluded.criterion_enabled;

do $migration$
declare
  v_existing_unmapped bigint;
begin
  select count(*)
  into v_existing_unmapped
  from configurator.motor_dimension
  where published_code_verbatim = 'K'
    and canonical_code is null;

  if v_existing_unmapped not in (0, 540) then
    raise exception
      'C2b K refuse : 0 ou 540 lignes sourcees attendues avant reprise, % observees',
      v_existing_unmapped;
  end if;
end
$migration$;

update configurator.motor_dimension_definition
set
  base_published_code = 'K',
  canonical_vocabulary_version = 1,
  canonical_code = 'K',
  mapping_status = 'mapped'
where published_code = 'K'
  and canonical_code is null;

update configurator.motor_dimension as dimension
set
  canonical_vocabulary_version = 1,
  canonical_code = 'K'
from configurator.motor_dimension_definition as definition
where definition.snapshot_id = dimension.snapshot_id
  and definition.id = dimension.definition_id
  and definition.published_code = 'K'
  and dimension.published_code_verbatim = 'K'
  and dimension.canonical_code is null;

do $migration$
declare
  v_unmapped bigint;
  v_mapped bigint;
begin
  select count(*)
  into v_unmapped
  from configurator.motor_dimension
  where published_code_verbatim = 'K'
    and canonical_code is null;

  select count(*)
  into v_mapped
  from configurator.motor_dimension
  where published_code_verbatim = 'K'
    and canonical_vocabulary_version = 1
    and canonical_code = 'K';

  if v_unmapped <> 0 then
    raise exception 'C2b K refuse : % lignes K restent non mappees', v_unmapped;
  end if;

  if v_mapped not in (0, 540) then
    raise exception
      'C2b K refuse : 0 ou 540 lignes K mappees attendues, % observees',
      v_mapped;
  end if;
end
$migration$;

comment on column configurator.motor_dimension.canonical_code is
  'Code canonique C0. K designe le diametre catalogue du trou de pied ; il ne vaut ni diametre reel du boulon ni course disponible du bati.';

commit;
