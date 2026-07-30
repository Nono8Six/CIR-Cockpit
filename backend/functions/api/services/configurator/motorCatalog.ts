import type {
  MotorCatalogGetInput,
  MotorCatalogGetResponse,
  MotorCatalogListInput,
  MotorCatalogListResponse
} from '../../../../../shared/schemas/configurator/motor.schema.ts';
import {
  safeParseMotorCatalogGetInput,
  safeParseMotorCatalogGetOutput,
  safeParseMotorCatalogListInput,
  safeParseMotorCatalogListOutput
} from '../../../../../shared/schemas/configurator/motor.schema.ts';
import type { ConfiguratorEvidence, DataGrade } from '../../../../../shared/schemas/configurator/common.schema.ts';
import type { AuthContext } from '../../types.ts';
import {
  configuratorFlangeOptionNotFound,
  configuratorInvalidPayload,
  configuratorOperatingPointNotFound,
  configuratorOutputInvalid,
  configuratorSnapshotUnavailable
} from './configuratorErrors.ts';
import {
  runConfiguratorReadOnly,
  type ConfiguratorReadOperation,
  type ConfiguratorReadTransaction
} from './configuratorReadExecutor.ts';
import { normalizeMotorCatalog } from './motorCatalogNormalization.ts';

type ReadOnlyRunner = <T>(
  authContext: AuthContext,
  operation: ConfiguratorReadOperation<T>
) => Promise<T>;

type SourceRow = {
  source_document_id: string;
  source_filename: string;
  source_sha256: string;
  source_pdf_page: number;
  source_catalog_page: string | null;
  source_extraction_method: string;
  source_verified_by: string | null;
  source_verified_at: string | null;
};

type SnapshotRow = {
  snapshot_id: string;
  snapshot_label: string;
  snapshot_activated_at: string;
};

type ListRow = SnapshotRow & {
  model_id: string;
  model_key: string;
  brand: string;
  series: string | null;
  designation: string;
  lifecycle: 'current' | 'legacy';
  operating_point_id: string;
  variant_key: string | null;
  power_kw: number;
  rated_speed_rpm: number;
  frequency_hz: number;
  poles: 2 | 4 | 6 | 8 | 10 | 12;
  supply_mode: 'mains' | 'vfd';
  efficiency_class: 'IE1' | 'IE2' | 'IE3' | 'IE4' | 'IE5' | null;
  model_source_document_id: string;
  model_source_filename: string;
  model_source_sha256: string;
  model_source_pdf_page: number;
  model_source_catalog_page: string | null;
  model_source_extraction_method: string;
  model_source_verified_by: string | null;
  model_source_verified_at: string | null;
  point_source_document_id: string;
  point_source_filename: string;
  point_source_sha256: string;
  point_source_pdf_page: number;
  point_source_catalog_page: string | null;
  point_source_extraction_method: string;
  point_source_verified_by: string | null;
  point_source_verified_at: string | null;
};

type DetailRow = SnapshotRow & SourceRow & {
  model_id: string;
  model_key: string;
  brand: string;
  series: string | null;
  designation: string;
  article_no: string | null;
  pole_config: string;
  motor_technology: 'asynchronous' | 'PMaSynRM' | 'SynRM' | 'PM';
  casing_material: 'aluminium' | 'cast-iron' | 'steel' | null;
  protection_ip: string | null;
  frame_size: number | null;
  frame_letter: string | null;
  shaft_spec: string | null;
  inertia_kgm2: number | null;
  mass_kg: number | null;
  mass_mounting: 'B3' | 'B5' | 'B14' | 'B34' | 'B35' | 'V1' | null;
  lifecycle: 'current' | 'legacy';
  requires_vfd: boolean;
  is_iec_standard: boolean;
  article_no_status: 'published' | 'not_published_in_source';
  operating_point_id: string;
  variant_key: string | null;
  poles: 2 | 4 | 6 | 8 | 10 | 12;
  supply_mode: 'mains' | 'vfd';
  frequency_hz: number;
  voltage_v: number | null;
  coupling: 'Y' | 'D' | null;
  rated_speed_rpm: number;
  power_kw: number;
  efficiency_class: 'IE1' | 'IE2' | 'IE3' | 'IE4' | 'IE5' | null;
  efficiency_standard: string | null;
  rated_torque_nm: number | null;
  rated_current_a: number | null;
  max_current_a: number | null;
  max_torque_nm: number | null;
  noise_db: number | null;
  cos_phi: number | null;
  starting_torque_ratio: number | null;
  starting_current_ratio: number | null;
  breakdown_torque_ratio: number | null;
  point_source_document_id: string;
  point_source_filename: string;
  point_source_sha256: string;
  point_source_pdf_page: number;
  point_source_catalog_page: string | null;
  point_source_extraction_method: string;
  point_source_verified_by: string | null;
  point_source_verified_at: string | null;
};

