import { describe, expect, it } from 'vitest';

import {
  motorCandidateVerdictSchema,
  motorEquivalentFromSpecInputSchema,
  motorFlangeDimensionsSchema,
  motorFrameDimensionsSchema,
  motorMountingSchema
} from '../configurator/motor.schema.ts';

const snapshotId = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';

const confirmedMeasurement = (value: number, unit = 'mm') => ({
  value,
  unit,
  origin: 'user_measurement' as const,
  confirmation: 'confirmed' as const,
  evidence: [{
    kind: 'measurement' as const,
    label: 'Mesure confirmee sur site'
  }]
});

const confirmedNameplate = (value: number, unit: string) => ({
  value,
  unit,
  origin: 'nameplate' as const,
  confirmation: 'confirmed' as const,
  evidence: [{
    kind: 'measurement' as const,
    label: 'Valeur relevee sur la plaque'
  }]
});

const validInput = {
  schema_version: 1 as const,
  snapshot_id: snapshotId,
  mounting: 'B35' as const,
  electrical: {
    power_kw: confirmedNameplate(37, 'kW'),
    frequency_hz: confirmedNameplate(50, 'Hz'),
    supply_mode: {
      value: 'mains' as const,
      origin: 'nameplate' as const,
      confirmation: 'confirmed' as const,
      evidence: []
    },
    rated_current_a: confirmedNameplate(67, 'A'),
    rated_torque_nm: confirmedNameplate(240, 'N.m')
  },
  mechanical: {
    frame: {
      dimensions: {
        A: confirmedMeasurement(356),
        B: confirmedMeasurement(286),
        C: confirmedMeasurement(149),
        H: confirmedMeasurement(225),
        D: confirmedMeasurement(60),
        E: confirmedMeasurement(140),
        F: confirmedMeasurement(18)
      }
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
  }
};

describe('motorEquivalentFromSpecInputSchema', () => {
  it('accepte une specification B35 stricte et applique les valeurs de pagination', () => {
    const result = motorEquivalentFromSpecInputSchema.safeParse(validInput);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.limit).toBe(25);
    expect(result.data.sort).toBe('compatibility');
  });

  it('rejette les champs externes non declares', () => {
    const result = motorEquivalentFromSpecInputSchema.safeParse({
      ...validInput,
      guaranteed_compatibility: true
    });

    expect(result.success).toBe(false);
  });

  it('rejette les chevaux et les pouces', () => {
    const result = motorEquivalentFromSpecInputSchema.safeParse({
      ...validInput,
      electrical: {
        ...validInput.electrical,
        power_kw: confirmedNameplate(50, 'hp')
      },
      mechanical: {
        ...validInput.mechanical,
        frame: {
          dimensions: {
            ...validInput.mechanical.frame.dimensions,
            D: confirmedMeasurement(2.36, 'in')
          }
        }
      }
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(expect.arrayContaining([
      'electrical.power_kw.unit',
      'mechanical.frame.dimensions.D.unit'
    ]));
  });

  it('exige une valeur de puissance, frequence et alimentation', () => {
    const result = motorEquivalentFromSpecInputSchema.safeParse({
      ...validInput,
      electrical: {
        power_kw: { ...validInput.electrical.power_kw, value: null },
        frequency_hz: { ...validInput.electrical.frequency_hz, value: null },
        supply_mode: { ...validInput.electrical.supply_mode, value: null }
      }
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(expect.arrayContaining([
      'electrical.power_kw.value',
      'electrical.frequency_hz.value',
      'electrical.supply_mode.value'
    ]));
  });
});

describe('dimensions mecaniques moteur', () => {
  it('rejette un diametre S et un filetage S simultanes', () => {
    const result = motorFlangeDimensionsSchema.safeParse({
      S: confirmedMeasurement(19),
      S_thread: {
        value: 'M16',
        origin: 'user_measurement',
        confirmation: 'confirmed',
        evidence: []
      }
    });

    expect(result.success).toBe(false);
  });

  it('conserve une suggestion statistique comme origine distincte', () => {
    const result = motorFrameDimensionsSchema.safeParse({
      D: {
        value: 28,
        unit: 'mm',
        origin: 'statistical_suggestion',
        confirmation: 'unconfirmed',
        evidence: [{
          kind: 'sample',
          label: '113 moteurs observes avec D = 28 mm',
          sample_size: 113
        }]
      }
    });

    expect(result.success).toBe(true);
  });

  it('limite la phase 1 aux cinq montages fonctionnels', () => {
    expect(motorMountingSchema.safeParse('B35').success).toBe(true);
    expect(motorMountingSchema.safeParse('B5R').success).toBe(false);
    expect(motorMountingSchema.safeParse('B14R').success).toBe(false);
    expect(motorMountingSchema.safeParse('V1').success).toBe(false);
  });
});

describe('motorCandidateVerdictSchema', () => {
  it('accepte les quatre etats et une preuve catalogue sourcee', () => {
    const result = motorCandidateVerdictSchema.safeParse({
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
      matched_flange: {
        flange_option_id: '8196',
        mounting: 'B35',
        role: 'larger',
        reference: 'FF400',
        requires_option: true
      },
      status: 'under_reservation',
      explanation: 'Compatibilite sous reserve de confirmer la cote D.',
      criteria: [{
        code: 'SHAFT_D',
        label: 'Diametre d arbre D',
        status: 'under_reservation',
        blocking: true,
        expected: 28,
        observed: 28,
        unit: 'mm',
        tolerance: 0,
        delta: 0,
        explanation: 'La valeur attendue provient encore d une suggestion.',
        evidence: [{
          kind: 'source_page',
          label: 'Catalogue Leroy-Somer page 42',
          source_document_id: documentId,
          filename: 'LSHRM_Leroy-Somer.pdf',
          sha256: 'a'.repeat(64),
          pdf_page: 42,
          catalog_page: '42',
          extraction_method: 'pdfplumber-table'
        }],
        affected_by_issue_codes: []
      }],
      issues: [],
      missing_measurements: ['D']
    });

    expect(result.success).toBe(true);
  });

  it('rejette une bride optionnelle non signalee', () => {
    const result = motorCandidateVerdictSchema.safeParse({
      candidate: {
        model_id: '1',
        model_key: 'leroy-somer:cils:280sg',
        operating_point_id: '1',
        brand: 'Leroy-Somer',
        series: 'CILS',
        designation: 'CILS 280 SG',
        variant_key: null,
        power_kw: 75,
        rated_speed_rpm: 2978,
        frequency_hz: 50,
        poles: 2,
        supply_mode: 'mains',
        efficiency_class: 'IE4',
        lifecycle: 'current',
        data_grade: 'B'
      },
      matched_flange: {
        flange_option_id: '1',
        mounting: 'B35',
        role: 'smaller',
        reference: 'FF500',
        requires_option: false
      },
      status: 'satisfied',
      explanation: 'La bride respecte les cotes.',
      criteria: [{
        code: 'FLANGE',
        label: 'Bride',
        status: 'satisfied',
        blocking: true,
        expected: 'FF500',
        observed: 'FF500',
        explanation: 'La bride optionnelle correspond.',
        evidence: [],
        affected_by_issue_codes: []
      }],
      issues: [],
      missing_measurements: []
    });

    expect(result.success).toBe(false);
  });

  it('rejette un identifiant technique non opaque et une anomalie sans restriction explicite', () => {
    const result = motorCandidateVerdictSchema.safeParse({
      candidate: {
        model_id: 'motor-1',
        model_key: 'innomotics:1le1:variant1',
        operating_point_id: '1',
        brand: 'Innomotics',
        series: null,
        designation: '1LE1',
        variant_key: null,
        power_kw: 37,
        rated_speed_rpm: 1475,
        frequency_hz: 50,
        poles: 4,
        supply_mode: 'mains',
        efficiency_class: 'IE3',
        lifecycle: 'current',
        data_grade: 'B'
      },
      matched_flange: null,
      status: 'satisfied',
      explanation: 'Tous les criteres sont compatibles.',
      criteria: [],
      issues: [{
        code: 'IE_BELOW_THRESHOLD',
        severity: 'error',
        message: 'Rendement publie sous le seuil.',
        evidence: []
      }],
      missing_measurements: []
    });

    expect(result.success).toBe(false);
  });
});
