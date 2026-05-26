import { describe, expect, it } from 'vitest';

import { clientFormSchema } from '../entity/client.schema.ts';

describe('clientFormSchema', () => {
  it('parses and normalizes client_number', () => {
    const result = clientFormSchema.safeParse({
      client_number: '12 34',
      client_kind: 'company',
      account_type: 'term',
      name: 'Acme',
      address: 'Rue de Paris',
      postal_code: '75001',
      department: '75',
      city: 'Paris',
      siret: null,
      notes: null,
      agency_id: '11111111-1111-4111-8111-111111111111'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.client_number).toBe('1234');
    }
  });

  it('rejects invalid postal code', () => {
    const result = clientFormSchema.safeParse({
      client_number: '1234',
      client_kind: 'company',
      account_type: 'cash',
      name: 'Acme',
      address: 'Rue de Paris',
      postal_code: '7500',
      department: '75',
      city: 'Paris',
      agency_id: '11111111-1111-4111-8111-111111111111'
    });

    expect(result.success).toBe(false);
  });

  it('accepts individual clients with cash account and a primary contact', () => {
    const result = clientFormSchema.safeParse({
      client_number: '5678',
      client_kind: 'individual',
      account_type: 'cash',
      name: 'Martin Alice',
      address: '',
      postal_code: '33000',
      department: '33',
      city: 'Bordeaux',
      siret: null,
      notes: null,
      cir_commercial_id: null,
      agency_id: '11111111-1111-4111-8111-111111111111',
      primary_contact: {
        first_name: 'Alice',
        last_name: 'Martin',
        phone: '0601020304',
        email: '',
        position: '',
        notes: ''
      }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.client_kind).toBe('individual');
      expect(result.data.account_type).toBe('cash');
      expect(result.data.primary_contact.last_name).toBe('Martin');
    }
  });

  it('rejects departments that do not match the entities table constraint', () => {
    const result = clientFormSchema.safeParse({
      client_number: '1234',
      client_kind: 'company',
      account_type: 'cash',
      name: 'Acme',
      address: 'Rue de Paris',
      postal_code: '75001',
      department: '2A',
      city: 'Paris',
      agency_id: '11111111-1111-4111-8111-111111111111'
    });

    expect(result.success).toBe(false);
  });
});
