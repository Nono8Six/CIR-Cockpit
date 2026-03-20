import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  applyAppSearchScope,
  parseAppSearchQuery,
  useAppSearchData
} from '@/app/useAppSearchData';
import { Channel, type Entity, type EntityContact, type Interaction } from '@/types';

const buildEntity = (overrides: Partial<Entity> = {}): Entity => ({
  id: 'entity-1',
  account_type: 'term',
  address: null,
  agency_id: 'agency-1',
  archived_at: null,
  city: 'Paris',
  client_number: '001122',
  country: 'FR',
  created_at: '2025-01-01T00:00:00Z',
  created_by: null,
  department: '75',
  entity_type: 'Client',
  name: 'Client Alpha',
  notes: null,
  postal_code: '75001',
  siret: '12345678900011',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides
});

const buildContact = (overrides: Partial<EntityContact> = {}): EntityContact => ({
  id: 'contact-1',
  archived_at: null,
  created_at: '2025-01-01T00:00:00Z',
  email: 'alice@cir.fr',
  entity_id: 'entity-1',
  first_name: 'Alice',
  last_name: 'Martin',
  notes: null,
  phone: '0102030405',
  position: 'Achats',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides
});

const buildInteraction = (overrides: Partial<Interaction> = {}): Interaction => ({
  id: 'interaction-1',
  agency_id: 'agency-1',
  channel: Channel.PHONE,
  company_name: 'Client Alpha',
  contact_email: 'alice@cir.fr',
  contact_id: null,
  contact_name: 'Alice Martin',
  contact_phone: '0102030405',
  contact_service: 'Achats',
  created_at: '2025-01-01T00:00:00Z',
  created_by: 'user-1',
  entity_id: 'entity-1',
  entity_type: 'Client',
  interaction_type: 'Appel',
  last_action_at: '2025-01-01T00:00:00Z',
  mega_families: [],
  notes: null,
  order_ref: 'CMD-001',
  reminder_at: null,
  status: 'Nouveau',
  status_id: 'status-new',
  status_is_terminal: false,
  subject: 'Demande de rappel',
  timeline: [],
  updated_at: '2025-01-01T00:00:00Z',
  updated_by: null,
  ...overrides
});

describe('app search helpers', () => {
  it('parses and reapplies search scope prefixes consistently', () => {
    expect(parseAppSearchQuery('@ Alice')).toEqual({
      scope: 'contacts',
      normalizedQuery: 'Alice'
    });

    expect(parseAppSearchQuery('#appel')).toEqual({
      scope: 'interactions',
      normalizedQuery: 'appel'
    });

    expect(applyAppSearchScope('clients', '#Alpha')).toBe('!Alpha');
    expect(applyAppSearchScope('all', '@Alpha')).toBe('Alpha');
  });
});

describe('useAppSearchData', () => {
  const client = buildEntity();
  const prospect = buildEntity({
    id: 'entity-2',
    client_number: null,
    entity_type: 'Prospect',
    name: 'Prospect Alpha'
  });
  const contact = buildContact();
  const interaction = buildInteraction();

  const entitySearchIndex = {
    entities: [client, prospect],
    contacts: [contact]
  };

  it('limits contact-scoped queries to contacts only', () => {
    const { result } = renderHook(() =>
      useAppSearchData({
        searchQuery: '@Alice',
        interactions: [interaction],
        entitySearchIndex,
        defaultStatusId: 'status-new'
      })
    );

    expect(result.current.filteredContacts).toHaveLength(1);
    expect(result.current.filteredInteractions).toHaveLength(0);
    expect(result.current.filteredClients).toHaveLength(0);
    expect(result.current.filteredProspects).toHaveLength(0);
  });

  it('limits interaction-scoped queries to interactions only', () => {
    const { result } = renderHook(() =>
      useAppSearchData({
        searchQuery: '#rappel',
        interactions: [interaction],
        entitySearchIndex,
        defaultStatusId: 'status-new'
      })
    );

    expect(result.current.filteredInteractions).toHaveLength(1);
    expect(result.current.filteredContacts).toHaveLength(0);
    expect(result.current.filteredClients).toHaveLength(0);
    expect(result.current.filteredProspects).toHaveLength(0);
  });

  it('limits client-scoped queries to clients and excludes prospects', () => {
    const { result } = renderHook(() =>
      useAppSearchData({
        searchQuery: '!Alpha',
        interactions: [interaction],
        entitySearchIndex,
        defaultStatusId: 'status-new'
      })
    );

    expect(result.current.filteredClients).toHaveLength(1);
    expect(result.current.filteredProspects).toHaveLength(0);
    expect(result.current.filteredContacts).toHaveLength(0);
    expect(result.current.filteredInteractions).toHaveLength(0);
  });
});