type EfficiencyRow = SourceRow & {
  id: string;
  load_fraction: number;
  efficiency_pct: number;
  cos_phi: number | null;
};

type TorqueRow = SourceRow & {
  id: string;
  at_frequency_hz: number;
  torque_nm: number;
};

type DimensionRow = SourceRow & {
  id: string;
  definition_id: string;
  mounting: 'B3' | 'B5' | 'B14' | 'B34' | 'B35' | 'V1' | 'ANY';
  polarity: number | null;
  published_code: string;
  base_published_code: string | null;
  canonical_code: 'A' | 'B' | 'C' | 'H' | 'K' | 'D' | 'E' | 'F' | 'M' | 'N' | 'P' | 'S' | 'T' | 'Z' | null;
  mapping_status: 'mapped' | 'unmapped' | 'header_contamination';
  variant_context: string | null;
  value_mm: number | null;
  value_text: string | null;
};

type FlangeRow = SourceRow & {
  id: string;
  mounting: 'B5' | 'B14' | 'B34' | 'B35';
  role: 'standard' | 'larger' | 'smaller';
  order_code: string | null;
  flange_ref: string | null;
  din_ref: string | null;
  bore_type: 'through' | 'tapped';
  dim_m_mm: number | null;
  dim_n_mm: number | null;
  dim_p_mm: number | null;
  dim_s_mm: number | null;
  dim_s_thread: string | null;
  dim_t_mm: number | null;
  dim_la_mm: number | null;
  dim_le_mm: number | null;
  holes: number | null;
};

type BrakeRow = SourceRow & {
  id: string;
  brake_type: string;
  brake_torque_nm: number;
  order_code: string | null;
};

type IssueRow = SourceRow & {
  model_id: string | null;
  operating_point_id: string | null;
  severity: 'error' | 'warning' | 'info';
  rule_code: string;
  message: string;
  restriction: string | null;
};

const sourceFromPrefix = (
  row: Record<string, unknown>,
  prefix: 'model_' | 'point_' | ''
): SourceRow => ({
  source_document_id: String(row[`${prefix}source_document_id`]),
  source_filename: String(row[`${prefix}source_filename`]),
  source_sha256: String(row[`${prefix}source_sha256`]),
  source_pdf_page: Number(row[`${prefix}source_pdf_page`]),
  source_catalog_page: row[`${prefix}source_catalog_page`] === null
    ? null
    : String(row[`${prefix}source_catalog_page`]),
  source_extraction_method: String(row[`${prefix}source_extraction_method`]),
  source_verified_by: row[`${prefix}source_verified_by`] === null
    ? null
    : String(row[`${prefix}source_verified_by`]),
  source_verified_at: row[`${prefix}source_verified_at`] === null
    ? null
    : String(row[`${prefix}source_verified_at`])
});

export const catalogEvidence = (source: SourceRow): ConfiguratorEvidence[] => [{
  kind: 'source_page',
  label: source.source_filename,
  source_document_id: source.source_document_id,
  filename: source.source_filename,
  sha256: source.source_sha256,
  pdf_page: source.source_pdf_page,
  catalog_page: source.source_catalog_page,
  extraction_method: source.source_extraction_method
}];

export const catalogDataGrade = (source: SourceRow): DataGrade => {
  if (source.source_extraction_method === 'computed') return 'C';
  if (source.source_verified_by !== null && source.source_verified_at !== null) return 'A';
  return 'B';
};

