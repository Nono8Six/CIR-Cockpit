import { dataEntitiesSearchIndexResponseSchema } from 'shared/schemas/api-responses';

import { Entity, EntityContact } from '@/types';
import { safeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

export type EntitySearchIndex = {
  entities: Entity[];
  contacts: EntityContact[];
};

const parseSearchIndexResponse = (payload: unknown): EntitySearchIndex => {
  const parsed = dataEntitiesSearchIndexResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  return {
    entities: parsed.data.entities,
    contacts: parsed.data.contacts
  };
};

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
