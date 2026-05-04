import {
  directoryOptionsCitiesResponseSchema,
  type DirectoryOptionsCitiesResponse
} from 'shared/schemas/api-responses';
import type { DirectoryOptionsCitiesInput } from 'shared/schemas/directory.schema';

import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

const parseDirectoryOptionCitiesResponse = (payload: unknown): DirectoryOptionsCitiesResponse => {
  const parsed = directoryOptionsCitiesResponseSchema.safeParse(payload);
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

export const getDirectoryOptionCities = (
  input: DirectoryOptionsCitiesInput
): Promise<DirectoryOptionsCitiesResponse> =>
  invokeTrpc(
    (api, options) => api.directory.options.cities.query(input, options),
    parseDirectoryOptionCitiesResponse,
    "Impossible de charger les villes de l'annuaire."
  );
