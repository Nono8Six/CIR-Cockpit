import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { ResultAsync } from 'neverthrow';

import { dataInteractionsDeleteResponseSchema } from '../../../../shared/schemas/system/api-responses';
import { type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

const parseDeleteResponse = createTrpcResponseParser(
  dataInteractionsDeleteResponseSchema,
  (response): string => {
  return response.interaction_id;
},
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

export const deleteInteraction = (interactionId: string): ResultAsync<string, AppError> =>
  safeTrpc(
    (api, options) => api.data.interactions.mutate({
        action: 'delete',
        interaction_id: interactionId
      }, options),
    parseDeleteResponse,
    "Impossible de supprimer l'interaction."
  );
