import { ResultAsync } from 'neverthrow';

import { dataInteractionsDeleteResponseSchema } from 'shared/schemas/api-responses';
import { type AppError, createAppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

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
  safeTrpc(
    (api, options) => api.data.interactions.mutate({
        action: 'delete',
        interaction_id: interactionId
      }, options),
    parseDeleteResponse,
    "Impossible de supprimer l'interaction."
  );
