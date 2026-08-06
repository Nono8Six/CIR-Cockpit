import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { ResultAsync } from 'neverthrow';

import { dataEntitiesResponseSchema } from '../../../../shared/schemas/system/api-responses';
import { Client } from '@/types';
import { type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

const parseEntityResponse = createTrpcResponseParser(
  dataEntitiesResponseSchema,
  (response): Client => {
  return response.entity;
},
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

export const setClientArchived = (clientId: string, archived: boolean): ResultAsync<Client, AppError> =>
  safeTrpc(
    (api, options) => api.data.entities.mutate({
        action: 'archive',
        entity_id: clientId,
        archived
      }, options),
    parseEntityResponse,
    "Impossible de mettre à jour le client."
  );
