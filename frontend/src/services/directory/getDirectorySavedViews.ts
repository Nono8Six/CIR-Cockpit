import {
  directorySavedViewsListResponseSchema,
  type DirectorySavedViewsListResponse
} from 'shared/schemas/api-responses';
import type { DirectorySavedViewsListInput } from 'shared/schemas/directory.schema';

import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

const parseDirectorySavedViewsListResponse = (payload: unknown): DirectorySavedViewsListResponse => {
  const parsed = directorySavedViewsListResponseSchema.safeParse(payload);
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

export const getDirectorySavedViews = (
  input: DirectorySavedViewsListInput = { viewType: 'clients' }
): Promise<DirectorySavedViewsListResponse> =>
  invokeTrpc(
    (api, options) => api.directory['saved-views'].list.query(input, options),
    parseDirectorySavedViewsListResponse,
    'Impossible de charger les vues sauvegardees.'
  );
