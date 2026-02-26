import { ResultAsync } from 'neverthrow';

import { dataEntitiesResponseSchema } from '../../../../shared/schemas/api-responses';
import { Client } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeRpc } from '@/services/api/safeRpc';

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
  safeRpc(
    (api, init) => api.data.entities.$post({
      json: {
        action: 'archive',
        entity_id: clientId,
        archived
      }
    }, init),
    parseEntityResponse,
    "Impossible de mettre a jour le client."
  );
