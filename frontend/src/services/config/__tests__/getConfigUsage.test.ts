import { describe, expect, it } from 'vitest';

import { parseConfigUsageResponse } from '../getConfigUsage';

describe('parseConfigUsageResponse', () => {
  it('normalizes legacy usage rows without category and active state', () => {
    const response = parseConfigUsageResponse({
      ok: true,
      usage: {
        agency_id: '11111111-1111-4111-8111-111111111111',
        dimensions: {
          statuses: [
            {
              label: 'A faire',
              reference_id: '22222222-2222-4222-8222-222222222222',
              sort_order: 1,
              usage_count: 2,
              state: 'reference_used'
            }
          ],
          services: [],
          families: [],
          interaction_types: []
        },
        totals: {
          used_not_in_reference: 0,
          referenced_values: 1,
          used_values: 1
        }
      }
    });

    expect(response.usage.dimensions.statuses[0]).toMatchObject({
      category: null,
      is_active: true
    });
  });
});