const worstGrade = (...grades: DataGrade[]): DataGrade => {
  const order: readonly DataGrade[] = ['A', 'B', 'C', 'D'];
  return grades.reduce((worst, grade) =>
    order.indexOf(grade) > order.indexOf(worst) ? grade : worst
  , 'A');
};

const snapshotFrom = (row: SnapshotRow) => ({
  id: row.snapshot_id,
  label: row.snapshot_label,
  activated_at: new Date(row.snapshot_activated_at).toISOString()
});

const parseInput = <T>(
  result: { success: true; data: T } | { success: false; error: unknown }
): T => {
  if (!result.success) throw configuratorInvalidPayload(result.error);
  return result.data;
};

const activeSnapshot = async (
  transaction: ConfiguratorReadTransaction
): Promise<SnapshotRow> => {
  const rows = await transaction<SnapshotRow>`
    select
      snapshot.id::text as snapshot_id,
      snapshot.label as snapshot_label,
      snapshot.activated_at::text as snapshot_activated_at
    from configurator.catalog_snapshot as snapshot
    where snapshot.domain = 'motor'
      and snapshot.is_active is true
      and snapshot.status = 'active'
      and snapshot.activation_gate_status = 'passed'
    order by snapshot.activated_at desc
    limit 1
  `;
  if (rows.length !== 1) throw configuratorSnapshotUnavailable();
  return rows[0];
};

const listInTransaction = async (
  transaction: ConfiguratorReadTransaction,
  input: MotorCatalogListInput,
  requestId: string
): Promise<MotorCatalogListResponse> => {
  const snapshot = await activeSnapshot(transaction);
  const rows = await transaction<ListRow>`
    select
      snapshot.id::text as snapshot_id,
      snapshot.label as snapshot_label,
      snapshot.activated_at::text as snapshot_activated_at,
      model.id::text as model_id,
      model.model_key,
      model.brand,
      model.series,
      model.designation,
      model.lifecycle,
      point.id::text as operating_point_id,
      point.variant_key,
      point.power_kw::double precision as power_kw,
      point.rated_speed_rpm::double precision as rated_speed_rpm,
      point.frequency_hz::double precision as frequency_hz,
      point.poles,
      point.supply_mode,
      point.efficiency_class,
      model_document.id::text as model_source_document_id,
      model_document.filename as model_source_filename,
      model_document.sha256 as model_source_sha256,
      model_source.pdf_page as model_source_pdf_page,
      model_source.catalog_page as model_source_catalog_page,
      model_source.extraction_method as model_source_extraction_method,
      model_source.verified_by::text as model_source_verified_by,
      model_source.verified_at::text as model_source_verified_at,
      point_document.id::text as point_source_document_id,
      point_document.filename as point_source_filename,
      point_document.sha256 as point_source_sha256,
      point_source.pdf_page as point_source_pdf_page,
      point_source.catalog_page as point_source_catalog_page,
      point_source.extraction_method as point_source_extraction_method,
      point_source.verified_by::text as point_source_verified_by,
      point_source.verified_at::text as point_source_verified_at
    from configurator.catalog_snapshot as snapshot
    join configurator.motor_operating_point as point
      on point.snapshot_id = snapshot.id
    join configurator.motor_model as model
      on model.snapshot_id = snapshot.id
      and model.id = point.model_id
    join configurator.source_ref as model_source on model_source.id = model.source_ref_id
    join configurator.source_document as model_document
      on model_document.id = model_source.document_id
    join configurator.source_ref as point_source on point_source.id = point.source_ref_id
    join configurator.source_document as point_document
      on point_document.id = point_source.document_id
    where snapshot.id = ${snapshot.snapshot_id}::uuid
      and snapshot.domain = 'motor'
      and snapshot.is_active is true
      and snapshot.status = 'active'
      and snapshot.activation_gate_status = 'passed'
      and (${input.cursor ?? null}::bigint is null or point.id > ${input.cursor ?? null}::bigint)
      and (
        ${input.search ?? null}::text is null
        or model.brand ilike concat('%', ${input.search ?? null}::text, '%')
        or model.designation ilike concat('%', ${input.search ?? null}::text, '%')
        or model.model_key ilike concat('%', ${input.search ?? null}::text, '%')
      )
      and (${input.brand ?? null}::text is null or model.brand = ${input.brand ?? null}::text)
      and (${input.power_kw ?? null}::numeric is null or point.power_kw = ${input.power_kw ?? null}::numeric)
      and (${input.poles ?? null}::integer is null or point.poles = ${input.poles ?? null}::integer)
      and (${input.supply_mode ?? null}::text is null or point.supply_mode = ${input.supply_mode ?? null}::text)
      and (${input.frequency_hz ?? null}::numeric is null or point.frequency_hz = ${input.frequency_hz ?? null}::numeric)
    order by point.id asc
    limit ${input.limit + 1}
  `;

  const page = rows.slice(0, input.limit);
  const output = {
    request_id: requestId,
    snapshot: snapshotFrom(snapshot),
    items: page.map((row) => {
      const modelSource = sourceFromPrefix(row as unknown as Record<string, unknown>, 'model_');
      const pointSource = sourceFromPrefix(row as unknown as Record<string, unknown>, 'point_');
      return {
        candidate: {
          model_id: row.model_id,
          model_key: row.model_key,
          operating_point_id: row.operating_point_id,
          brand: row.brand,
          series: row.series,
          designation: row.designation,
          variant_key: row.variant_key,
          power_kw: row.power_kw,
          rated_speed_rpm: row.rated_speed_rpm,
          frequency_hz: row.frequency_hz,
          poles: row.poles,
          supply_mode: row.supply_mode,
          efficiency_class: row.efficiency_class,
          lifecycle: row.lifecycle,
          data_grade: worstGrade(catalogDataGrade(modelSource), catalogDataGrade(pointSource))
        },
        model_evidence: catalogEvidence(modelSource),
        operating_point_evidence: catalogEvidence(pointSource)
      };
    }),
    next_cursor: rows.length > input.limit
      ? page.at(-1)?.operating_point_id ?? null
      : null
  };
  const parsed = safeParseMotorCatalogListOutput(output);
  if (!parsed.success) throw configuratorOutputInvalid(parsed.error);
  return parsed.data;
};

