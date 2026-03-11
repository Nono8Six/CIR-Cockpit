import {
  directorySavedViewResponseSchema,
  type DirectorySavedViewResponse
} from 'shared/schemas/api-responses';
import { type DirectorySavedViewSaveInput } from 'shared/schemas/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';
import { callTrpcMutation } from '@/services/api/trpcClient';
import { createAppError } from '@/services/errors/AppError';

const parseDirectorySavedViewResponse = (payload: unknown): DirectorySavedViewResponse => {
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

export const saveDirectorySavedView = (
  input: DirectorySavedViewSaveInput
): Promise<DirectorySavedViewResponse> =>
  invokeTrpc(
    () => callTrpcMutation('directory.saved-views.save', input),
    parseDirectorySavedViewResponse,
    'Impossible de sauvegarder la vue.'
  );
