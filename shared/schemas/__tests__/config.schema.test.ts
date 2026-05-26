import { describe, expect, it } from 'vitest';

import {
  configReferenceActionInputSchema,
  configUsageSnapshotSchema
} from '../system/config.schema.ts';

const agencyId = '11111111-1111-4111-8111-111111111111';

const usageSnapshot = {
  agency_id: agencyId,
  dimensions: {
    statuses: [
      {
        label: 'À traiter',
        reference_id: '22222222-2222-4222-8222-222222222222',
        sort_order: 1,
        usage_count: 4,
        state: 'reference_used'
      }
    ],
    services: [],
    families: [],
    interaction_types: [
      {
        label: 'Ancien type',
        reference_id: null,
        sort_order: null,
        usage_count: 1,
        state: 'used_not_in_reference'
      }
    ],
  },
  totals: {
    used_not_in_reference: 1,
    referenced_values: 1,
    used_values: 2
  }
};

describe('configUsageSnapshotSchema', () => {
  it('accepts the strict usage snapshot contract', () => {
    const result = configUsageSnapshotSchema.safeParse(usageSnapshot);

    expect(result.success).toBe(true);
  });

  it('rejects unknown fields in usage rows', () => {
    const result = configUsageSnapshotSchema.safeParse({
      ...usageSnapshot,
      dimensions: {
        ...usageSnapshot.dimensions,
        statuses: [
          {
            ...usageSnapshot.dimensions.statuses[0],
            destructive_action: 'delete'
          }
        ]
      }
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid usage states', () => {
    const result = configUsageSnapshotSchema.safeParse({
      ...usageSnapshot,
      dimensions: {
        ...usageSnapshot.dimensions,
        statuses: [
          {
            ...usageSnapshot.dimensions.statuses[0],
            state: 'maybe_used'
          }
        ]
      }
    });

    expect(result.success).toBe(false);
  });
});

describe('configReferenceActionInputSchema', () => {
  it('accepts an explicit delete action for an unused service label', () => {
    const result = configReferenceActionInputSchema.safeParse({
      action: 'delete',
      agency_id: agencyId,
      dimension: 'services',
      label: 'Atelier'
    });

    expect(result.success).toBe(true);
  });

  it('accepts an explicit status rename action by stable id', () => {
    const result = configReferenceActionInputSchema.safeParse({
      action: 'rename',
      agency_id: agencyId,
      dimension: 'statuses',
      reference_id: '22222222-2222-4222-8222-222222222222',
      next_label: 'À qualifier'
    });

    expect(result.success).toBe(true);
  });

  it('rejects unknown fields on reference actions', () => {
    const result = configReferenceActionInputSchema.safeParse({
      action: 'delete',
      agency_id: agencyId,
      dimension: 'families',
      label: 'FREINAGE',
      silent: true
    });

    expect(result.success).toBe(false);
  });

  it('rejects agency tier labels as editable settings references', () => {
    const result = configReferenceActionInputSchema.safeParse({
      action: 'delete',
      agency_id: agencyId,
      dimension: 'entities',
      label: 'Client'
    });

    expect(result.success).toBe(false);
  });
});
