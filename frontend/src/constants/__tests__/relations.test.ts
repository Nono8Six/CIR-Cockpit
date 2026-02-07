import { describe, expect, it } from 'vitest';

import { isProspectRelationValue } from '@/constants/relations';

describe('relations helpers', () => {
  it('detects prospect/particulier labels', () => {
    expect(isProspectRelationValue('Prospect')).toBe(true);
    expect(isProspectRelationValue('Prospect / Particulier')).toBe(true);
    expect(isProspectRelationValue('Client')).toBe(false);
  });
});
