import { describe, expect, it } from 'vitest';

import { isClientRelationValue, isIndividualRelationValue, isProspectRelationValue } from '@/constants/relations';

describe('relations helpers', () => {
  it('detects prospect labels without merging particuliers', () => {
    expect(isProspectRelationValue('Prospect')).toBe(true);
    expect(isProspectRelationValue('Particulier')).toBe(false);
    expect(isProspectRelationValue('Client')).toBe(false);
  });

  it('detects the new client and individual labels', () => {
    expect(isClientRelationValue('Client à terme')).toBe(true);
    expect(isClientRelationValue('Client comptant')).toBe(true);
    expect(isIndividualRelationValue('Particulier')).toBe(true);
  });
});
