import {
  directorySavedViewsListResponseSchema,
  type DirectorySavedViewsListResponse
} from 'shared/schemas/api-responses';

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

export const getDirectorySavedViews = (): Promise<DirectorySavedViewsListResponse> =>
  invokeTrpc(
    (api, options) => api.directory['saved-views'].list.query({}, options),
    parseDirectorySavedViewsListResponse,
    'Impossible de charger les vues sauvegardees.'
  );
