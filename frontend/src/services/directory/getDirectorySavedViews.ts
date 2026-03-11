import {
  directorySavedViewsListResponseSchema,
  type DirectorySavedViewsListResponse
} from 'shared/schemas/api-responses';

import { invokeTrpc } from '@/services/api/invokeTrpc';
import { callTrpcQuery } from '@/services/api/trpcClient';
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
    () => callTrpcQuery('directory.saved-views.list', {}),
    parseDirectorySavedViewsListResponse,
    'Impossible de charger les vues sauvegardees.'
  );
