import { describe, expect, it } from 'vitest';

import {
  configIntegrityInteractionUpdateInputSchema,
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
        category: 'todo',
        is_active: true,
        usage_count: 4,
        state: 'active_used'
      }
    ],
    services: [],
    families: [],
    interaction_types: [
      {
        label: 'Ancien type',
        reference_id: null,
        sort_order: null,
        category: null,
        is_active: true,
        usage_count: 1,
        state: 'unresolved'
      }
    ],
  },
  totals: {
    unresolved: 1,
    archived: 0,
    resolved: 0,
    system_managed: 0,
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

describe('configIntegrityInteractionUpdateInputSchema', () => {
  it('accepts a targeted correction toward an active reference', () => {
    const result = configIntegrityInteractionUpdateInputSchema.safeParse({
      agency_id: agencyId,
      interaction_id: 'interaction-1',
      dimension: 'interaction_types',
      source_label: 'Autre',
      target_reference_id: '22222222-2222-4222-8222-222222222222'
    });

    expect(result.success).toBe(true);
  });

  it('rejects unknown fields on targeted corrections', () => {
    const result = configIntegrityInteractionUpdateInputSchema.safeParse({
      agency_id: agencyId,
      interaction_id: 'interaction-1',
      dimension: 'interaction_types',
      source_label: 'Autre',
      target_reference_id: '22222222-2222-4222-8222-222222222222',
      update_all: true
    });

    expect(result.success).toBe(false);
  });
});

describe('configReferenceActionInputSchema', () => {
  it('accepts an explicit archive action for a service label', () => {
    const result = configReferenceActionInputSchema.safeParse({
      action: 'archive',
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
      action: 'archive',
      agency_id: agencyId,
      dimension: 'families',
      label: 'FREINAGE',
      silent: true
    });

    expect(result.success).toBe(false);
  });

  it('rejects agency tier labels as editable settings references', () => {
    const result = configReferenceActionInputSchema.safeParse({
      action: 'archive',
      agency_id: agencyId,
      dimension: 'entities',
      label: 'Client'
    });

    expect(result.success).toBe(false);
  });
});
