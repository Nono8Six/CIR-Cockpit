import {
  assert,
  assertEquals,
  assertFalse
} from 'std/assert';

import {
  safeParseMotorMechanicalCompatibilityOutput
} from '../../../../../shared/schemas/configurator/motor.schema.ts';
import type {
  MotorMatchedFlange,
  MotorMechanicalSpec,
  MotorMounting
} from '../../../../../shared/schemas/configurator/motor.schema.ts';
import type {
  ConfiguratorEvidence
} from '../../../../../shared/schemas/configurator/common.schema.ts';
import {
  evaluateMotorMechanicalCompatibility,
  type MechanicalMotorSpec
} from './motorMechanicalCompatibility.ts';

const documentId = '11111111-1111-4111-8111-111111111111';
type SourcePageEvidence = Extract<ConfiguratorEvidence, { kind: 'source_page' }>;

const sourcePageEvidence: SourcePageEvidence = {
  kind: 'source_page',
  label: 'Catalogue constructeur',
  source_document_id: documentId,
  filename: 'catalogue.pdf',
  sha256: 'a'.repeat(64),
  pdf_page: 42,
  catalog_page: '42',
  extraction_method: 'pdfplumber-table'
};
const sourceEvidence: ConfiguratorEvidence[] = [sourcePageEvidence];
const secondSourceEvidence: SourcePageEvidence = {
  ...sourcePageEvidence,
  label: 'Catalogue constructeur candidat',
  pdf_page: 43,
  catalog_page: '43'
};
const measurementEvidence: ConfiguratorEvidence[] = [{
  kind: 'measurement',
  label: 'Mesure terrain confirmee'
}];

const catalogNumber = (value: number | null, unit = 'mm') => ({
  value,
  unit,
  origin: 'catalog' as const,
  confirmation: value === null ? 'unconfirmed' as const : 'confirmed' as const,
  evidence: value === null ? [] : sourceEvidence
});

const catalogText = (value: string | null) => ({
  value,
  origin: 'catalog' as const,
  confirmation: value === null ? 'unconfirmed' as const : 'confirmed' as const,
  evidence: value === null ? [] : sourceEvidence
});

const catalogBoreType = (value: 'through' | 'tapped') => ({
  value,
  origin: 'catalog' as const,
  confirmation: 'confirmed' as const,
  evidence: sourceEvidence
});

const measuredNumber = (
  value: number | null,
  confirmation: 'confirmed' | 'unconfirmed' = 'confirmed'
) => ({
  value,
  unit: 'mm',
  origin: 'user_measurement' as const,
  confirmation,
  evidence: value === null ? [] : measurementEvidence
});

const makeMechanical = (mounting: MotorMounting): MotorMechanicalSpec => ({
  frame: {
    dimensions: {
      A: catalogNumber(254),
      B: catalogNumber(210),
      C: catalogNumber(108),
      H: catalogNumber(160),
      K: catalogNumber(24)
    },
    adjustment: {
      bolt_diameter: measuredNumber(20),
      transverse_travel: measuredNumber(5),
      longitudinal_travel: measuredNumber(6)
    }
  },
  shaft: {
    dimensions: {
      D: catalogNumber(42),
      D_fit_tolerance: catalogText('j6'),
      E: catalogNumber(110),
      F: catalogNumber(12)
    }
  },
  coupling: {
    axial_min: measuredNumber(100),
    axial_max: measuredNumber(120)
  },
  ...(mounting === 'B3'
    ? {}
    : {
      flange: {
        reference: `Bride ${mounting}`,
        bore_type: catalogBoreType(
          mounting === 'B14' || mounting === 'B34' ? 'tapped' : 'through'
        ),
        dimensions: {
          M: catalogNumber(300),
          N: catalogNumber(250),
          P: catalogNumber(350),
          ...(mounting === 'B14' || mounting === 'B34'
            ? { S_thread: catalogText('M16') }
            : { S: catalogNumber(18) }),
          T: catalogNumber(5),
          Z: catalogNumber(8, 'count')
        },
        clearance: {
          P: measuredNumber(3),
          T: measuredNumber(3)
        }
      }
    })
});

