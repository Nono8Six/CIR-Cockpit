import { assertEquals } from 'std/assert';

import {
  CAN_RUN_NETWORK_INTEGRATION,
  getContext,
  postApi,
  readBoolean,
  readContactFromPayload,
  readEntityFromPayload,
  readString,
  readValue
} from './helpers.ts';

Deno.test({
  name: 'POST data routes forbid cross-agency mutations for non super-admin users',
  ignore: !CAN_RUN_NETWORK_INTEGRATION,
  fn: async () => {
    const context = await getContext();
    const foreignAgencyId = crypto.randomUUID();

    const entitiesForbidden = await postApi('data.entities', context.userToken, {
      action: 'save',
      agency_id: foreignAgencyId,
      entity_type: 'Prospect',
      entity: {
        name: 'P3 cross agency blocked',
        address: '2 rue de Test',
        postal_code: '75001',
        department: '75',
        city: 'Paris',
        siret: '',
        notes: '',
        agency_id: foreignAgencyId
      }
    });
    assertEquals(entitiesForbidden.status, 403);
    assertEquals(readString(entitiesForbidden.payload, 'code'), 'AUTH_FORBIDDEN');

    const configForbidden = await postApi('data.config', context.userToken, {
      agency_id: foreignAgencyId,
      statuses: context.configStatuses,
      services: context.configServices,
      entities: context.configEntities,
      families: context.configFamilies,
      interactionTypes: context.configInteractionTypes
    });
    assertEquals(configForbidden.status, 403);
    assertEquals(readString(configForbidden.payload, 'code'), 'AUTH_FORBIDDEN');
  }
});

Deno.test({
  name: 'data routes execute service + DB with valid payloads',
  ignore: !CAN_RUN_NETWORK_INTEGRATION,
  fn: async () => {
    const context = await getContext();

    const profileUpdate = await postApi('data.profile', context.userToken, {
      action: 'password_changed'
    });
    assertEquals(profileUpdate.status, 200);
    assertEquals(readBoolean(profileUpdate.payload, 'ok'), true);

    const entityName = `P2 integration prospect ${Date.now()}`;
    const createdEntity = await postApi('data.entities', context.userToken, {
      action: 'save',
      agency_id: context.agencyId,
      entity_type: 'Prospect',
      entity: {
        name: entityName,
        address: '1 rue de Test',
        postal_code: '75001',
        department: '75',
        city: 'Paris',
        siret: '',
        notes: '',
        agency_id: context.agencyId
      }
    });
    assertEquals(createdEntity.status, 200);
    const entity = readEntityFromPayload(createdEntity.payload);
    const entityId = readString(entity, 'id');
    assertEquals(Boolean(entityId), true);

    const archivedEntity = await postApi('data.entities', context.userToken, {
      action: 'archive',
      entity_id: entityId,
      archived: true
    });
    assertEquals(archivedEntity.status, 200);
    assertEquals(readBoolean(archivedEntity.payload, 'ok'), true);

    const restoredEntity = await postApi('data.entities', context.userToken, {
      action: 'archive',
      entity_id: entityId,
      archived: false
    });
    assertEquals(restoredEntity.status, 200);
    assertEquals(readBoolean(restoredEntity.payload, 'ok'), true);

    const convertedEntity = await postApi('data.entities', context.userToken, {
      action: 'convert_to_client',
      entity_id: entityId,
      convert: {
        client_number: String(Date.now()).slice(-10),
        account_type: 'term'
      }
    });
    assertEquals(convertedEntity.status, 200);
    assertEquals(readBoolean(convertedEntity.payload, 'ok'), true);

    const createdContact = await postApi('data.entity-contacts', context.userToken, {
      action: 'save',
      entity_id: entityId,
      contact: {
        first_name: 'P2',
        last_name: 'Integration',
        email: '',
        phone: '0102030405',
        position: '',
        notes: ''
      }
    });
    assertEquals(createdContact.status, 200);
    const contact = readContactFromPayload(createdContact.payload);
    const contactId = readString(contact, 'id');
    assertEquals(Boolean(contactId), true);

    const deletedContact = await postApi('data.entity-contacts', context.userToken, {
      action: 'delete',
      contact_id: contactId
    });
    assertEquals(deletedContact.status, 200);
    assertEquals(readBoolean(deletedContact.payload, 'ok'), true);

    const savedInteraction = await postApi('data.interactions', context.userToken, {
      action: 'save',
      agency_id: context.agencyId,
      interaction: {
        id: crypto.randomUUID(),
        channel: 'Téléphone',
        entity_type: 'Client',
        contact_service: 'Accueil',
        company_name: '',
        contact_name: '',
        contact_phone: '0102030405',
        contact_email: '',
        subject: 'Integration P2',
        mega_families: [],
        status_id: context.statusId,
        interaction_type: context.interactionType,
        order_ref: '',
        reminder_at: new Date().toISOString(),
        notes: '',
        entity_id: entityId
      }
    });
    assertEquals(savedInteraction.status, 200);
    assertEquals(readBoolean(savedInteraction.payload, 'ok'), true);
    const savedInteractionPayload = readValue(savedInteraction.payload, 'interaction');
    const interactionId = readString(savedInteractionPayload, 'id');
    const interactionUpdatedAt = readString(savedInteractionPayload, 'updated_at');
    assertEquals(Boolean(interactionId), true);
    assertEquals(Boolean(interactionUpdatedAt), true);

    const updatedInteraction = await postApi('data.interactions', context.userToken, {
      action: 'add_timeline_event',
      interaction_id: interactionId,
      expected_updated_at: interactionUpdatedAt,
      event: {
        id: crypto.randomUUID(),
        type: 'note',
        content: 'Evenement integration P3',
        author: 'integration',
        date: new Date().toISOString()
      },
      updates: {
        notes: 'note integration p3'
      }
    });
    assertEquals(updatedInteraction.status, 200);
    assertEquals(readBoolean(updatedInteraction.payload, 'ok'), true);

    const listedInteractions = await postApi('data.interactions', context.userToken, {
      action: 'list_by_entity',
      entity_id: entityId,
      page: 1,
      page_size: 20
    });
    assertEquals(listedInteractions.status, 200);
    assertEquals(readBoolean(listedInteractions.payload, 'ok'), true);
    const listedPayload = readValue(listedInteractions.payload, 'interactions');
    assertEquals(Array.isArray(listedPayload), true);

    const deletedInteraction = await postApi('data.interactions', context.userToken, {
      action: 'delete',
      interaction_id: interactionId
    });
    assertEquals(deletedInteraction.status, 200);
    assertEquals(readBoolean(deletedInteraction.payload, 'ok'), true);
    assertEquals(readString(deletedInteraction.payload, 'interaction_id'), interactionId);

    const savedConfig = await postApi('data.config', context.userToken, {
      agency_id: context.agencyId,
      statuses: context.configStatuses,
      services: context.configServices,
      entities: context.configEntities,
      families: context.configFamilies,
      interactionTypes: context.configInteractionTypes
    });
    assertEquals(savedConfig.status, 200);
    assertEquals(readBoolean(savedConfig.payload, 'ok'), true);

    const invalidConfig = await postApi('data.config', context.userToken, {
      agency_id: context.agencyId,
      statuses: [{ id: context.statusId, label: 'invalid status', category: 'invalid' }],
      services: context.configServices,
      entities: context.configEntities,
      families: context.configFamilies,
      interactionTypes: context.configInteractionTypes
    });
    assertEquals(invalidConfig.status, 400);
    assertEquals(readString(invalidConfig.payload, 'code'), 'CONFIG_INVALID');
  }
});
