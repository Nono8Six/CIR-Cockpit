import { describe, expect, it } from 'vitest';

import { resolveReferenceLabel } from '@/utils/references/resolveReferenceLabel';

describe('resolveReferenceLabel', () => {
  it('returns the canonical label without mutating the historical value', () => {
    const rawLabel = 'Ancien SAV';
    const result = resolveReferenceLabel('interaction_types', rawLabel, [{
      id: '11111111-1111-4111-8111-111111111111',
      dimension: 'interaction_types',
      source_label: rawLabel,
      target_reference_id: '22222222-2222-4222-8222-222222222222',
      target_label: 'SAV'
    }]);

    expect(result).toBe('SAV');
    expect(rawLabel).toBe('Ancien SAV');
  });
});
