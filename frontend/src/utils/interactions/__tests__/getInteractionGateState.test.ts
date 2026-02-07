import { describe, expect, it } from 'vitest';

import { getInteractionGateState } from '@/utils/interactions/getInteractionGateState';

const base = {
  channel: 'Telephone',
  entityType: 'Prospect',
  contactService: 'Comptabilite',
  interactionType: 'Devis',
  subject: 'Test',
  statusId: 'status-1',
  companyName: 'ACME',
  companyCity: 'Bordeaux',
  contactFirstName: 'Jane',
  contactLastName: 'Doe',
  contactPosition: '',
  contactName: 'Jane Doe',
  contactPhone: '',
  contactEmail: 'jane@acme.fr',
  isClientRelation: false,
  isInternalRelation: false,
  hasSelectedEntity: false,
  hasSelectedContact: false
};

describe('getInteractionGateState', () => {
  it('allows non-client when email only is provided', () => {
    const result = getInteractionGateState(base);
    expect(result.canSave).toBe(true);
    expect(result.gateMessage).toBe('');
  });

  it('blocks non-client when no phone or email', () => {
    const result = getInteractionGateState({ ...base, contactEmail: '' });
    expect(result.canSave).toBe(false);
    expect(result.gateMessage).toBe('Telephone ou email requis.');
  });

  it('allows internal relation with only name fields', () => {
    const result = getInteractionGateState({
      ...base,
      entityType: 'Interne CIR',
      companyName: '',
      companyCity: '',
      contactEmail: '',
      contactPhone: '',
      isInternalRelation: true
    });
    expect(result.canSave).toBe(true);
    expect(result.gateMessage).toBe('');
  });

  it('allows sollicitation with phone only', () => {
    const result = getInteractionGateState({
      ...base,
      entityType: 'Sollicitation',
      companyName: 'ACME',
      contactFirstName: '',
      contactLastName: '',
      contactEmail: '',
      contactPhone: '0612345678'
    });
    expect(result.canSave).toBe(true);
    expect(result.gateMessage).toBe('');
  });
});
