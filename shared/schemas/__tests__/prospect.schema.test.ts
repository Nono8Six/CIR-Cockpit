import { describe, expect, it } from 'vitest';

import { prospectFormSchema } from '../prospect.schema';

describe('prospectFormSchema', () => {
  it('accepts valid payload', () => {
    const result = prospectFormSchema.safeParse({
      name: 'Prospect',
      address: '',
      postal_code: '75001',
      department: '',
      city: 'Paris',
      siret: '',
      notes: '',
      agency_id: '11111111-1111-1111-1111-111111111111'
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid postal code', () => {
    const result = prospectFormSchema.safeParse({
      name: 'Prospect',
      address: '',
      postal_code: '7500',
      department: '',
      city: 'Paris',
      agency_id: '11111111-1111-1111-1111-111111111111'
    });

    expect(result.success).toBe(false);
  });
});
