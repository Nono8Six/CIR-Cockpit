import { describe, expect, it } from 'vitest';

import { clientFormSchema } from '../client.schema';

describe('clientFormSchema', () => {
  it('parses and normalizes client_number', () => {
    const result = clientFormSchema.safeParse({
      client_number: '12 34',
      account_type: 'term',
      name: 'Acme',
      address: 'Rue de Paris',
      postal_code: '75001',
      department: '75',
      city: 'Paris',
      siret: null,
      notes: null,
      agency_id: null
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.client_number).toBe('1234');
    }
  });

  it('rejects invalid postal code', () => {
    const result = clientFormSchema.safeParse({
      client_number: '1234',
      account_type: 'cash',
      name: 'Acme',
      address: 'Rue de Paris',
      postal_code: '7500',
      department: '75',
      city: 'Paris'
    });

    expect(result.success).toBe(false);
  });
});