const detailInTransaction = async (
  transaction: ConfiguratorReadTransaction,
  input: MotorCatalogGetInput,
  requestId: string
): Promise<MotorCatalogGetResponse> => {
  const snapshot = await activeSnapshot(transaction);
  const rows = await transaction<DetailRow>`
    select
      snapshot.id::text as snapshot_id,
      snapshot.label as snapshot_label,
      snapshot.activated_at::text as snapshot_activated_at,
      model.id::text as model_id,
      model.model_key,
      model.brand,
      model.series,
      model.designation,
      model.article_no,
      model.pole_config,
      model.motor_technology,
      model.casing_material,
      model.protection_ip,
      model.frame_size,
      model.frame_letter,
      model.shaft_spec,
      model.inertia_kgm2::double precision as inertia_kgm2,
      model.mass_kg::double precision as mass_kg,
      model.mass_mounting,
      model.lifecycle,
      model.requires_vfd,
      model.is_iec_standard,
      model.article_no_status,
      point.id::text as operating_point_id,
      point.variant_key,
      point.poles,
      point.supply_mode,
      point.frequency_hz::double precision as frequency_hz,
      point.voltage_v::double precision as voltage_v,
      point.coupling,
      point.rated_speed_rpm::double precision as rated_speed_rpm,
      point.power_kw::double precision as power_kw,
      point.efficiency_class,
      point.efficiency_standard,
      point.rated_torque_nm::double precision as rated_torque_nm,
      point.rated_current_a::double precision as rated_current_a,
      point.max_current_a::double precision as max_current_a,
      point.max_torque_nm::double precision as max_torque_nm,
      point.noise_db::double precision as noise_db,
      point.cos_phi::double precision as cos_phi,
      point.starting_torque_ratio::double precision as starting_torque_ratio,
      point.starting_current_ratio::double precision as starting_current_ratio,
      point.breakdown_torque_ratio::double precision as breakdown_torque_ratio,
      model_document.id::text as source_document_id,
      model_document.filename as source_filename,
      model_document.sha256 as source_sha256,
      model_source.pdf_page as source_pdf_page,
      model_source.catalog_page as source_catalog_page,
      model_source.extraction_method as source_extraction_method,
      model_source.verified_by::text as source_verified_by,
      model_source.verified_at::text as source_verified_at,
      point_document.id::text as point_source_document_id,
      point_document.filename as point_source_filename,
      point_document.sha256 as point_source_sha256,
      point_source.pdf_page as point_source_pdf_page,
      point_source.catalog_page as point_source_catalog_page,
      point_source.extraction_method as point_source_extraction_method,
      point_source.verified_by::text as point_source_verified_by,
      point_source.verified_at::text as point_source_verified_at
    from configurator.catalog_snapshot as snapshot
    join configurator.motor_operating_point as point
      on point.snapshot_id = snapshot.id
      and point.id = ${input.operating_point_id}::bigint
    join configurator.motor_model as model
      on model.snapshot_id = snapshot.id
      and model.id = point.model_id
    join configurator.source_ref as model_source on model_source.id = model.source_ref_id
    join configurator.source_document as model_document
      on model_document.id = model_source.document_id
    join configurator.source_ref as point_source on point_source.id = point.source_ref_id
    join configurator.source_document as point_document
      on point_document.id = point_source.document_id
    where snapshot.id = ${snapshot.snapshot_id}::uuid
      and snapshot.domain = 'motor'
      and snapshot.is_active is true
      and snapshot.status = 'active'
      and snapshot.activation_gate_status = 'passed'
    limit 1
  `;
  if (rows.length !== 1) throw configuratorOperatingPointNotFound();
  const row = rows[0];

  const [efficiencyRows, torqueRows, dimensionRows, flangeRows, brakeRows, issueRows] =
    await Promise.all([
      loadEfficiency(transaction, snapshot.snapshot_id, row.operating_point_id),
      loadTorque(transaction, snapshot.snapshot_id, row.operating_point_id),
      loadDimensions(transaction, snapshot.snapshot_id, row.model_id),
      loadFlanges(transaction, snapshot.snapshot_id, row.model_id),
      loadBrakes(transaction, snapshot.snapshot_id, row.model_id),
      loadIssues(transaction, snapshot.snapshot_id, row.model_id, row.operating_point_id)
    ]);

  if (
    input.flange_option_id
    && !flangeRows.some((flange) =>
      flange.id === input.flange_option_id && flange.mounting === input.mounting
    )
  ) {
    throw configuratorFlangeOptionNotFound();
  }

  const modelSource = sourceFromPrefix(row as unknown as Record<string, unknown>, '');
  const pointSource = sourceFromPrefix(row as unknown as Record<string, unknown>, 'point_');
  const model = {
    id: row.model_id,
    model_key: row.model_key,
    brand: row.brand,
    series: row.series,
    designation: row.designation,
    article_no: row.article_no,
    pole_config: row.pole_config,
    motor_technology: row.motor_technology,
    casing_material: row.casing_material,
    protection_ip: row.protection_ip,
    frame_size: row.frame_size,
    frame_letter: row.frame_letter,
    shaft_spec: row.shaft_spec,
    inertia_kgm2: row.inertia_kgm2,
    mass_kg: row.mass_kg,
    mass_mounting: row.mass_mounting,
    lifecycle: row.lifecycle,
    requires_vfd: row.requires_vfd,
    is_iec_standard: row.is_iec_standard,
    article_no_status: row.article_no_status,
    data_grade: catalogDataGrade(modelSource),
    evidence: catalogEvidence(modelSource)
  };
  const operatingPoint = {
    id: row.operating_point_id,
    variant_key: row.variant_key,
    poles: row.poles,
    supply_mode: row.supply_mode,
    frequency_hz: row.frequency_hz,
    voltage_v: row.voltage_v,
    coupling: row.coupling,
    rated_speed_rpm: row.rated_speed_rpm,
    power_kw: row.power_kw,
    efficiency_class: row.efficiency_class,
    efficiency_standard: row.efficiency_standard,
    rated_torque_nm: row.rated_torque_nm,
    rated_current_a: row.rated_current_a,
    max_current_a: row.max_current_a,
    max_torque_nm: row.max_torque_nm,
    noise_db: row.noise_db,
    cos_phi: row.cos_phi,
    starting_torque_ratio: row.starting_torque_ratio,
    starting_current_ratio: row.starting_current_ratio,
    breakdown_torque_ratio: row.breakdown_torque_ratio,
    data_grade: catalogDataGrade(pointSource),
    evidence: catalogEvidence(pointSource)
  };
  const normalized = normalizeMotorCatalog({
    snapshotId: snapshot.snapshot_id,
    model,
    operatingPoint,
    dimensions: dimensionRows,
    flangeOptions: flangeRows,
    selection: input
  });
  const output = {
    request_id: requestId,
    snapshot: snapshotFrom(snapshot),
    model,
    operating_point: operatingPoint,
    efficiency_points: efficiencyRows,
    torque_points: torqueRows,
    dimensions: dimensionRows,
    flange_options: flangeRows,
    brake_options: brakeRows,
    issues: issueRows,
    from_motor_spec: normalized.spec,
    normalization: normalized.normalization
  };
  const parsed = safeParseMotorCatalogGetOutput(output);
  if (!parsed.success) throw configuratorOutputInvalid(parsed.error);
  return parsed.data;
};

