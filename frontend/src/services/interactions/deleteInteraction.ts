import { ResultAsync } from 'neverthrow';

import { dataInteractionsDeleteResponseSchema } from 'shared/schemas/api-responses';
import { type AppError, createAppError } from '@/services/errors/AppError';
import { safeRpc } from '@/services/api/safeRpc';

const parseDeleteResponse = (payload: unknown): string => {
  const parsed = dataInteractionsDeleteResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }
  return parsed.data.interaction_id;
};

export const deleteInteraction = (interactionId: string): ResultAsync<string, AppError> =>
  safeRpc(
    (api, init) => api.data.interactions.$post({
      json: {
        action: 'delete',
        interaction_id: interactionId
      }
    }, init),
    parseDeleteResponse,
    "Impossible de supprimer l'interaction."
  );
