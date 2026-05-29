import { describe, expect, it } from 'vitest';

import { parseConfigGetResponse } from '../getConfigSnapshot';

describe('parseConfigGetResponse', () => {
  it('normalizes legacy config snapshots served before the status history migration', () => {
    const response = parseConfigGetResponse({
      ok: true,
      snapshot: {
        product: {
          feature_flags: { ui_shell_v2: false }
        },
        agency: {
          onboarding: {}
        },
        references: {
          statuses: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              agency_id: '11111111-1111-4111-8111-111111111111',
              label: 'A faire',
              category: 'todo',
              is_default: true,
              is_terminal: false,
              sort_order: 1
            }
          ],
          entities: ['Client'],
          services: ['Atelier'],
          families: ['Freinage'],
          interaction_types: ['Devis'],
          departments: []
        }
      }
    });

    expect(response.snapshot.references.statuses[0]?.is_active).toBe(true);
    expect(response.snapshot.references.historical_statuses).toEqual([]);
    expect('product' in response.snapshot).toBe(false);
  });
});
