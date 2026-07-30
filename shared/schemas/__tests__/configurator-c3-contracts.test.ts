import { describe, expect, it } from 'vitest';

import {
  MOTOR_COMPATIBILITY_RULESET,
  isApplicableFieldOverride,
  motorCandidateVerdictSchema,
  motorCouplingAxialRangeSchema,
  motorFrameDimensionsSchema,
  motorShaftDimensionsSchema,
  safeParseMotorCandidateVerdictOutput,
  safeParseMotorEquivalentFromSpecInput
} from '../configurator/motor.schema.ts';

const snapshotId = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';

const measurementEvidence = [{
  kind: 'measurement' as const,
  label: 'Mesure terrain explicite'
}];

const catalogEvidence = [{
  kind: 'source_page' as const,
  label: 'Catalogue constructeur page 42',
  source_document_id: documentId,
  filename: 'catalogue-moteur.pdf',
  sha256: 'a'.repeat(64),
  pdf_page: 42,
  catalog_page: '42',
  extraction_method: 'pdfplumber-table'
}];

const confirmedMeasurement = (value: number | null, unit = 'mm') => ({
  value,
  unit,
  origin: 'user_measurement' as const,
  confirmation: 'confirmed' as const,
  evidence: value === null ? [] : measurementEvidence
});

const confirmedText = (value: string) => ({
  value,
  origin: 'nameplate' as const,
  confirmation: 'confirmed' as const,
  evidence: measurementEvidence
});

const validInput = {
  schema_version: 1 as const,
  snapshot_id: snapshotId,
  mounting: 'B35' as const,
  electrical: {
    power_kw: { ...confirmedMeasurement(37, 'kW'), origin: 'nameplate' as const },
    network: confirmedText('Reseau usine 400 V / 50 Hz'),
    frequency_hz: { ...confirmedMeasurement(50, 'Hz'), origin: 'nameplate' as const },
    supply_mode: {
      value: 'mains' as const,
      origin: 'nameplate' as const,
      confirmation: 'confirmed' as const,
      evidence: measurementEvidence
    },
    voltage_v: { ...confirmedMeasurement(400, 'V'), origin: 'nameplate' as const },
    coupling: {
      value: 'Y' as const,
      origin: 'nameplate' as const,
      confirmation: 'confirmed' as const,
      evidence: measurementEvidence
    }
  },
  mechanical: {
    frame: {
      dimensions: {
        A: confirmedMeasurement(356),
        B: confirmedMeasurement(286),
        C: confirmedMeasurement(149),
        H: confirmedMeasurement(225),
        K: confirmedMeasurement(24)
      },
      adjustment: {
        bolt_diameter: confirmedMeasurement(20),
        transverse_travel: confirmedMeasurement(12),
        longitudinal_travel: confirmedMeasurement(18)
      }
    },
    shaft: {
      dimensions: {
        D: confirmedMeasurement(60),
        D_fit_tolerance: confirmedText('j6'),
        E: confirmedMeasurement(140),
        F: confirmedMeasurement(18)
      }
    },
    coupling: {
      axial_min: confirmedMeasurement(120),
      axial_max: confirmedMeasurement(160)
    },
    flange: {
      dimensions: {
        M: confirmedMeasurement(400),
        N: confirmedMeasurement(350),
        P: confirmedMeasurement(450),
        S: confirmedMeasurement(19),
        T: confirmedMeasurement(5),
        Z: confirmedMeasurement(8, 'count')
      }
    }
  },
  application: {
    ip_rating: confirmedText('IP55'),
    brake_required: {
      value: false,
      origin: 'user_measurement' as const,
      confirmation: 'confirmed' as const,
      evidence: measurementEvidence
    }
  }
};