const makeSpec = (mounting: MotorMounting = 'B3'): MechanicalMotorSpec => ({
  mounting,
  mechanical: makeMechanical(mounting)
});

const cloneSpec = (spec: MechanicalMotorSpec): MechanicalMotorSpec =>
  structuredClone(spec);

const standardFlange = (mounting: Exclude<MotorMounting, 'B3'>): MotorMatchedFlange => ({
  flange_option_id: '100',
  mounting,
  role: 'standard',
  reference: `Bride ${mounting}`,
  requires_option: false
});

const criterion = (
  result: ReturnType<typeof evaluateMotorMechanicalCompatibility>,
  code: string
) => {
  const found = result.criteria.find((item) => item.code === code);
  assert(found, `Critere ${code} absent`);
  return found;
};

Deno.test('mechanical compatibility validates its strict output contract', () => {
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(),
    candidate: makeSpec()
  });
  const parsed = safeParseMotorMechanicalCompatibilityOutput(result);
  assert(parsed.success, parsed.success ? undefined : JSON.stringify(parsed.error.issues));
});

Deno.test('foot mounting accepts exact A and B dimensions', () => {
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(),
    candidate: makeSpec()
  });
  assertEquals(criterion(result, 'FRAME_A').status, 'satisfied');
  assertEquals(criterion(result, 'FRAME_B').status, 'satisfied');
  assertEquals(result.status, 'satisfied');
});

Deno.test('foot mounting accepts an A offset inside measured travel and K clearance', () => {
  const candidate = makeSpec();
  candidate.mechanical.frame.dimensions.A = catalogNumber(262);
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(),
    candidate
  });
  const frameA = criterion(result, 'FRAME_A');
  assertEquals(frameA.delta, 4);
  assertEquals(frameA.calculated_clearance, 7);
  assertEquals(frameA.status, 'satisfied');
});

Deno.test('foot mounting rejects an A offset beyond measured travel and K clearance', () => {
  const candidate = makeSpec();
  candidate.mechanical.frame.dimensions.A = catalogNumber(274);
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(),
    candidate
  });
  assertEquals(criterion(result, 'FRAME_A').status, 'not_satisfied');
  assert(result.adaptations_required.some((action) => action.code === 'ADAPT_FRAME_A'));
  assertEquals(result.status, 'not_satisfied');
});

Deno.test('foot mounting keeps a B offset under reservation without measured travel', () => {
  const existing = makeSpec();
  existing.mechanical.frame.adjustment!.longitudinal_travel = measuredNumber(null);
  const candidate = makeSpec();
  candidate.mechanical.frame.dimensions.B = catalogNumber(214);
  const result = evaluateMotorMechanicalCompatibility({ existing, candidate });
  assertEquals(criterion(result, 'FRAME_B').status, 'under_reservation');
  assert(result.missing_facts.includes('mechanical.frame.longitudinal_travel'));
});

for (const [name, missingField, missingPath] of [
  ['K absent', 'K', 'mechanical.frame.K'],
  ['diametre de boulon absent', 'bolt_diameter', 'mechanical.frame.bolt_diameter']
] as const) {
  Deno.test(`foot mounting is indeterminate when ${name}`, () => {
    const existing = makeSpec();
    const candidate = makeSpec();
    if (missingField === 'K') {
      candidate.mechanical.frame.dimensions.K = catalogNumber(null);
    } else {
      existing.mechanical.frame.adjustment!.bolt_diameter = measuredNumber(null);
    }
    const result = evaluateMotorMechanicalCompatibility({ existing, candidate });
    assertEquals(criterion(result, 'FRAME_K_BOLT_CLEARANCE').status, 'indeterminate');
    assert(result.missing_facts.includes(missingPath));
    assertEquals(result.status, 'indeterminate');
  });
}

