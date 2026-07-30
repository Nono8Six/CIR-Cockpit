import type {
  MotorCatalogDimension,
  MotorCatalogGetResponse,
  MotorCatalogListResponse,
} from "../../../../../shared/schemas/configurator/motor.schema.ts";
import type { MotorEfficiencyQualification } from "./motorCatalog.ts";
import { normalizeMotorCatalog } from "./motorCatalogNormalization.ts";

export const C3_TEST_SNAPSHOT_ID = "11111111-1111-4111-8111-111111111111";
export const C3_TEST_REQUEST_ID = "33333333-3333-4333-8333-333333333333";
const DOCUMENT_ID = "22222222-2222-4222-8222-222222222222";

export const c3CatalogEvidence = [{
  kind: "source_page" as const,
  label: "Catalogue constructeur",
  source_document_id: DOCUMENT_ID,
  filename: "catalogue.pdf",
  sha256: "a".repeat(64),
  pdf_page: 42,
  catalog_page: "42",
  extraction_method: "pdfplumber-table",
}];

type DetailOptions = {
  id?: number;
  modelId?: number;
  modelKey?: string;
  brand?: string;
  designation?: string;
  lifecycle?: "current" | "legacy";
  snapshotId?: string;
  snapshotLabel?: string;
  powerKw?: number;
  poles?: 2 | 4 | 6 | 8 | 10 | 12;
  frequencyHz?: number;
  supplyMode?: "mains" | "vfd";
  voltageV?: number | null;
  coupling?: "Y" | "D" | null;
  ratedCurrentA?: number | null;
  ratedTorqueNm?: number | null;
  efficiencyClass?: "IE1" | "IE2" | "IE3" | "IE4" | "IE5" | null;
  efficiencyPoints?: Array<[number, number]>;
  dimensionValues?: Partial<
    Record<
      "A" | "B" | "C" | "H" | "K" | "D" | "E" | "F",
      number
    >
  >;
  missingDimensions?: Array<"A" | "B" | "C" | "H" | "K" | "D" | "E" | "F">;
  massKg?: number | null;
  inertiaKgm2?: number | null;
  noiseDb?: number | null;
  issues?: Array<{
    code: string;
    severity?: "error" | "warning" | "info";
    message?: string;
    restriction?: string | null;
  }>;
};

const defaultDimensions = {
  A: 254,
  B: 210,
  C: 108,
  H: 160,
  K: 18,
  D: 42,
  E: 110,
  F: 12,
} as const;