const validVerdict = {
  candidate: {
    model_id: '1652',
    model_key: 'leroy-somer:lshrm:160mr1:variant46',
    operating_point_id: '1997',
    brand: 'Leroy-Somer',
    series: 'LSHRM',
    designation: 'LSHRM 160MR1',
    variant_key: 'J 0.52 kgm2 | M 46 kg',
    power_kw: 37,
    rated_speed_rpm: 3000,
    frequency_hz: 100,
    poles: 4,
    supply_mode: 'vfd',
    efficiency_class: 'IE5',
    lifecycle: 'current',
    data_grade: 'B'
  },
  matched_flange: null,
  ruleset_id: MOTOR_COMPATIBILITY_RULESET.ruleset_id,
  ruleset_version: MOTOR_COMPATIBILITY_RULESET.ruleset_version,
  mechanical_status: 'under_reservation',
  electrical_status: 'satisfied',
  application_status: 'indeterminate',
  overall_status: 'indeterminate',
  explanation: 'Une verification mecanique reste requise.',
  criteria: [{
    code: 'SHAFT_D',
    label: 'Diametre d arbre D',
    status: 'under_reservation',
    blocking: true,
    expected: 60,
    observed: 60,
    unit: 'mm',
    tolerance: 0,
    delta: 0,
    calculated_clearance: 0,
    explanation: 'Le diametre est identique.',
    evidence: catalogEvidence,
    affected_by_issue_codes: []
  }],
  adaptations_required: [],
  checks_required: [{
    code: 'CHECK_SHAFT_FIT',
    label: 'Verifier l ajustement',
    explanation: 'La tolerance est conservee comme fait de montage distinct.',
    evidence: catalogEvidence
  }],
  facts_used: [{
    fact_path: 'mechanical.shaft.D',
    value: 60,
    unit: 'mm',
    origin: 'catalog',
    confirmation: 'confirmed',
    evidence: catalogEvidence
  }],
  rules_applied: [{
    rule_code: 'SHAFT_D',
    ruleset_id: MOTOR_COMPATIBILITY_RULESET.ruleset_id,
    ruleset_version: MOTOR_COMPATIBILITY_RULESET.ruleset_version,
    status: 'under_reservation',
    decisive: true,
    fact_paths: ['mechanical.shaft.D']
  }],
  issues: [],
  missing_facts: ['application.ip_rating']
} as const;

describe('contrats Configurateurs C3-1', () => {
  it('valide toutes les familles de faits demandees sans les fusionner', () => {
    const result = safeParseMotorEquivalentFromSpecInput(validInput);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.mechanical.frame.dimensions.K?.value).toBe(24);
    expect(result.data.mechanical.frame.adjustment?.bolt_diameter?.value).toBe(20);
    expect(result.data.mechanical.frame.adjustment?.transverse_travel?.value).toBe(12);
    expect(result.data.mechanical.frame.adjustment?.longitudinal_travel?.value).toBe(18);
    expect(result.data.mechanical.shaft.dimensions.D?.value).toBe(60);
    expect(result.data.mechanical.shaft.dimensions.D_fit_tolerance?.value).toBe('j6');
  });

  it('refuse les champs externes inconnus et les objets commerciaux', () => {
    for (const field of ['price', 'discount', 'stock', 'availability']) {
      expect(safeParseMotorEquivalentFromSpecInput({
        ...validInput,
        [field]: 1
      }).success).toBe(false);
    }
  });

  it('exige une preuve pour toute valeur renseignee et preserve les inconnues', () => {
    expect(motorFrameDimensionsSchema.safeParse({
      A: {
        value: 356,
        unit: 'mm',
        origin: 'user_measurement',
        confirmation: 'confirmed',
        evidence: []
      }
    }).success).toBe(false);
    expect(motorFrameDimensionsSchema.safeParse({
      A: {
        value: null,
        unit: 'mm',
        origin: 'user_measurement',
        confirmation: 'unconfirmed',
        evidence: []
      }
    }).success).toBe(true);
  });

  it('n applique une surcharge terrain que si elle est confirmee et prouvee', () => {
    expect(isApplicableFieldOverride(confirmedMeasurement(24))).toBe(true);
    expect(isApplicableFieldOverride({
      ...confirmedMeasurement(24),
      confirmation: 'unconfirmed'
    })).toBe(false);
    expect(isApplicableFieldOverride({
      ...confirmedMeasurement(24),
      evidence: []
    })).toBe(false);
  });

  it('valide D et sa tolerance comme deux faits et borne la plage axiale', () => {
    expect(motorShaftDimensionsSchema.safeParse(validInput.mechanical.shaft.dimensions).success).toBe(true);
    expect(motorCouplingAxialRangeSchema.safeParse(validInput.mechanical.coupling).success).toBe(true);
    expect(motorCouplingAxialRangeSchema.safeParse({
      axial_min: confirmedMeasurement(160),
      axial_max: confirmedMeasurement(120)
    }).success).toBe(false);
  });

  it('fige le ruleset et valide les quatre statuts de sortie', () => {
    expect(Object.isFrozen(MOTOR_COMPATIBILITY_RULESET)).toBe(true);
    for (const status of ['satisfied', 'under_reservation', 'not_satisfied', 'indeterminate'] as const) {
      expect(motorCandidateVerdictSchema.safeParse({
        ...validVerdict,
        mechanical_status: status,
        electrical_status: status,
        application_status: status,
        overall_status: status
      }).success).toBe(true);
    }
  });

  it('valide les sorties externes par safeParse et refuse une version ou preuve invalide', () => {
    expect(safeParseMotorCandidateVerdictOutput(validVerdict).success).toBe(true);
    expect(safeParseMotorCandidateVerdictOutput({
      ...validVerdict,
      ruleset_version: 2
    }).success).toBe(false);
    expect(safeParseMotorCandidateVerdictOutput({
      ...validVerdict,
      facts_used: [{
        ...validVerdict.facts_used[0],
        evidence: []
      }]
    }).success).toBe(false);
  });
});
