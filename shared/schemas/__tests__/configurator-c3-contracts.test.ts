import { describe, expect, it } from 'vitest';

import {
  MOTOR_COMPATIBILITY_RULESET,
  isApplicableFieldOverride,
  motorAdviceResponseSchema,
  motorCandidateVerdictSchema,
  motorCompareInputSchema,
  motorComparisonResponseSchema,
  motorCouplingAxialRangeSchema,
  motorElectricalApplicationCompatibilityResultSchema,
  motorEnergyComputeInputSchema,
  motorEnergyComputeResponseSchema,
  motorEquivalentFromMotorInputSchema,
  motorEquivalentFromSpecResponseSchema,
  motorFrameDimensionsSchema,
  motorShaftDimensionsSchema,
  safeParseMotorAdviceOutput,
  safeParseMotorCandidateVerdictOutput,
  safeParseMotorCompareOutput,
  safeParseMotorElectricalApplicationCompatibilityOutput,
  safeParseMotorEnergyOutput,
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
    },
    efficiency_class: confirmedText('IE3')
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

const electricalRuleCodes = [
  'POWER',
  'POLES',
  'FREQUENCY',
  'SUPPLY_MODE',
  'VOLTAGE_COUPLING'
] as const;

const validElectricalApplicationResult = {
  ruleset_id: MOTOR_COMPATIBILITY_RULESET.ruleset_id,
  ruleset_version: MOTOR_COMPATIBILITY_RULESET.ruleset_version,
  electrical_status: 'satisfied',
  application_status: 'satisfied',
  criteria: electricalRuleCodes.map((code) => ({
    code,
    label: `Critere ${code}`,
    status: 'satisfied' as const,
    blocking: true,
    expected: 1,
    observed: 1,
    explanation: 'Le critere est satisfait.',
    evidence: catalogEvidence,
    affected_by_issue_codes: []
  })),
  adaptations_required: [],
  checks_required: [],
  facts_used: validVerdict.facts_used,
  rules_applied: electricalRuleCodes.map((ruleCode) => ({
    rule_code: ruleCode,
    ruleset_id: MOTOR_COMPATIBILITY_RULESET.ruleset_id,
    ruleset_version: MOTOR_COMPATIBILITY_RULESET.ruleset_version,
    status: 'satisfied' as const,
    decisive: true,
    fact_paths: ['electrical.power_kw' as const]
  })),
  missing_facts: []
} as const;

const validRankedVerdict = {
  ...validVerdict,
  ranking: {
    overall_status: validVerdict.overall_status,
    mechanical_status: validVerdict.mechanical_status,
    reservation_count: 1,
    missing_fact_count: 1,
    requested_sort: 'compatibility' as const,
    requested_sort_value: validVerdict.overall_status,
    canonical_key: '00000000000000001997',
    evidence: catalogEvidence
  }
} as const;

const validEnergyResult = {
  motor: {
    model_key: validVerdict.candidate.model_key,
    variant_key: validVerdict.candidate.variant_key,
    operating_point_id: validVerdict.candidate.operating_point_id
  },
  status: 'calculated' as const,
  total_hours_per_year: 1_000,
  energy_kwh_per_year: 12_500,
  efficiency_qualification: {
    kind: 'measured' as const,
    full_load_efficiency_pct: 95,
    threshold_pct: 94,
    standard_ref: 'IEC 60034-30-1',
    explanation: 'Rendement publie au-dessus du seuil.',
    evidence: catalogEvidence
  },
  load_results: [{
    status: 'calculated' as const,
    load_fraction: 1,
    hours_per_year: 1_000,
    shaft_power_kw: 12,
    efficiency_pct: 96,
    efficiency_source: 'catalogue' as const,
    interpolation_bounds: null,
    input_power_kw: 12.5,
    energy_kwh_per_year: 12_500,
    formula: 'P entree = P arbre / rendement.',
    evidence: catalogEvidence,
    affected_by_issue_codes: []
  }],
  restrictions: [],
  rounding: {
    efficiency_decimals: 6 as const,
    power_kw_decimals: 6 as const,
    energy_kwh_decimals: 3 as const
  }
} as const;

