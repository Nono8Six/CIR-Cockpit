import { describe, expect, it } from 'vitest';

import {
  listConfigurationsInputSchema,
  saveConfigurationInputSchema,
  savedConfigurationSchema
} from '../configurator/configuration.schema.ts';

const snapshotId = '11111111-1111-4111-8111-111111111111';

const confirmedValue = <T>(value: T, unit?: string) => ({
  value,
  unit,
  origin: 'nameplate' as const,
  confirmation: 'confirmed' as const,
  evidence: [{
    kind: 'measurement' as const,
    label: 'Valeur confirmee sur la plaque'
  }]
});

const validMotorConfiguration = {
  schema_version: 1 as const,
  scope: 'agency' as const,
  label: 'Remplacement pompe atelier',
  snapshot_id: snapshotId,
  configuration: {
    domain: 'motor' as const,
    payload_schema_version: 1 as const,
    payload: {
      spec: {
        schema_version: 1 as const,
        snapshot_id: snapshotId,
        mounting: 'B35' as const,
        electrical: {
          power_kw: confirmedValue(37, 'kW'),
          network: confirmedValue('Reseau usine 400 V / 50 Hz'),
          frequency_hz: confirmedValue(50, 'Hz'),
          supply_mode: confirmedValue('mains' as const)
        },
        mechanical: {
          frame: {
            dimensions: {}
          },
          shaft: {
            dimensions: {}
          }
        }
      },
      selection: {
        candidate: {
          model_id: '1',
          model_key: 'leroy-somer:lshrm:160mr1:variant46',
          operating_point_id: '1',
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
        ruleset_id: 'motor.compatibility.cir',
        ruleset_version: 1,
        mechanical_status: 'satisfied',
        electrical_status: 'satisfied',
        application_status: 'satisfied',
        overall_status: 'satisfied',
        explanation: 'Tous les criteres documentaires sont satisfaits.',
        criteria: [{
          code: 'POWER',
          label: 'Puissance',
          status: 'satisfied',
          blocking: true,
          expected: 37,
          observed: 37,
          unit: 'kW',
          explanation: 'La puissance correspond.',
          evidence: [{
            kind: 'measurement' as const,
            label: 'Valeur confirmee sur la plaque'
          }],
          affected_by_issue_codes: []
        }],
        adaptations_required: [],
        checks_required: [],
        facts_used: [{
          fact_path: 'electrical.power_kw',
          value: 37,
          unit: 'kW',
          origin: 'nameplate',
          confirmation: 'confirmed',
          evidence: [{
            kind: 'measurement' as const,
            label: 'Valeur confirmee sur la plaque'
          }]
        }],
        rules_applied: [{
          rule_code: 'POWER',
          ruleset_id: 'motor.compatibility.cir',
          ruleset_version: 1,
          status: 'satisfied',
          decisive: true,
          fact_paths: ['electrical.power_kw']
        }],
        issues: [],
        missing_facts: []
      },
      computed_at: '2026-07-26T10:00:00.000Z'
    }
  }
};

describe('saveConfigurationInputSchema', () => {
  it('accepte une configuration moteur partagee avec l agence', () => {
    expect(saveConfigurationInputSchema.safeParse(validMotorConfiguration).success).toBe(true);
  });

  it('accepte aussi une configuration personnelle et rejette les champs non declares', () => {
    const personal = saveConfigurationInputSchema.safeParse({
      ...validMotorConfiguration,
      scope: 'personal'
    });
    const polluted = saveConfigurationInputSchema.safeParse({
      ...validMotorConfiguration,
      agency_id: '22222222-2222-4222-8222-222222222222'
    });

    expect(personal.success).toBe(true);
    expect(polluted.success).toBe(false);
  });

  it('rejette un payload rattache a un autre snapshot', () => {
    const result = saveConfigurationInputSchema.safeParse({
      ...validMotorConfiguration,
      configuration: {
        ...validMotorConfiguration.configuration,
        payload: {
          ...validMotorConfiguration.configuration.payload,
          spec: {
            ...validMotorConfiguration.configuration.payload.spec,
            snapshot_id: '33333333-3333-4333-8333-333333333333'
          }
        }
      }
    });

    expect(result.success).toBe(false);
  });

  it('rejette une sauvegarde sans snapshot dans la specification', () => {
    const {
      snapshot_id: _snapshotId,
      ...specWithoutSnapshot
    } = validMotorConfiguration.configuration.payload.spec;
    const result = saveConfigurationInputSchema.safeParse({
      ...validMotorConfiguration,
      configuration: {
        ...validMotorConfiguration.configuration,
        payload: {
          ...validMotorConfiguration.configuration.payload,
          spec: specWithoutSnapshot
        }
      }
    });

    expect(result.success).toBe(false);
  });
});

describe('listConfigurationsInputSchema', () => {
  it('applique une liste non archivee et paginee par defaut', () => {
    const result = listConfigurationsInputSchema.safeParse({});

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatchObject({
      scope: 'all',
      include_archived: false,
      limit: 25
    });
  });
});

describe('savedConfigurationSchema', () => {
  it('valide aussi la coherence du snapshot en sortie', () => {
    const result = savedConfigurationSchema.safeParse({
      ...validMotorConfiguration,
      id: '44444444-4444-4444-8444-444444444444',
      agency_id: '55555555-5555-4555-8555-555555555555',
      owner_id: '66666666-6666-4666-8666-666666666666',
      client_entity_id: null,
      configuration: {
        ...validMotorConfiguration.configuration,
        payload: {
          ...validMotorConfiguration.configuration.payload,
          spec: {
            ...validMotorConfiguration.configuration.payload.spec,
            snapshot_id: '33333333-3333-4333-8333-333333333333'
          }
        }
      },
      created_at: '2026-07-26T10:00:00.000Z',
      updated_at: '2026-07-26T10:00:00.000Z',
      archived_at: null
    });

    expect(result.success).toBe(false);
  });
});