Deno.test('foot mounting publishes the positive K and bolt clearance', () => {
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(),
    candidate: makeSpec()
  });
  const clearance = criterion(result, 'FRAME_K_BOLT_CLEARANCE');
  assertEquals(clearance.calculated_clearance, 2);
  assertEquals(clearance.status, 'satisfied');
});

Deno.test('foot mounting rejects K without positive bolt clearance', () => {
  const candidate = makeSpec();
  candidate.mechanical.frame.dimensions.K = catalogNumber(20);
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(),
    candidate
  });
  assertEquals(criterion(result, 'FRAME_K_BOLT_CLEARANCE').status, 'not_satisfied');
});

Deno.test('foot mounting requires an adaptation for a different H', () => {
  const candidate = makeSpec();
  candidate.mechanical.frame.dimensions.H = catalogNumber(180);
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(),
    candidate
  });
  assertEquals(criterion(result, 'FRAME_H').status, 'under_reservation');
  assert(result.adaptations_required.some((action) => action.code === 'ADAPT_FRAME_H'));
});

for (const [name, travel, expectedAction] of [
  ['absent travel', null, 'MEASURE_FRAME_C_TRAVEL'],
  ['sufficient travel', 12, 'CHECK_FRAME_C_ENVELOPE'],
  ['insufficient travel', 2, 'ADAPT_FRAME_C']
] as const) {
  Deno.test(`foot mounting keeps different C under reservation with ${name}`, () => {
    const existing = makeSpec();
    existing.mechanical.frame.adjustment!.longitudinal_travel = measuredNumber(travel);
    const candidate = makeSpec();
    candidate.mechanical.frame.dimensions.C = catalogNumber(116);
    const result = evaluateMotorMechanicalCompatibility({ existing, candidate });
    assertEquals(criterion(result, 'FRAME_C').status, 'under_reservation');
    assert(
      [...result.checks_required, ...result.adaptations_required].some(
        (action) => action.code === expectedAction
      )
    );
  });
}

for (const [code, observed] of [['D', 45], ['F', 14]] as const) {
  Deno.test(`shaft rejects a different ${code}`, () => {
    const candidate = makeSpec();
    candidate.mechanical.shaft.dimensions[code] = catalogNumber(observed);
    const result = evaluateMotorMechanicalCompatibility({
      existing: makeSpec(),
      candidate
    });
    assertEquals(criterion(result, `SHAFT_${code}`).status, 'not_satisfied');
  });
}

Deno.test('shaft keeps a different E under reservation without axial proof', () => {
  const existing = makeSpec();
  existing.mechanical.coupling = undefined;
  const candidate = makeSpec();
  candidate.mechanical.shaft.dimensions.E = catalogNumber(115);
  const result = evaluateMotorMechanicalCompatibility({ existing, candidate });
  assertEquals(criterion(result, 'SHAFT_E_COUPLING_RANGE').status, 'under_reservation');
  assert(result.missing_facts.includes('mechanical.coupling.axial_min'));
});

Deno.test('shaft accepts a different E inside the proven axial range', () => {
  const candidate = makeSpec();
  candidate.mechanical.shaft.dimensions.E = catalogNumber(115);
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(),
    candidate
  });
  assertEquals(criterion(result, 'SHAFT_E_COUPLING_RANGE').status, 'satisfied');
});

Deno.test('shaft keeps identical D satisfied with different fit tolerances', () => {
  const candidate = makeSpec();
  candidate.mechanical.shaft.dimensions.D_fit_tolerance = catalogText('k6');
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(),
    candidate
  });
  assertEquals(criterion(result, 'SHAFT_D').status, 'satisfied');
  assertEquals(criterion(result, 'SHAFT_D_FIT_TOLERANCE').status, 'satisfied');
  assert(result.checks_required.some((action) => action.code === 'CHECK_SHAFT_D_FIT'));
  assertFalse(result.adaptations_required.some((action) =>
    action.code === 'CHECK_SHAFT_D_FIT'
  ));
  assertEquals(result.status, 'satisfied');
});

