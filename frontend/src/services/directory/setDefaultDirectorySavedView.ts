import {
  directorySavedViewResponseSchema,
  type DirectorySavedViewResponse
} from 'shared/schemas/api-responses';
import { type DirectorySavedViewSetDefaultInput } from 'shared/schemas/directory.schema';

import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

const parseSetDefaultDirectorySavedViewResponse = (payload: unknown): DirectorySavedViewResponse => {
  const parsed = directorySavedViewResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  return parsed.data;
};

export const setDefaultDirectorySavedView = (
  input: DirectorySavedViewSetDefaultInput
): Promise<DirectorySavedViewResponse> =>
  invokeTrpc(
    (api, options) => api.directory['saved-views']['set-default'].mutate(input, options),
    parseSetDefaultDirectorySavedViewResponse,
    'Impossible de definir la vue par defaut.'
  );
