import { describe, expect, it } from 'vitest';

import { getDepartmentFromPostalCode } from '../entityOnboarding.utils';

describe('getDepartmentFromPostalCode', () => {
  it('returns two digits to match the entities.department constraint', () => {
    expect(getDepartmentFromPostalCode('75001')).toBe('75');
    expect(getDepartmentFromPostalCode('97100')).toBe('97');
  });
});
