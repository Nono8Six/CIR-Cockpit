import {
  directorySavedViewDeleteResponseSchema,
  type DirectorySavedViewDeleteResponse
} from 'shared/schemas/api-responses';
import { type DirectorySavedViewDeleteInput } from 'shared/schemas/directory.schema';

import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

const parseDirectorySavedViewDeleteResponse = (payload: unknown): DirectorySavedViewDeleteResponse => {
  const parsed = directorySavedViewDeleteResponseSchema.safeParse(payload);
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

export const deleteDirectorySavedView = (
  input: DirectorySavedViewDeleteInput
): Promise<DirectorySavedViewDeleteResponse> =>
  invokeTrpc(
    (api, options) => api.directory['saved-views'].delete.mutate(input, options),
    parseDirectorySavedViewDeleteResponse,
    'Impossible de supprimer la vue.'
  );
