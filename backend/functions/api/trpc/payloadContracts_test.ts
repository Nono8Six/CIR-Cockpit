import { assertEquals } from 'std/assert';

import {
  dataEntitiesPayloadSchema,
  dataEntityContactsPayloadSchema,
  dataInteractionsPayloadSchema,
  dataProfilePayloadSchema
} from '../../../../shared/schemas/data.schema.ts';

Deno.test('dataEntitiesPayloadSchema supports delete action for super-admin workflows', () => {
  const deletePayload = {
    action: 'delete',
    entity_id: '33333333-3333-4333-8333-333333333333'
  };
  const deleteWithInteractionsPayload = {
    action: 'delete',
    entity_id: '33333333-3333-4333-8333-333333333333',
    delete_related_interactions: true
  };

  assertEquals(dataEntitiesPayloadSchema.safeParse(deletePayload).success, true);
  assertEquals(dataEntitiesPayloadSchema.safeParse(deleteWithInteractionsPayload).success, true);
});

Deno.test('dataEntitiesPayloadSchema supports entity list and search index actions', () => {
  const listPayload = {
    action: 'list',
    entity_type: 'Client',
    agency_id: '11111111-1111-4111-8111-111111111111',
    include_archived: false,
    orphans_only: false
  };

  const prospectListPayload = {
    action: 'list',
    entity_type: 'Prospect'
  };
  const searchIndexPayload = {
    action: 'search_index',
    agency_id: '11111111-1111-4111-8111-111111111111',
    include_archived: false
  };

  assertEquals(dataEntitiesPayloadSchema.safeParse(listPayload).success, true);
  assertEquals(dataEntitiesPayloadSchema.safeParse(prospectListPayload).success, true);
  assertEquals(dataEntitiesPayloadSchema.safeParse(searchIndexPayload).success, true);
});

Deno.test('dataEntitiesPayloadSchema supports supplier save action', () => {
  const supplierPayload = {
    action: 'save',
    agency_id: '11111111-1111-4111-8111-111111111111',
    entity_type: 'Fournisseur',
    entity: {
      name: 'SEA Aquitaine',
      address: '',
      postal_code: '',
      department: '',
      city: '',
      notes: '',
      agency_id: '11111111-1111-4111-8111-111111111111'
    }
  };

  assertEquals(dataEntitiesPayloadSchema.safeParse(supplierPayload).success, true);
});

Deno.test('dataEntityContactsPayloadSchema supports list_by_entity, save and delete actions', () => {
  const savePayload = {
    action: 'save',
    entity_id: '11111111-1111-4111-8111-111111111111',
    contact: {
      first_name: 'Alice',
      last_name: 'Martin',
      email: 'alice@example.com',
      phone: '',
      position: '',
      notes: ''
    }
  };

  const deletePayload = {
    action: 'delete',
    contact_id: '22222222-2222-4222-8222-222222222222'
  };

  const listPayload = {
    action: 'list_by_entity',
    entity_id: '11111111-1111-4111-8111-111111111111',
    include_archived: false
  };

  assertEquals(dataEntityContactsPayloadSchema.safeParse(listPayload).success, true);
  assertEquals(dataEntityContactsPayloadSchema.safeParse(savePayload).success, true);
  assertEquals(dataEntityContactsPayloadSchema.safeParse(deletePayload).success, true);
});

Deno.test('dataProfilePayloadSchema supports only password_changed action', () => {
  const supportedPayload = { action: 'password_changed' };
  const unsupportedPayload = { action: 'get' };

  assertEquals(dataProfilePayloadSchema.safeParse(supportedPayload).success, true);
  assertEquals(dataProfilePayloadSchema.safeParse(unsupportedPayload).success, false);
});

Deno.test('dataInteractionsPayloadSchema supports save, add_timeline_event, list_by_entity and delete', () => {
  const savePayload = {
    action: 'save',
    agency_id: '11111111-1111-4111-8111-111111111111',
    interaction: {
      id: '22222222-2222-4222-8222-222222222222',
      channel: 'Téléphone',
      entity_type: 'Client',
      contact_service: 'Accueil',
      company_name: 'ACME',
      contact_name: 'Jean',
      contact_phone: '0102030405',
      contact_email: '',
      subject: 'Sujet',
      mega_families: [],
      status_id: '33333333-3333-4333-8333-333333333333',
      interaction_type: 'Demande',
      order_ref: '',
      reminder_at: '',
      notes: '',
      entity_id: '44444444-4444-4444-8444-444444444444',
      contact_id: '55555555-5555-4555-8555-555555555555'
    }
  };

  const addTimelinePayload = {
    action: 'add_timeline_event',
    interaction_id: '22222222-2222-4222-8222-222222222222',
    expected_updated_at: '2026-03-01T00:00:00.000Z',
    event: {
      id: 'evt-1',
      date: '2026-03-01T00:00:00.000Z',
      type: 'note',
      content: 'Note test'
    }
  };

  const listPayload = {
    action: 'list_by_entity',
    entity_id: '44444444-4444-4444-8444-444444444444',
    page: 1,
    page_size: 20
  };

  const deletePayload = {
    action: 'delete',
    interaction_id: '22222222-2222-4222-8222-222222222222'
  };

  assertEquals(dataInteractionsPayloadSchema.safeParse(savePayload).success, true);
  assertEquals(dataInteractionsPayloadSchema.safeParse(addTimelinePayload).success, true);
  assertEquals(dataInteractionsPayloadSchema.safeParse(listPayload).success, true);
  assertEquals(dataInteractionsPayloadSchema.safeParse(deletePayload).success, true);
});
