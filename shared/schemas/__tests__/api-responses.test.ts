import { describe, expect, it } from 'vitest';

import {
  dataEntitiesResponseSchema,
  dataEntityContactsResponseSchema,
  dataInteractionDraftResponseSchema,
  dataInteractionsMutationResponseSchema
} from '../system/api-responses';

const entityRow = {
  account_type: null,
  address: '12 rue de la Paix',
  agency_id: 'agency-1',
  archived_at: null,
  cir_agency_id: null,
  cir_commercial_id: null,
  city: 'Paris',
  client_kind: 'standard',
  client_number: 'CL-001',
  country: 'France',
  created_at: '2026-06-01T10:00:00Z',
  created_by: 'user-1',
  department: '75',
  entity_type: 'Client',
  first_name: null,
  id: 'entity-1',
  last_name: null,
  naf_code: '6201Z',
  name: 'Atelier Montorgueil',
  notes: null,
  official_data_source: 'insee',
  official_data_synced_at: '2026-06-01T10:00:00Z',
  official_name: 'Atelier Montorgueil SAS',
  postal_code: '75002',
  primary_email: 'contact@example.fr',
  primary_phone: '0102030405',
  siren: '123456789',
  siret: '12345678900011',
  supplier_code: null,
  supplier_number: null,
  updated_at: '2026-06-01T10:00:00Z'
};

const contactRow = {
  archived_at: null,
  created_at: '2026-06-01T10:00:00Z',
  email: 'camille@example.fr',
  entity_id: 'entity-1',
  first_name: 'Camille',
  id: 'contact-1',
  last_name: 'Durand',
  notes: null,
  phone: '0102030405',
  position: 'Direction',
  updated_at: '2026-06-01T10:00:00Z'
};

const interactionRow = {
  agency_id: 'agency-1',
  channel: 'email',
  company_name: 'Atelier Montorgueil',
  contact_email: 'camille@example.fr',
  contact_id: 'contact-1',
  contact_name: 'Camille Durand',
  contact_phone: '0102030405',
  contact_service: 'Direction',
  created_at: '2026-06-01T10:00:00Z',
  created_by: 'user-1',
  entity_id: 'entity-1',
  entity_type: 'Client',
  id: 'interaction-1',
  interaction_type: 'Appel',
  last_action_at: '2026-06-01T10:00:00Z',
  mega_families: ['Administratif'],
  notes: null,
  order_ref: null,
  reminder_at: null,
  status: 'En cours',
  status_id: 'status-1',
  status_is_terminal: false,
  subject: 'Suivi dossier',
  timeline: [{ type: 'created', at: '2026-06-01T10:00:00Z' }],
  updated_at: '2026-06-01T10:00:00Z',
  updated_by: null
};

describe('api response schemas', () => {
  it('accepts valid entity, contact, interaction and draft rows', () => {
    expect(dataEntitiesResponseSchema.safeParse({
      ok: true,
      entity: entityRow
    }).success).toBe(true);

    expect(dataEntityContactsResponseSchema.safeParse({
      ok: true,
      contact: contactRow
    }).success).toBe(true);

    expect(dataInteractionsMutationResponseSchema.safeParse({
      ok: true,
      interaction: interactionRow
    }).success).toBe(true);

    expect(dataInteractionDraftResponseSchema.safeParse({
      ok: true,
      draft: {
        id: 'draft-1',
        payload: { values: { subject: 'Suivi dossier' } },
        updated_at: '2026-06-01T10:00:00Z'
      }
    }).success).toBe(true);
  });

  it('rejects an empty entity id', () => {
    const result = dataEntitiesResponseSchema.safeParse({
      ok: true,
      entity: {
        ...entityRow,
        id: ' '
      }
    });

    expect(result.success).toBe(false);
  });

  it('rejects a missing required entity field', () => {
    const { name: _name, ...entityWithoutName } = entityRow;
    const result = dataEntitiesResponseSchema.safeParse({
      ok: true,
      entity: entityWithoutName
    });

    expect(result.success).toBe(false);
  });

  it('rejects a wrong interaction field type', () => {
    const result = dataInteractionsMutationResponseSchema.safeParse({
      ok: true,
      interaction: {
        ...interactionRow,
        status_is_terminal: 'false'
      }
    });

    expect(result.success).toBe(false);
  });

  it('rejects non-json draft payload values', () => {
    const result = dataInteractionDraftResponseSchema.safeParse({
      ok: true,
      draft: {
        id: 'draft-1',
        payload: { invalid: undefined },
        updated_at: '2026-06-01T10:00:00Z'
      }
    });

    expect(result.success).toBe(false);
  });
});
