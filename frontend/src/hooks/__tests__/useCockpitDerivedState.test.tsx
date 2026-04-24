import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCockpitDerivedState } from '@/hooks/useCockpitDerivedState';
import { Channel } from '@/types';

const buildParams = (overrides: Partial<Parameters<typeof useCockpitDerivedState>[0]> = {}) => ({
  channel: Channel.PHONE,
  entityType: '',
  contactService: 'Atelier',
  interactionType: 'Demande',
  companyName: '',
  companyCity: '',
  contactFirstName: '',
  contactLastName: '',
  contactPosition: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  subject: '',
  megaFamilies: [],
  statusId: 'status-default',
  orderRef: '',
  reminderAt: '',
  notes: '',
  entityId: '',
  contactId: '',
  config: {
    statuses: [
      {
        id: 'status-default',
        label: 'Nouveau',
        category: 'todo' as const,
        is_terminal: false,
        is_default: true,
        sort_order: 1
      }
    ],
    services: ['Atelier'],
    entities: ['Client'],
    families: ['Freinage'],
    interactionTypes: ['Demande']
  },
  knownCompanies: [],
  selectedEntity: null,
  isClientRelation: false,
  ...overrides
});

describe('useCockpitDerivedState', () => {
  it('ne considere pas les valeurs par defaut comme un brouillon utilisateur', () => {
    const { result } = renderHook(() => useCockpitDerivedState(buildParams()));

    expect(result.current.hasDraftContent).toBe(false);
  });

  it('detecte un vrai contenu utilisateur', () => {
    const { result } = renderHook(() =>
      useCockpitDerivedState(buildParams({ subject: 'Demande pieces' }))
    );

    expect(result.current.hasDraftContent).toBe(true);
  });

  it('detecte une entite rattachee comme contenu utilisateur', () => {
    const { result } = renderHook(() =>
      useCockpitDerivedState(buildParams({ entityId: 'entity-1' }))
    );

    expect(result.current.hasDraftContent).toBe(true);
  });
});