Deno.test('shaft emits no alert when a D fit tolerance is absent', () => {
  const candidate = makeSpec();
  candidate.mechanical.shaft.dimensions.D_fit_tolerance = undefined;
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(),
    candidate
  });
  assertFalse(result.criteria.some((item) => item.code === 'SHAFT_D_FIT_TOLERANCE'));
  assertFalse(result.checks_required.some((action) => action.code === 'CHECK_SHAFT_D_FIT'));
  assertEquals(result.status, 'satisfied');
});

Deno.test('B3 requires no flange and never derives one from H', () => {
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec('B3'),
    candidate: makeSpec('B3')
  });
  assertEquals(criterion(result, 'FLANGE_INTERFACE').status, 'satisfied');
  assertEquals(result.matched_flange, null);
});

for (const mounting of ['B5', 'B14', 'B34', 'B35'] as const) {
  Deno.test(`${mounting} accepts an exact flange interface`, () => {
    const result = evaluateMotorMechanicalCompatibility({
      existing: makeSpec(mounting),
      candidate: makeSpec(mounting),
      candidateFlange: standardFlange(mounting)
    });
    assertEquals(result.status, 'satisfied');
    assertEquals(result.matched_flange?.mounting, mounting);
    assertEquals(result.matched_flange?.requires_option, false);
  });
}

Deno.test('flange accepts an exact larger option only with requires_option true', () => {
  const mounting = 'B5';
  const option: MotorMatchedFlange = {
    ...standardFlange(mounting),
    role: 'larger',
    requires_option: true
  };
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(mounting),
    candidate: makeSpec(mounting),
    candidateFlange: option
  });
  assertEquals(result.status, 'satisfied');
  assertEquals(result.matched_flange, option);
  assert(result.checks_required.some((action) => action.code === 'INSTALL_FLANGE_OPTION'));
});

Deno.test('flange does not match an option whose exact interface is not proven', () => {
  const mounting = 'B14';
  const candidate = makeSpec(mounting);
  candidate.mechanical.flange!.dimensions.M = catalogNumber(null);
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(mounting),
    candidate,
    candidateFlange: {
      ...standardFlange(mounting),
      role: 'smaller',
      requires_option: true
    }
  });
  assertEquals(criterion(result, 'FLANGE_M').status, 'indeterminate');
  assertEquals(result.matched_flange, null);
});

for (const [mounting, code, value] of [
  ['B5', 'N', 260],
  ['B5', 'M', 310],
  ['B5', 'Z', 10],
  ['B5', 'S', 20],
  ['B14', 'S_thread', 'M20']
] as const) {
  Deno.test(`flange rejects a different ${code} on ${mounting}`, () => {
    const candidate = makeSpec(mounting);
    if (typeof value === 'number') {
      candidate.mechanical.flange!.dimensions[code] = catalogNumber(
        value,
        code === 'Z' ? 'count' : 'mm'
      );
    } else {
      candidate.mechanical.flange!.dimensions.S_thread = catalogText(value);
    }
    const result = evaluateMotorMechanicalCompatibility({
      existing: makeSpec(mounting),
      candidate,
      candidateFlange: standardFlange(mounting)
    });
    assertEquals(criterion(result, `FLANGE_${code}`).status, 'not_satisfied');
    assertEquals(result.matched_flange, null);
  });
}

Deno.test('flange accepts P and T differences inside measured clearances', () => {
  const mounting = 'B5';
  const candidate = makeSpec(mounting);
  candidate.mechanical.flange!.dimensions.P = catalogNumber(354);
  candidate.mechanical.flange!.dimensions.T = catalogNumber(7);
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(mounting),
    candidate,
    candidateFlange: standardFlange(mounting)
  });
  assertEquals(criterion(result, 'FLANGE_P_CLEARANCE').status, 'satisfied');
  assertEquals(criterion(result, 'FLANGE_T_CLEARANCE').status, 'satisfied');
  assertEquals(result.status, 'satisfied');
});

