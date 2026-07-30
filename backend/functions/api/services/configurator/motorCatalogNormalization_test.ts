import { assert, assertEquals } from 'std/assert';

import type {
  MotorCatalogDimension,
  MotorCatalogGetResponse
} from '../../../../../shared/schemas/configurator/motor.schema.ts';
import {
  safeParseMotorCatalogGetInput,
  safeParseMotorCatalogGetOutput
} from '../../../../../shared/schemas/configurator/motor.schema.ts';
import {
  normalizeMotorCatalog,
  selectCatalogDimensions
} from './motorCatalogNormalization.ts';

const snapshotId = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';
const evidence = [{
  kind: 'source_page' as const,
  label: 'Catalogue constructeur',
  source_document_id: documentId,
  filename: 'catalogue.pdf',
  sha256: 'a'.repeat(64),
  pdf_page: 42,
  catalog_page: '42',
  extraction_method: 'pdfplumber-table'
}];

const model: MotorCatalogGetResponse['model'] = {
  id: '10',
  model_key: 'brand:model:standard',
  brand: 'Brand',
  series: 'Series',
  designation: 'Model',
  article_no: null,
  pole_config: '4',
  motor_technology: 'asynchronous',
  casing_material: 'cast-iron',
  protection_ip: 'IP55',
  frame_size: 160,
  frame_letter: null,
  shaft_spec: null,
  inertia_kgm2: 0.4,
  mass_kg: 80,
  mass_mounting: 'B3',
  lifecycle: 'current',
  requires_vfd: false,
  is_iec_standard: true,
  article_no_status: 'not_published_in_source',
  data_grade: 'B',
  evidence
};

const operatingPoint: MotorCatalogGetResponse['operating_point'] = {
  id: '20',
  variant_key: 'IE4 15 kW',
  poles: 4,
  supply_mode: 'mains',
  frequency_hz: 50,
  voltage_v: 400,
  coupling: 'D',
  rated_speed_rpm: 1475,
  power_kw: 15,
  efficiency_class: 'IE4',
  efficiency_standard: 'IEC 60034-30-1',
  rated_torque_nm: 97,
  rated_current_a: 28,
  max_current_a: null,
  max_torque_nm: null,
  noise_db: 68,
  cos_phi: 0.85,
  starting_torque_ratio: 2.2,
  starting_current_ratio: 7,
  breakdown_torque_ratio: 2.8,
  data_grade: 'B',
  evidence
};

const dimension = (
  id: number,
  canonicalCode: NonNullable<MotorCatalogDimension['canonical_code']>,
  value: number,
  mounting: MotorCatalogDimension['mounting'] = 'B3',
  polarity: number | null = 4
): MotorCatalogDimension => ({
  id: String(id),
  definition_id: String(id + 100),
  mounting,
  polarity,
  published_code: canonicalCode,
  base_published_code: canonicalCode,
  canonical_code: canonicalCode,
  mapping_status: 'mapped',
  variant_context: null,
  value_mm: value,
  value_text: null,
  data_grade: 'B',
  evidence
});

const completeB3Dimensions = [
  dimension(1, 'A', 254),
  dimension(2, 'B', 210),
  dimension(3, 'C', 108),
  dimension(4, 'H', 160),
  dimension(5, 'D', 42),
  dimension(6, 'E', 110),
  dimension(7, 'F', 12)
];

Deno.test('catalog normalization keeps a unique exact dimension over ANY fallback', () => {
  const result = selectCatalogDimensions([
    dimension(1, 'H', 160, 'ANY', null),
    dimension(2, 'H', 180, 'B3', 4)
  ], 'B3', 4);

  assertEquals(result.values.H?.value_mm, 180);
  assertEquals(result.ambiguousCodes, []);
});

Deno.test('catalog normalization reports same-specificity ambiguity without choosing', () => {
  const result = selectCatalogDimensions([
    dimension(1, 'H', 160),
    dimension(2, 'H', 180)
  ], 'B3', 4);

  assertEquals(result.values.H, undefined);
  assertEquals(result.ambiguousCodes, ['H']);
  assertEquals(result.issues[0]?.code, 'CATALOG_DIMENSION_AMBIGUOUS');
});

