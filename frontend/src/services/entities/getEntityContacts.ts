import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { dataEntityContactsListResponseSchema } from '../../../../shared/schemas/system/api-responses';

import { EntityContact } from '@/types';
import { safeTrpc } from '@/services/api/safeTrpc';

const parseContactsResponse = createTrpcResponseParser(
  dataEntityContactsListResponseSchema,
  (response): EntityContact[] => {
  return response.contacts;
},
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

export const getEntityContacts = async (
  entityId: string,
  includeArchived = false
): Promise<EntityContact[]> => {
  return safeTrpc(
    (api, options) => api.data['entity-contacts'].mutate({
        action: 'list_by_entity',
        entity_id: entityId,
        include_archived: includeArchived
      }, options),
    parseContactsResponse,
    'Impossible de charger les contacts.'
  ).match(
    (contacts) => contacts,
    (error) => {
      throw error;
    }
  );
};
