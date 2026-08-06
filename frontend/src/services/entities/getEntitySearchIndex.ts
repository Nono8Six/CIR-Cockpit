import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { dataEntitiesSearchIndexResponseSchema } from '../../../../shared/schemas/system/api-responses';

import { Entity, EntityContact } from '@/types';
import { safeTrpc } from '@/services/api/safeTrpc';

export type EntitySearchIndex = {
  entities: Entity[];
  contacts: EntityContact[];
};

const parseSearchIndexResponse = createTrpcResponseParser(
  dataEntitiesSearchIndexResponseSchema,
  (response): EntitySearchIndex => {
  return {
      entities: response.entities,
      contacts: response.contacts
    };
},
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

export const getEntitySearchIndex = async (
  agencyId: string | null,
  includeArchived = false
): Promise<EntitySearchIndex> => {
  if (!agencyId) {
    return { entities: [], contacts: [] };
  }

  return safeTrpc(
    (api, options) => api.data.entities.mutate({
        action: 'search_index',
        agency_id: agencyId,
        include_archived: includeArchived
      }, options),
    parseSearchIndexResponse,
    "Impossible de charger l'index de recherche."
  ).match(
    (index) => index,
    (error) => {
      throw error;
    }
  );
};
