import { assertEquals } from '#test/assert';

import { CAN_RUN_NETWORK_INTEGRATION, getApi, getContext, postApi, readBoolean, readContactFromPayload, readEntityFromPayload, readString, readValue, integrationTest } from './helpers.ts';

integrationTest({
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
        name: 'AUDIT_20260604_cross agency blocked',
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
      families: context.configFamilies,
      interactionTypes: context.configInteractionTypes
    });
    assertEquals(configForbidden.status, 403);
    assertEquals(readString(configForbidden.payload, 'code'), 'AUTH_FORBIDDEN');
  }
});

integrationTest({
  name: 'data routes execute service + DB with valid payloads',
  ignore: !CAN_RUN_NETWORK_INTEGRATION,
  fn: async () => {
    const context = await getContext();
    let entityId = '';
    let contactId = '';
    let interactionId = '';
    const draftFormType = `activity-v2-integration-${Date.now()}`;

    try {
      const entityName = `AUDIT_20260604_P2 integration prospect ${Date.now()}`;
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
      entityId = readString(entity, 'id');
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
      const convertedClientNumber = readString(readValue(convertedEntity.payload, 'entity'), 'client_number');
      assertEquals(Boolean(convertedClientNumber), true);

      const unifiedSearch = await getApi('data.searchEntitiesUnified', context.userToken, {
        query: entityName,
        agency_id: context.agencyId,
        family: 'all',
        include_archived: false,
        limit: 10
      });
      assertEquals(unifiedSearch.status, 200);
      assertEquals(readBoolean(unifiedSearch.payload, 'ok'), true);
      assertEquals(Array.isArray(readValue(unifiedSearch.payload, 'results')), true);
      const searchedTiers = readValue(unifiedSearch.payload, 'tiers');
      assertEquals(Array.isArray(searchedTiers), true);

      const tierDirectory = await getApi('directory.tiers-list', context.userToken, {
        scope: { mode: 'selected_agencies', agencyIds: [context.agencyId] },
        query: entityName,
        role_codes: ['client'],
        primary_commercial: 'missing',
        include_archived: false,
        page: 1,
        page_size: 25
      });
      assertEquals(tierDirectory.status, 200);
      assertEquals(readBoolean(tierDirectory.payload, 'ok'), true);
      const tierRows = readValue(tierDirectory.payload, 'rows');
      assertEquals(Array.isArray(tierRows), true);
      assertEquals(
        readString(Array.isArray(tierRows) ? tierRows[0] : null, 'id'),
        entityId,
        JSON.stringify(tierDirectory.payload)
      );

      const compatibilityDirectory = await getApi('directory.list', context.userToken, {
        scope: { mode: 'selected_agencies', agencyIds: [context.agencyId] },
        type: 'client',
        filters: {
          q: entityName,
          departments: [],
          cirCommercialIds: [],
          includeArchived: false
        },
        pagination: { page: 1, pageSize: 25, includeTotal: true },
        sorting: [{ id: 'name', desc: false }]
      });
      assertEquals(compatibilityDirectory.status, 200);
      assertEquals(readBoolean(compatibilityDirectory.payload, 'ok'), true);
      const compatibilityRows = readValue(compatibilityDirectory.payload, 'rows');
      const compatibilityTiers = readValue(compatibilityDirectory.payload, 'tiers');
      assertEquals(
        readString(Array.isArray(compatibilityRows) ? compatibilityRows[0] : null, 'id'),
        entityId,
        JSON.stringify(compatibilityDirectory.payload)
      );
      assertEquals(
        readString(Array.isArray(compatibilityTiers) ? compatibilityTiers[0] : null, 'id'),
        entityId,
        JSON.stringify(compatibilityDirectory.payload)
      );

      const foreignCompatibilityDirectory = await getApi('directory.list', context.userToken, {
        scope: { mode: 'selected_agencies', agencyIds: [crypto.randomUUID()] },
        type: 'client',
        filters: { departments: [], cirCommercialIds: [], includeArchived: false },
        pagination: { page: 1, pageSize: 25, includeTotal: false },
        sorting: [{ id: 'name', desc: false }]
      });
      assertEquals(foreignCompatibilityDirectory.status, 403);
      assertEquals(readString(foreignCompatibilityDirectory.payload, 'code'), 'AUTH_FORBIDDEN');

      const superAdminCompatibilityDirectory = await getApi('directory.list', context.adminToken, {
        scope: { mode: 'selected_agencies', agencyIds: [context.agencyId] },
        type: 'client',
        filters: {
          q: entityName,
          departments: [],
          cirCommercialIds: [],
          includeArchived: false
        },
        pagination: { page: 1, pageSize: 25, includeTotal: false },
        sorting: [{ id: 'name', desc: false }]
      });
      assertEquals(superAdminCompatibilityDirectory.status, 200);
      assertEquals(readBoolean(superAdminCompatibilityDirectory.payload, 'ok'), true);

      const legacyRecord = await getApi('directory.record', context.userToken, {
        kind: 'client',
        clientNumber: convertedClientNumber
      });
      assertEquals(legacyRecord.status, 200);
      assertEquals(readBoolean(legacyRecord.payload, 'ok'), true);
      assertEquals(JSON.stringify(legacyRecord.payload).includes('"tier"'), false);

      const canonicalRecord = await getApi('directory.record', context.userToken, {
        kind: 'client',
        clientNumber: convertedClientNumber,
        includeCanonicalTier: true
      });
      assertEquals(canonicalRecord.status, 200);
      assertEquals(readBoolean(canonicalRecord.payload, 'ok'), true);
      assertEquals(readString(readValue(canonicalRecord.payload, 'tier'), 'id'), entityId);

      const foreignTierDirectory = await getApi('directory.tiers-list', context.userToken, {
        scope: { mode: 'selected_agencies', agencyIds: [crypto.randomUUID()] },
        query: entityName,
        page: 1,
        page_size: 25
      });
      assertEquals(foreignTierDirectory.status, 403);
      assertEquals(readString(foreignTierDirectory.payload, 'code'), 'AUTH_FORBIDDEN');

      const superAdminTierDirectory = await getApi('directory.tiers-list', context.adminToken, {
        scope: { mode: 'all_accessible_agencies' },
        query: entityName,
        page: 1,
        page_size: 25
      });
      assertEquals(superAdminTierDirectory.status, 200);
      assertEquals(readBoolean(superAdminTierDirectory.payload, 'ok'), true);

      const createdContact = await postApi('data.entity-contacts', context.userToken, {
        action: 'save',
        entity_id: entityId,
        contact: {
          first_name: 'AUDIT_20260604',
          last_name: 'Integration',
          email: '',
          phone: '0102030405',
          position: '',
          notes: ''
        }
      });
      assertEquals(createdContact.status, 200);
      const contact = readContactFromPayload(createdContact.payload);
      contactId = readString(contact, 'id');
      assertEquals(Boolean(contactId), true);

      const listedContacts = await postApi('data.entity-contacts', context.userToken, {
        action: 'list_by_entity',
        entity_id: entityId,
        include_archived: false
      });
      assertEquals(listedContacts.status, 200);
      assertEquals(Array.isArray(readValue(listedContacts.payload, 'tier_contacts')), true);

      const createdDraft = await postApi('data.interactions', context.userToken, {
        action: 'draft_save',
        user_id: context.userId,
        agency_id: context.agencyId,
        form_type: draftFormType,
        expected_updated_at: null,
        payload: { values: { subject: 'Brouillon TA-5' } }
      });
      assertEquals(createdDraft.status, 200);
      const initialDraft = readValue(createdDraft.payload, 'draft');
      const initialDraftVersion = readString(initialDraft, 'updated_at');
      assertEquals(Boolean(initialDraftVersion), true);

      const resumedDraft = await postApi('data.interactions', context.userToken, {
        action: 'draft_get',
        user_id: context.userId,
        agency_id: context.agencyId,
        form_type: draftFormType
      });
      assertEquals(resumedDraft.status, 200);
      assertEquals(readString(readValue(resumedDraft.payload, 'draft'), 'updated_at'), initialDraftVersion);

      const modifiedDraft = await postApi('data.interactions', context.userToken, {
        action: 'draft_save',
        user_id: context.userId,
        agency_id: context.agencyId,
        form_type: draftFormType,
        expected_updated_at: initialDraftVersion,
        payload: { values: { subject: 'Brouillon TA-5 modifié' } }
      });
      assertEquals(modifiedDraft.status, 200);

      const staleDraft = await postApi('data.interactions', context.userToken, {
        action: 'draft_save',
        user_id: context.userId,
        agency_id: context.agencyId,
        form_type: draftFormType,
        expected_updated_at: initialDraftVersion,
        payload: { values: { subject: 'Version périmée' } }
      });
      assertEquals(staleDraft.status, 409);
      assertEquals(readString(staleDraft.payload, 'code'), 'CONFLICT');

      const savedInteraction = await postApi('data.interactions', context.userToken, {
        action: 'save',
        agency_id: context.agencyId,
        interaction: {
          id: crypto.randomUUID(),
          channel: 'Téléphone',
          entity_type: 'Client',
          contact_service: context.configServices[0] ?? '',
          company_name: '',
          contact_name: '',
          contact_phone: '0102030405',
          contact_email: '',
          subject: 'AUDIT_20260604 integration',
          mega_families: context.configFamilies.slice(0, 1),
          status_id: context.statusId,
          interaction_type: context.interactionType,
          order_ref: '',
          notes: '',
          entity_id: entityId,
          contact_id: contactId
        }
      });
      assertEquals(savedInteraction.status, 200);
      assertEquals(readBoolean(savedInteraction.payload, 'ok'), true);
      const savedInteractionPayload = readValue(savedInteraction.payload, 'interaction');
      interactionId = readString(savedInteractionPayload, 'id');
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
          content: 'AUDIT_20260604 evenement integration',
          author: 'AUDIT_20260604 integration',
          date: new Date().toISOString()
        },
        updates: {
          notes: 'AUDIT_20260604 note integration'
        }
      });
      assertEquals(updatedInteraction.status, 200);
      assertEquals(readBoolean(updatedInteraction.payload, 'ok'), true);

      const activityBeforeCorrection = await getApi(
        'data.activity-v2.by-legacy-interaction',
        context.userToken,
        { legacy_interaction_id: interactionId }
      );
      assertEquals(activityBeforeCorrection.status, 200);
      const activityBefore = readValue(activityBeforeCorrection.payload, 'activity');
      assertEquals(readString(activityBefore, 'legacy_interaction_id'), interactionId);
      assertEquals(Array.isArray(readValue(activityBefore, 'participants')), true);
      assertEquals(Array.isArray(readValue(activityBefore, 'sources')), true);
      assertEquals(Array.isArray(readValue(activityBefore, 'history')), true);
      const activityVersion = readValue(activityBefore, 'version');
      assertEquals(typeof activityVersion, 'number');

      const correctedActivity = await postApi('data.activity-v2.correct', context.userToken, {
        legacy_interaction_id: interactionId,
        expected_version: activityVersion,
        reason: 'Correction integration TA-5',
        changes: { subject: 'AUDIT_20260604 integration corrigée' }
      });
      assertEquals(correctedActivity.status, 200);
      assertEquals(readBoolean(correctedActivity.payload, 'ok'), true);
      const corrected = readValue(correctedActivity.payload, 'activity');
      const corrections = readValue(corrected, 'corrections');
      assertEquals(Array.isArray(corrections), true);
      assertEquals(
        Array.isArray(corrections) && corrections.some((item) =>
          readString(item, 'reason') === 'Correction integration TA-5'
        ),
        true
      );

      const staleCorrection = await postApi('data.activity-v2.correct', context.userToken, {
        legacy_interaction_id: interactionId,
        expected_version: activityVersion,
        reason: 'Version périmée',
        changes: { subject: 'Ne doit pas être écrit' }
      });
      assertEquals(staleCorrection.status, 409);
      assertEquals(readString(staleCorrection.payload, 'code'), 'CONFLICT');

      const listedInteractions = await postApi('data.interactions', context.userToken, {
        action: 'list_by_entity',
        entity_id: entityId,
        page: 1,
        page_size: 20,
        read_model: 'activity_v2'
      });
      assertEquals(listedInteractions.status, 200);
      assertEquals(readBoolean(listedInteractions.payload, 'ok'), true);
      const listedPayload = readValue(listedInteractions.payload, 'interactions');
      assertEquals(Array.isArray(listedPayload), true);

      const legacyInteractions = await postApi('data.interactions', context.userToken, {
        action: 'list_by_entity',
        entity_id: entityId,
        page: 1,
        page_size: 20,
        read_model: 'legacy'
      });
      assertEquals(legacyInteractions.status, 200);
      assertEquals(
        Array.isArray(readValue(legacyInteractions.payload, 'interactions')),
        true
      );

      const abandonedDraft = await postApi('data.interactions', context.userToken, {
        action: 'draft_delete',
        user_id: context.userId,
        agency_id: context.agencyId,
        form_type: draftFormType
      });
      assertEquals(abandonedDraft.status, 200);

      const deletedInteraction = await postApi('data.interactions', context.userToken, {
        action: 'delete',
        interaction_id: interactionId
      });
      assertEquals(deletedInteraction.status, 200);
      assertEquals(readBoolean(deletedInteraction.payload, 'ok'), true);
      assertEquals(readString(deletedInteraction.payload, 'interaction_id'), interactionId);
      interactionId = '';

      const deletedContact = await postApi('data.entity-contacts', context.userToken, {
        action: 'delete',
        contact_id: contactId
      });
      assertEquals(deletedContact.status, 409);
      assertEquals(readString(deletedContact.payload, 'code'), 'CONFLICT');

      const savedConfig = await postApi('data.config', context.adminToken, {
        agency_id: context.agencyId,
        statuses: context.configStatuses,
        services: context.configServices,
        families: context.configFamilies,
        interactionTypes: context.configInteractionTypes
      });
      assertEquals(savedConfig.status, 200);
      assertEquals(readBoolean(savedConfig.payload, 'ok'), true);

      const invalidConfig = await postApi('data.config', context.adminToken, {
        agency_id: context.agencyId,
        statuses: [{ id: context.statusId, label: 'invalid status', category: 'invalid' }],
        services: context.configServices,
        families: context.configFamilies,
        interactionTypes: context.configInteractionTypes
      });
      assertEquals(invalidConfig.status, 400);
      assertEquals(readString(invalidConfig.payload, 'code'), 'CONFIG_INVALID');
    } finally {
      await postApi('data.interactions', context.userToken, {
        action: 'draft_delete',
        user_id: context.userId,
        agency_id: context.agencyId,
        form_type: draftFormType
      });
      if (interactionId) {
        await postApi('data.interactions', context.userToken, {
          action: 'delete',
          interaction_id: interactionId
        });
      }
      if (contactId) {
        await postApi('data.entity-contacts', context.userToken, {
          action: 'delete',
          contact_id: contactId
        });
      }
      if (entityId) {
        await postApi('data.entities', context.adminToken, {
          action: 'delete',
          entity_id: entityId,
          delete_related_interactions: true
        });
      }
    }
  }
});