const loadEfficiency = async (
  transaction: ConfiguratorReadTransaction,
  snapshotId: string,
  operatingPointId: string
) => mapSourcedRows(await transaction<EfficiencyRow>`
  select point.id::text, point.load_fraction::double precision,
    point.efficiency_pct::double precision, point.cos_phi::double precision,
    document.id::text as source_document_id, document.filename as source_filename,
    document.sha256 as source_sha256, source.pdf_page as source_pdf_page,
    source.catalog_page as source_catalog_page,
    source.extraction_method as source_extraction_method,
    source.verified_by::text as source_verified_by,
    source.verified_at::text as source_verified_at
  from configurator.catalog_snapshot snapshot
  join configurator.motor_efficiency_point point on point.snapshot_id = snapshot.id
  join configurator.source_ref source on source.id = point.source_ref_id
  join configurator.source_document document on document.id = source.document_id
  where snapshot.id = ${snapshotId}::uuid and snapshot.is_active is true
    and snapshot.status = 'active' and snapshot.activation_gate_status = 'passed'
    and point.operating_point_id = ${operatingPointId}::bigint
  order by point.load_fraction asc
`, (row, grade, evidence) => ({
  id: row.id,
  load_fraction: row.load_fraction,
  efficiency_pct: row.efficiency_pct,
  cos_phi: row.cos_phi,
  data_grade: grade,
  evidence
}));