export const c3CatalogDetail = (
  options: DetailOptions = {},
): MotorCatalogGetResponse => {
  const id = options.id ?? 20;
  const modelId = options.modelId ?? id + 1_000;
  const poles = options.poles ?? 4;
  const dimensionValues = { ...defaultDimensions, ...options.dimensionValues };
  const missing = new Set(options.missingDimensions ?? []);
  const dimensions = (
    Object.entries(dimensionValues) as Array<
      [keyof typeof defaultDimensions, number]
    >
  ).filter(([code]) => !missing.has(code)).map(
    ([code, value], index): MotorCatalogDimension => ({
      id: String(id * 100 + index + 1),
      definition_id: String(id * 100 + index + 101),
      mounting: ["A", "B", "C", "H", "K"].includes(code) ? "B3" : "ANY",
      polarity: poles,
      published_code: code,
      base_published_code: code,
      canonical_code: code,
      mapping_status: "mapped",
      variant_context: null,
      value_mm: value,
      value_text: null,
      data_grade: "B",
      evidence: c3CatalogEvidence,
    }),
  );
  const model: MotorCatalogGetResponse["model"] = {
    id: String(modelId),
    model_key: options.modelKey ?? `brand:model${modelId}:standard`,
    brand: options.brand ?? "Brand",
    series: "Series",
    designation: options.designation ?? `Model ${modelId}`,
    article_no: null,
    pole_config: String(poles),
    motor_technology: "asynchronous",
    casing_material: "cast-iron",
    protection_ip: "IP55",
    frame_size: dimensionValues.H,
    frame_letter: null,
    shaft_spec: null,
    inertia_kgm2: options.inertiaKgm2 === undefined ? 0.4 : options.inertiaKgm2,
    mass_kg: options.massKg === undefined ? 80 : options.massKg,
    mass_mounting: "B3",
    lifecycle: options.lifecycle ?? "current",
    requires_vfd: (options.supplyMode ?? "mains") === "vfd",
    is_iec_standard: true,
    article_no_status: "not_published_in_source",
    data_grade: "B",
    evidence: c3CatalogEvidence,
  };
  const operatingPoint: MotorCatalogGetResponse["operating_point"] = {
    id: String(id),
    variant_key: `variant-${id}`,
    poles,
    supply_mode: options.supplyMode ?? "mains",
    frequency_hz: options.frequencyHz ?? 50,
    voltage_v: options.voltageV === undefined ? 400 : options.voltageV,
    coupling: options.coupling === undefined ? "D" : options.coupling,
    rated_speed_rpm: poles === 4 ? 1_475 : 2_950,
    power_kw: options.powerKw ?? 15,
    efficiency_class: options.efficiencyClass === undefined
      ? "IE4"
      : options.efficiencyClass,
    efficiency_standard: "IEC 60034-30-1",
    rated_torque_nm: options.ratedTorqueNm === undefined
      ? 97
      : options.ratedTorqueNm,
    rated_current_a: options.ratedCurrentA === undefined
      ? 28
      : options.ratedCurrentA,
    max_current_a: null,
    max_torque_nm: null,
    noise_db: options.noiseDb === undefined ? 68 : options.noiseDb,
    cos_phi: 0.85,
    starting_torque_ratio: 2.2,
    starting_current_ratio: 7,
    breakdown_torque_ratio: 2.8,
    data_grade: "B",
    evidence: c3CatalogEvidence,
  };
  const snapshot = {
    id: options.snapshotId ?? C3_TEST_SNAPSHOT_ID,
    label: options.snapshotLabel ?? "Catalogue actif",
    activated_at: "2026-07-28T12:26:35.267Z",
  };
  const normalized = normalizeMotorCatalog({
    snapshotId: snapshot.id,
    model,
    operatingPoint,
    dimensions,
    flangeOptions: [],
    selection: {
      operating_point_id: operatingPoint.id,
      mounting: "B3",
    },
  });
  return {
    request_id: C3_TEST_REQUEST_ID,
    snapshot,
    model,
    operating_point: operatingPoint,
    efficiency_points: (options.efficiencyPoints ?? [
      [0.5, 90],
      [0.75, 92],
      [1, 93],
    ]).map(([loadFraction, efficiencyPct], index) => ({
      id: String(id * 10 + index + 1),
      load_fraction: loadFraction,
      efficiency_pct: efficiencyPct,
      cos_phi: null,
      data_grade: "B",
      evidence: c3CatalogEvidence,
    })),
    torque_points: [],
    dimensions,
    flange_options: [],
    brake_options: [],
    issues: (options.issues ?? []).map((issue) => ({
      model_id: model.id,
      operating_point_id: operatingPoint.id,
      code: issue.code,
      severity: issue.severity ?? "warning",
      message: issue.message ?? `Issue ${issue.code}`,
      restriction: issue.restriction ?? "Verification requise.",
      evidence: c3CatalogEvidence,
    })),
    from_motor_spec: normalized.spec,
    normalization: normalized.normalization,
  };
};

export const c3ListItem = (
  detail: MotorCatalogGetResponse,
): MotorCatalogListResponse["items"][number] => ({
  candidate: {
    model_id: detail.model.id,
    model_key: detail.model.model_key,
    operating_point_id: detail.operating_point.id,
    brand: detail.model.brand,
    series: detail.model.series,
    designation: detail.model.designation,
    variant_key: detail.operating_point.variant_key,
    power_kw: detail.operating_point.power_kw,
    rated_speed_rpm: detail.operating_point.rated_speed_rpm,
    frequency_hz: detail.operating_point.frequency_hz,
    poles: detail.operating_point.poles,
    supply_mode: detail.operating_point.supply_mode,
    efficiency_class: detail.operating_point.efficiency_class,
    lifecycle: detail.model.lifecycle,
    data_grade: detail.operating_point.data_grade,
  },
  model_evidence: detail.model.evidence,
  operating_point_evidence: detail.operating_point.evidence,
});

export const c3Qualification = (
  kind: MotorEfficiencyQualification["kind"],
  efficiency = 93,
  threshold = 92,
): MotorEfficiencyQualification => ({
  kind,
  full_load_efficiency_pct: efficiency,
  threshold_pct: kind === "unqualified" ? null : threshold,
  standard_ref: kind === "unqualified" ? null : "IEC 60034-30-1",
  explanation: `Qualification ${kind}`,
  evidence: c3CatalogEvidence,
});