const comparedMotor = {
  model_id: validVerdict.candidate.model_id,
  model_key: validVerdict.candidate.model_key,
  operating_point_id: validVerdict.candidate.operating_point_id,
  variant_key: validVerdict.candidate.variant_key,
  brand: validVerdict.candidate.brand,
  designation: validVerdict.candidate.designation,
  label: 'Leroy-Somer LSHRM 160MR1',
  provenance: catalogEvidence,
  issues: []
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

  it('conserve la nature d alesage et les degagements P/T comme faits distincts', () => {
    const result = safeParseMotorEquivalentFromSpecInput({
      ...validInput,
      mechanical: {
        ...validInput.mechanical,
        flange: {
          ...validInput.mechanical.flange,
          bore_type: {
            value: 'through',
            origin: 'user_measurement',
            confirmation: 'confirmed',
            evidence: measurementEvidence
          },
          clearance: {
            P: confirmedMeasurement(4),
            T: confirmedMeasurement(3)
          }
        }
      }
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.mechanical.flange?.bore_type?.value).toBe('through');
    expect(result.data.mechanical.flange?.clearance?.P?.value).toBe(4);
    expect(result.data.mechanical.flange?.clearance?.T?.value).toBe(3);
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

  it('valide la sortie C3-5 stricte et refuse version ou champ commercial externe', () => {
    expect(motorElectricalApplicationCompatibilityResultSchema.safeParse(
      validElectricalApplicationResult
    ).success).toBe(true);
    expect(safeParseMotorElectricalApplicationCompatibilityOutput(
      validElectricalApplicationResult
    ).success).toBe(true);
    expect(safeParseMotorElectricalApplicationCompatibilityOutput({
      ...validElectricalApplicationResult,
      ruleset_version: 2
    }).success).toBe(false);
    expect(safeParseMotorElectricalApplicationCompatibilityOutput({
      ...validElectricalApplicationResult,
      availability: true
    }).success).toBe(false);
  });
});

describe('contrats Configurateurs C3-6', () => {
  it('valide fromMotor et la sortie d equivalence classee avec preuve obligatoire', () => {
    expect(motorEquivalentFromMotorInputSchema.safeParse({
      operating_point_id: '1997',
      mounting: 'B35'
    }).success).toBe(true);
    expect(motorEquivalentFromMotorInputSchema.safeParse({
      operating_point_id: '1997',
      mounting: 'B35',
      price: 1
    }).success).toBe(false);

    const output = {
      request_id: snapshotId,
      snapshot: {
        id: snapshotId,
        label: 'Catalogue actif',
        activated_at: '2026-07-28T12:26:35.267Z'
      },
      normalized_spec: validInput,
      candidates: [validRankedVerdict],
      next_cursor: null
    };
    expect(motorEquivalentFromSpecResponseSchema.safeParse(output).success).toBe(true);
    expect(motorEquivalentFromSpecResponseSchema.safeParse({
      ...output,
      candidates: [{
        ...validRankedVerdict,
        ranking: { ...validRankedVerdict.ranking, evidence: [] }
      }]
    }).success).toBe(false);
  });

  it('valide le profil et la sortie energetique sans prix ni extrapolation implicite', () => {
    expect(motorEnergyComputeInputSchema.safeParse({
      candidate_operating_point_id: '1997',
      profile: {
        load_points: [{ load_fraction: 0.75, hours_per_year: 2_000 }]
      }
    }).success).toBe(true);
    for (const invalidProfile of [
      { load_points: [] },
      {
        load_points: [
          { load_fraction: 0.75, hours_per_year: 1_000 },
          { load_fraction: 0.75, hours_per_year: 500 }
        ]
      },
      { load_points: [{ load_fraction: 0, hours_per_year: 1_000 }] }
    ]) {
      expect(motorEnergyComputeInputSchema.safeParse({
        candidate_operating_point_id: '1997',
        profile: invalidProfile
      }).success).toBe(false);
    }
    const output = {
      request_id: snapshotId,
      snapshot: {
        id: snapshotId,
        label: 'Catalogue actif',
        activated_at: '2026-07-28T12:26:35.267Z'
      },
      candidate: validEnergyResult,
      reference: null,
      gain: null
    };
    expect(motorEnergyComputeResponseSchema.safeParse(output).success).toBe(true);
    expect(safeParseMotorEnergyOutput({ ...output, price: 1 }).success).toBe(false);
  });

  it('exige les preuves des conseils et refuse les champs commerciaux', () => {
    const output = {
      ruleset_id: MOTOR_COMPATIBILITY_RULESET.ruleset_id,
      ruleset_version: MOTOR_COMPATIBILITY_RULESET.ruleset_version,
      candidate: validEnergyResult.motor,
      advice: [{
        code: 'CURRENT_MISMATCH',
        severity: 'warning',
        category: 'electrical',
        label: 'Verifier la protection',
        explanation: 'Le courant publie porte une alerte.',
        action: 'Verifier la protection et la chute de tension.',
        source_criterion_codes: ['CURRENT_INFORMATION'],
        source_issue_codes: ['CURRENT_MISMATCH'],
        missing_facts: [],
        ruleset: MOTOR_COMPATIBILITY_RULESET,
        evidence: catalogEvidence
      }]
    };
    expect(motorAdviceResponseSchema.safeParse(output).success).toBe(true);
    expect(safeParseMotorAdviceOutput({
      ...output,
      advice: [{ ...output.advice[0], evidence: [] }]
    }).success).toBe(false);
    expect(safeParseMotorAdviceOutput({ ...output, stock: 1 }).success).toBe(false);
  });

  it('borne le comparateur a 2-4 moteurs uniques et valide sa sortie stricte', () => {
    expect(motorCompareInputSchema.safeParse({
      operating_point_ids: ['1', '2']
    }).success).toBe(true);
    for (const ids of [
      ['1'],
      ['1', '1'],
      ['1', '2', '3', '4', '5']
    ]) {
      expect(motorCompareInputSchema.safeParse({
        operating_point_ids: ids
      }).success).toBe(false);
    }
    const secondMotor = {
      ...comparedMotor,
      model_id: '1653',
      model_key: 'leroy-somer:lshrm:160mr2',
      operating_point_id: '1998'
    };
    const output = {
      request_id: snapshotId,
      snapshot: {
        id: snapshotId,
        label: 'Catalogue actif',
        activated_at: '2026-07-28T12:26:35.267Z'
      },
      motors: [comparedMotor, secondMotor],
      rows: [{
        family: 'mechanical',
        key: 'dimension_d',
        label: 'Cote D',
        unit: 'mm',
        optimization: 'identity',
        values: [
          { value: 60, status: 'published', evidence: catalogEvidence },
          { value: 60, status: 'published', evidence: catalogEvidence }
        ],
        best_index: null,
        comparable_for_summary: false,
        identity_status: 'identical',
        comparison_note: 'Les valeurs dimensionnelles sont identiques.'
      }],
      summary: [
        {
          operating_point_id: comparedMotor.operating_point_id,
          criteria_won: 0,
          total_comparable_criteria: 0
        },
        {
          operating_point_id: secondMotor.operating_point_id,
          criteria_won: 0,
          total_comparable_criteria: 0
        }
      ],
      mechanical_summary: {
        core_dimensions_identical: true,
        differing_criteria: [],
        indeterminate_criteria: []
      }
    };
    expect(motorComparisonResponseSchema.safeParse(output).success).toBe(true);
    expect(safeParseMotorCompareOutput({
      ...output,
      availability: true
    }).success).toBe(false);
    expect(safeParseMotorCompareOutput({
      ...output,
      motors: [{ ...comparedMotor, provenance: [] }, secondMotor]
    }).success).toBe(false);
  });
});