const loadTorque = async (
  transaction: ConfiguratorReadTransaction,
  snapshotId: string,
  operatingPointId: string
) => mapSourcedRows(await transaction<TorqueRow>`
  select point.id::text, point.at_frequency_hz::double precision,
    point.torque_nm::double precision,
    document.id::text as source_document_id, document.filename as source_filename,
    document.sha256 as source_sha256, source.pdf_page as source_pdf_page,
    source.catalog_page as source_catalog_page,
    source.extraction_method as source_extraction_method,
    source.verified_by::text as source_verified_by,
    source.verified_at::text as source_verified_at
  from configurator.catalog_snapshot snapshot
  join configurator.motor_torque_point point on point.snapshot_id = snapshot.id
  join configurator.source_ref source on source.id = point.source_ref_id
  join configurator.source_document document on document.id = source.document_id
  where snapshot.id = ${snapshotId}::uuid and snapshot.is_active is true
    and snapshot.status = 'active' and snapshot.activation_gate_status = 'passed'
    and point.operating_point_id = ${operatingPointId}::bigint
  order by point.at_frequency_hz asc
`, (row, grade, evidence) => ({
  id: row.id,
  at_frequency_hz: row.at_frequency_hz,
  torque_nm: row.torque_nm,
  data_grade: grade,
  evidence
}));

