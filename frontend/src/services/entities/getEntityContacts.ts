import { dataEntityContactsListResponseSchema } from 'shared/schemas/api-responses';

import { EntityContact } from '@/types';
import { safeRpc } from '@/services/api/safeRpc';
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
  return safeRpc(
    (api, init) => api.data['entity-contacts'].$post({
      json: {
        action: 'list_by_entity',
        entity_id: entityId,
        include_archived: includeArchived
      }
    }, init),
    parseContactsResponse,
    'Impossible de charger les contacts.'
  ).match(
    (contacts) => contacts,
    (error) => {
      throw error;
    }
  );
};
