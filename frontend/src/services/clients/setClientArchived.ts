import { ResultAsync } from 'neverthrow';

import { dataEntitiesResponseSchema } from 'shared/schemas/api-responses';
import { Client } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

const parseEntityResponse = (payload: unknown): Client => {
  const parsed = dataEntitiesResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }
  return parsed.data.entity;
};

export const setClientArchived = (clientId: string, archived: boolean): ResultAsync<Client, AppError> =>
  safeTrpc(
    (api, options) => api.data.entities.mutate({
        action: 'archive',
        entity_id: clientId,
        archived
      }, options),
    parseEntityResponse,
    "Impossible de mettre a jour le client."
  );

export const deleteClient = (
  clientId: string,
  deleteRelatedInteractions: boolean
): ResultAsync<Client, AppError> =>
  safeTrpc(
    (api, options) => api.data.entities.mutate({
        action: 'delete',
        entity_id: clientId,
        delete_related_interactions: deleteRelatedInteractions
      }, options),
    parseEntityResponse,
    'Impossible de supprimer le client.'
  );