const loadDimensions = async (
  transaction: ConfiguratorReadTransaction,
  snapshotId: string,
  modelId: string
) => mapSourcedRows(await transaction<DimensionRow>`
  select dimension.id::text, dimension.definition_id::text, dimension.mounting,
    dimension.polarity, definition.published_code,
    definition.base_published_code, definition.canonical_code,
    definition.mapping_status, dimension.variant_context,
    dimension.value_mm::double precision, dimension.value_text,
    document.id::text as source_document_id, document.filename as source_filename,
    document.sha256 as source_sha256, source.pdf_page as source_pdf_page,
    source.catalog_page as source_catalog_page,
    source.extraction_method as source_extraction_method,
    source.verified_by::text as source_verified_by,
    source.verified_at::text as source_verified_at
  from configurator.catalog_snapshot snapshot
  join configurator.motor_dimension dimension on dimension.snapshot_id = snapshot.id
  join configurator.motor_dimension_definition definition
    on definition.snapshot_id = snapshot.id and definition.id = dimension.definition_id
  join configurator.source_ref source on source.id = dimension.source_ref_id
  join configurator.source_document document on document.id = source.document_id
  where snapshot.id = ${snapshotId}::uuid and snapshot.is_active is true
    and snapshot.status = 'active' and snapshot.activation_gate_status = 'passed'
    and dimension.model_id = ${modelId}::bigint
  order by dimension.id asc
`, (row, grade, evidence) => ({
  id: row.id,
  definition_id: row.definition_id,
  mounting: row.mounting,
  polarity: row.polarity,
  published_code: row.published_code,
  base_published_code: row.base_published_code,
  canonical_code: row.canonical_code,
  mapping_status: row.mapping_status,
  variant_context: row.variant_context,
  value_mm: row.value_mm,
  value_text: row.value_text,
  data_grade: grade,
  evidence
}));

const loadFlanges = async (
  transaction: ConfiguratorReadTransaction,
  snapshotId: string,
  modelId: string
) => mapSourcedRows(await transaction<FlangeRow>`
  select flange.id::text, flange.mounting, flange.role, flange.order_code,
    flange.flange_ref, flange.din_ref, flange.bore_type,
    flange.dim_m_mm::double precision, flange.dim_n_mm::double precision,
    flange.dim_p_mm::double precision, flange.dim_s_mm::double precision,
    flange.dim_s_thread, flange.dim_t_mm::double precision,
    flange.dim_la_mm::double precision, flange.dim_le_mm::double precision,
    flange.holes,
    document.id::text as source_document_id, document.filename as source_filename,
    document.sha256 as source_sha256, source.pdf_page as source_pdf_page,
    source.catalog_page as source_catalog_page,
    source.extraction_method as source_extraction_method,
    source.verified_by::text as source_verified_by,
    source.verified_at::text as source_verified_at
  from configurator.catalog_snapshot snapshot
  join configurator.motor_flange_option flange on flange.snapshot_id = snapshot.id
  join configurator.source_ref source on source.id = flange.source_ref_id
  join configurator.source_document document on document.id = source.document_id
  where snapshot.id = ${snapshotId}::uuid and snapshot.is_active is true
    and snapshot.status = 'active' and snapshot.activation_gate_status = 'passed'
    and flange.model_id = ${modelId}::bigint
  order by flange.id asc
`, (row, grade, evidence) => ({
  id: row.id,
  mounting: row.mounting,
  role: row.role,
  order_code: row.order_code,
  flange_ref: row.flange_ref,
  din_ref: row.din_ref,
  bore_type: row.bore_type,
  dim_m_mm: row.dim_m_mm,
  dim_n_mm: row.dim_n_mm,
  dim_p_mm: row.dim_p_mm,
  dim_s_mm: row.dim_s_mm,
  dim_s_thread: row.dim_s_thread,
  dim_t_mm: row.dim_t_mm,
  dim_la_mm: row.dim_la_mm,
  dim_le_mm: row.dim_le_mm,
  holes: row.holes,
  requires_option: row.role !== 'standard',
  data_grade: grade,
  evidence
}));

