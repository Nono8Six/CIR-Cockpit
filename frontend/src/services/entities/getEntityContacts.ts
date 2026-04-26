import { dataEntityContactsListResponseSchema } from 'shared/schemas/api-responses';

import { EntityContact } from '@/types';
import { safeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

const parseContactsResponse = (payload: unknown): EntityContact[] => {
  const parsed = dataEntityContactsListResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  return parsed.data.contacts;
};

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
