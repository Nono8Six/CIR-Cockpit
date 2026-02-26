import { describe, expect, it } from 'vitest';

import { dataInteractionsPayloadSchema } from '../../../../shared/schemas/data.schema';
import { interactionFormSchema } from '@/schemas/interactionSchema';
import { Channel } from '@/types';

const base = {
  channel: Channel.PHONE,
  entity_type: 'Prospect',
  contact_service: 'Comptabilite',
  company_name: 'ACME',
  company_city: 'Bordeaux',
  contact_first_name: 'Jane',
  contact_last_name: 'Doe',
  contact_position: '',
  contact_name: 'Jane Doe',
  contact_phone: '',
  contact_email: 'jane@acme.fr',
  subject: 'Test',
  mega_families: [],
  status_id: 'status-1',
  interaction_type: 'Devis',
  order_ref: '',
  reminder_at: '',
  notes: '',
  entity_id: '',
  contact_id: ''
};

describe('interactionFormSchema', () => {
  it('accepts non-client with email only', () => {
    expect(() => interactionFormSchema.parse(base)).not.toThrow();
  });

  it('rejects when phone and email are both missing', () => {
    const invalid = { ...base, contact_email: '' };
    const result = interactionFormSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts sollicitation with phone only and no name', () => {
    const solicitation = {
      ...base,
      entity_type: 'Sollicitation',
      contact_first_name: '',
      contact_last_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '0612345678'
    };
    expect(() => interactionFormSchema.parse(solicitation)).not.toThrow();
  });

  it('keeps backend data payload rules aligned with form schema', () => {
    const payload = {
      action: 'save',
      agency_id: '11111111-1111-1111-1111-111111111111',
      interaction: {
        ...base,
        id: '22222222-2222-2222-2222-222222222222',
        contact_email: '',
        contact_phone: ''
      }
    };
    const result = dataInteractionsPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys in shared interaction payloads', () => {
    const payload = {
      action: 'save',
      agency_id: '11111111-1111-1111-1111-111111111111',
      interaction: {
        ...base,
        id: '22222222-2222-2222-2222-222222222222',
        extra_field: 'forbidden'
      },
      extra_field: 'forbidden'
    };
    const result = dataInteractionsPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