Deno.test('flange keeps a P difference under reservation without verified clearance', () => {
  const mounting = 'B5';
  const existing = makeSpec(mounting);
  existing.mechanical.flange!.clearance!.P = measuredNumber(null);
  const candidate = makeSpec(mounting);
  candidate.mechanical.flange!.dimensions.P = catalogNumber(354);
  const result = evaluateMotorMechanicalCompatibility({
    existing,
    candidate,
    candidateFlange: standardFlange(mounting)
  });
  assertEquals(criterion(result, 'FLANGE_P_CLEARANCE').status, 'under_reservation');
  assertEquals(result.matched_flange, null);
});

Deno.test('flange rejects a T difference beyond verified clearance', () => {
  const mounting = 'B5';
  const candidate = makeSpec(mounting);
  candidate.mechanical.flange!.dimensions.T = catalogNumber(10);
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(mounting),
    candidate,
    candidateFlange: standardFlange(mounting)
  });
  assertEquals(criterion(result, 'FLANGE_T_CLEARANCE').status, 'not_satisfied');
});

Deno.test('flange remains indeterminate with partial data', () => {
  const mounting = 'B5';
  const candidate = makeSpec(mounting);
  candidate.mechanical.flange!.dimensions.N = catalogNumber(null);
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(mounting),
    candidate,
    candidateFlange: standardFlange(mounting)
  });
  assertEquals(result.status, 'indeterminate');
  assert(result.missing_facts.includes('mechanical.flange.N'));
});

Deno.test('flange never infers missing data from an identical H', () => {
  const mounting = 'B35';
  const candidate = makeSpec(mounting);
  candidate.mechanical.flange!.dimensions.M = catalogNumber(null);
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(mounting),
    candidate,
    candidateFlange: standardFlange(mounting)
  });
  assertEquals(criterion(result, 'FRAME_H').status, 'satisfied');
  assertEquals(criterion(result, 'FLANGE_M').status, 'indeterminate');
});

Deno.test('mechanical result is independent from evidence ordering', () => {
  const existing = makeSpec('B5');
  const candidate = makeSpec('B5');
  candidate.mechanical.flange!.dimensions.M!.evidence = [
    secondSourceEvidence,
    ...sourceEvidence
  ];
  const reversed = cloneSpec(candidate);
  reversed.mechanical.flange!.dimensions.M!.evidence.reverse();
  const first = evaluateMotorMechanicalCompatibility({
    existing,
    candidate,
    candidateFlange: standardFlange('B5')
  });
  const second = evaluateMotorMechanicalCompatibility({
    existing,
    candidate: reversed,
    candidateFlange: standardFlange('B5')
  });
  assertEquals(first, second);
});

Deno.test('mechanical result is deterministic for identical inputs', () => {
  const input = {
    existing: makeSpec('B14'),
    candidate: makeSpec('B14'),
    candidateFlange: standardFlange('B14')
  };
  assertEquals(
    evaluateMotorMechanicalCompatibility(input),
    evaluateMotorMechanicalCompatibility(input)
  );
});

Deno.test('unknown mechanical values never become compatibility', () => {
  const candidate = makeSpec();
  candidate.mechanical.shaft.dimensions.D = catalogNumber(null);
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec(),
    candidate
  });
  assertEquals(criterion(result, 'SHAFT_D').status, 'indeterminate');
  assertFalse(result.status === 'satisfied');
});

Deno.test('mechanical result preserves decisive source provenance', () => {
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec('B5'),
    candidate: makeSpec('B5'),
    candidateFlange: standardFlange('B5')
  });
  assert(result.facts_used.length > 0);
  for (const fact of result.facts_used) assert(fact.evidence.length > 0);
  assert(criterion(result, 'FLANGE_M').evidence.some((item) =>
    item.kind === 'source_page'
  ));
});

Deno.test('mechanical result contains no commercial data', () => {
  const result = evaluateMotorMechanicalCompatibility({
    existing: makeSpec('B5'),
    candidate: makeSpec('B5'),
    candidateFlange: standardFlange('B5')
  });
  const serialized = JSON.stringify(result);
  for (const forbidden of ['price', 'discount', 'stock', 'availability', 'quote', 'order']) {
    assertFalse(serialized.includes(forbidden));
  }
});
