import { describe, expect, it } from 'vitest';

import type { ConfigUsageRow } from '../../../../../../shared/schemas/system/config.schema';
import { groupSystemManagedRows } from '../system-managed-values';

const row = (
  dimension: ConfigUsageRow['dimension'],
  label: string,
  usageCount = 1
): ConfigUsageRow => ({
  dimension,
  label,
  reference_id: null,
  sort_order: null,
  category: null,
  is_active: false,
  usage_count: usageCount,
  state: 'system_managed'
});

describe('groupSystemManagedRows', () => {
  it('groups supplier technical values into one business pathway', () => {
    const groups = groupSystemManagedRows([
      row('services', 'Fournisseur'),
      row('interaction_types', 'Interaction fournisseur')
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe('Interactions fournisseur');
    expect(groups[0].rows).toHaveLength(2);
  });

  it('explains an intentionally missing initial status separately', () => {
    const groups = groupSystemManagedRows([row('statuses', '<sans valeur>')]);

    expect(groups[0].title).toBe('Statut initial non requis');
    expect(groups[0].description).toContain('Ce n’est pas une donnée perdue');
  });
});
