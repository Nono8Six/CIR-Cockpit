import { describe, expect, it } from 'vitest';

import { validateInteractionDraft } from '@/services/interactions/validateInteractionDraft';
import { Channel, InteractionDraft } from '@/types';

const makeDraft = (overrides: Partial<InteractionDraft> = {}): InteractionDraft => ({
  channel: Channel.EMAIL,
  entity_type: 'Prospect',
  contact_service: 'Support',
  interaction_type: 'Devis',
  company_name: 'ACME',
  contact_name: 'Jane Doe',
  contact_phone: '0600000000',
  subject: 'Test',
  mega_families: [],
  status_id: 'status-1',
  timeline: [],
  ...overrides
});

describe('validateInteractionDraft', () => {
  it('passes valid drafts', () => {
    expect(() => validateInteractionDraft(makeDraft())).not.toThrow();
  });

  it('throws AppError when required fields missing', () => {
    const invalid = makeDraft({ company_name: '' });
    expect(() => validateInteractionDraft(invalid)).toThrow(/Champs obligatoires/);
  });

  it('allows internal relation without contact method', () => {
    const internal = makeDraft({
      entity_type: 'Interne CIR',
      company_name: 'CIR',
      contact_phone: '',
      contact_email: ''
    });
    expect(() => validateInteractionDraft(internal)).not.toThrow();
  });

  it('allows sollicitation without contact name but with phone', () => {
    const solicitation = makeDraft({
      entity_type: 'Sollicitation',
      contact_name: '',
      contact_phone: '0612345678',
      contact_email: ''
    });
    expect(() => validateInteractionDraft(solicitation)).not.toThrow();
  });
});
