import {
  directoryCitySuggestionsResponseSchema,
  type DirectoryCitySuggestionsResponse
} from 'shared/schemas/api-responses';
import { type DirectoryCitySuggestionsInput } from 'shared/schemas/directory.schema';

import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

const parseDirectoryCitySuggestionsResponse = (payload: unknown): DirectoryCitySuggestionsResponse => {
  const parsed = directoryCitySuggestionsResponseSchema.safeParse(payload);
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

export const getDirectoryCitySuggestions = (
  input: DirectoryCitySuggestionsInput
): Promise<DirectoryCitySuggestionsResponse> =>
  invokeTrpc(
    (api, options) => api.directory['city-suggestions'].query(input, options),
    parseDirectoryCitySuggestionsResponse,
    'Impossible de charger les suggestions de villes.'
  );