Deno.test('catalog normalization applies only schema-confirmed measurements after catalog facts', () => {
  const parsedInput = safeParseMotorCatalogGetInput({
    operating_point_id: operatingPoint.id,
    mounting: 'B3',
    field_overrides: {
      mechanical: {
        frame: {
          dimensions: {
            H: {
              value: 165,
              unit: 'mm',
              origin: 'user_measurement',
              confirmation: 'confirmed',
              evidence: [{ kind: 'measurement', label: 'Mesure terrain H' }]
            }
          }
        }
      }
    }
  });
  assert(parsedInput.success);

  const result = normalizeMotorCatalog({
    snapshotId,
    model,
    operatingPoint,
    dimensions: completeB3Dimensions,
    flangeOptions: [],
    selection: parsedInput.data
  });

  assertEquals(result.spec.mechanical.frame.dimensions.H?.value, 165);
  assertEquals(result.spec.mechanical.frame.dimensions.H?.origin, 'user_measurement');
  assertEquals(result.spec.electrical.efficiency_class?.value, 'IE4');
  assertEquals(result.normalization.status, 'satisfied');
});

Deno.test('catalog normalization returns indeterminate for a decisive missing fact', () => {
  const parsedInput = safeParseMotorCatalogGetInput({
    operating_point_id: operatingPoint.id,
    mounting: 'B3'
  });
  assert(parsedInput.success);
  const result = normalizeMotorCatalog({
    snapshotId,
    model,
    operatingPoint,
    dimensions: completeB3Dimensions.filter((entry) => entry.canonical_code !== 'F'),
    flangeOptions: [],
    selection: parsedInput.data
  });

  assertEquals(result.normalization.status, 'indeterminate');
  assert(result.normalization.missing_facts.includes('mechanical.shaft.F'));
});

Deno.test('catalog get output preserves distinct IE3 and IE4 operating point identities', () => {
  const parsedInput = safeParseMotorCatalogGetInput({
    operating_point_id: operatingPoint.id,
    mounting: 'B3'
  });
  assert(parsedInput.success);
  const normalized = normalizeMotorCatalog({
    snapshotId,
    model,
    operatingPoint,
    dimensions: completeB3Dimensions,
    flangeOptions: [],
    selection: parsedInput.data
  });
  const output = {
    request_id: requestId,
    snapshot: {
      id: snapshotId,
      label: 'Catalogue actif',
      activated_at: '2026-07-28T12:26:35.267Z'
    },
    model,
    operating_point: operatingPoint,
    efficiency_points: [],
    torque_points: [],
    dimensions: completeB3Dimensions,
    flange_options: [],
    brake_options: [],
    issues: [],
    from_motor_spec: normalized.spec,
    normalization: normalized.normalization
  };

  const parsedOutput = safeParseMotorCatalogGetOutput(output);
  assert(
    parsedOutput.success,
    parsedOutput.success ? undefined : JSON.stringify(parsedOutput.error.issues)
  );
  assertEquals(output.operating_point.efficiency_class, 'IE4');
  assertEquals(output.operating_point.id, '20');
});

Deno.test('catalog input rejects unconfirmed or unsourced field overrides', () => {
  for (const override of [
    {
      value: 165,
      unit: 'mm',
      origin: 'user_measurement',
      confirmation: 'unconfirmed',
      evidence: [{ kind: 'measurement', label: 'Mesure terrain H' }]
    },
    {
      value: 165,
      unit: 'mm',
      origin: 'statistical_suggestion',
      confirmation: 'confirmed',
      evidence: [{ kind: 'sample', label: 'Parc moteur', sample_size: 20 }]
    }
  ]) {
    assertEquals(safeParseMotorCatalogGetInput({
      operating_point_id: operatingPoint.id,
      mounting: 'B3',
      field_overrides: {
        mechanical: {
          frame: { dimensions: { H: override } }
        }
      }
    }).success, false);
  }
});