const loadBrakes = async (
  transaction: ConfiguratorReadTransaction,
  snapshotId: string,
  modelId: string
) => mapSourcedRows(await transaction<BrakeRow>`
  select brake.id::text, brake.brake_type,
    brake.brake_torque_nm::double precision, brake.order_code,
    document.id::text as source_document_id, document.filename as source_filename,
    document.sha256 as source_sha256, source.pdf_page as source_pdf_page,
    source.catalog_page as source_catalog_page,
    source.extraction_method as source_extraction_method,
    source.verified_by::text as source_verified_by,
    source.verified_at::text as source_verified_at
  from configurator.catalog_snapshot snapshot
  join configurator.motor_brake_option brake on brake.snapshot_id = snapshot.id
  join configurator.source_ref source on source.id = brake.source_ref_id
  join configurator.source_document document on document.id = source.document_id
  where snapshot.id = ${snapshotId}::uuid and snapshot.is_active is true
    and snapshot.status = 'active' and snapshot.activation_gate_status = 'passed'
    and brake.model_id = ${modelId}::bigint
  order by brake.id asc
`, (row, grade, evidence) => ({
  id: row.id,
  brake_type: row.brake_type,
  brake_torque_nm: row.brake_torque_nm,
  order_code: row.order_code,
  data_grade: grade,
  evidence
}));

const loadIssues = async (
  transaction: ConfiguratorReadTransaction,
  snapshotId: string,
  modelId: string,
  operatingPointId: string
) => mapSourcedRows(await transaction<IssueRow>`
  select issue.model_id::text, issue.operating_point_id::text,
    issue.severity, issue.rule_code, issue.message, issue.restriction,
    document.id::text as source_document_id, document.filename as source_filename,
    document.sha256 as source_sha256, source.pdf_page as source_pdf_page,
    source.catalog_page as source_catalog_page,
    source.extraction_method as source_extraction_method,
    source.verified_by::text as source_verified_by,
    source.verified_at::text as source_verified_at
  from configurator.catalog_snapshot snapshot
  join configurator.motor_validation_issue issue on issue.snapshot_id = snapshot.id
  join configurator.source_ref source on source.id = issue.source_ref_id
  join configurator.source_document document on document.id = source.document_id
  where snapshot.id = ${snapshotId}::uuid and snapshot.is_active is true
    and snapshot.status = 'active' and snapshot.activation_gate_status = 'passed'
    and (issue.model_id = ${modelId}::bigint
      or issue.operating_point_id = ${operatingPointId}::bigint)
  order by issue.id asc
`, (row, _grade, evidence) => ({
  model_id: row.model_id,
  operating_point_id: row.operating_point_id,
  severity: row.severity,
  code: row.rule_code,
  message: row.message,
  restriction: row.restriction,
  evidence
}));

const mapSourcedRows = <TRow extends SourceRow, TOutput>(
  rows: readonly TRow[],
  mapper: (
    row: TRow,
    grade: DataGrade,
    evidence: ConfiguratorEvidence[]
  ) => TOutput
): TOutput[] => rows.map((row) =>
  mapper(row, catalogDataGrade(row), catalogEvidence(row))
);

export const createMotorCatalogService = (
  runReadOnly: ReadOnlyRunner
) => ({
  list: async (
    authContext: AuthContext,
    rawInput: unknown,
    requestId: string
  ): Promise<MotorCatalogListResponse> => {
    const input = parseInput(safeParseMotorCatalogListInput(rawInput));
    return await runReadOnly(
      authContext,
      (transaction) => listInTransaction(transaction, input, requestId)
    );
  },
  get: async (
    authContext: AuthContext,
    rawInput: unknown,
    requestId: string
  ): Promise<MotorCatalogGetResponse> => {
    const input = parseInput(safeParseMotorCatalogGetInput(rawInput));
    return await runReadOnly(
      authContext,
      (transaction) => detailInTransaction(transaction, input, requestId)
    );
  }
});

export const motorCatalogService = createMotorCatalogService(runConfiguratorReadOnly);
