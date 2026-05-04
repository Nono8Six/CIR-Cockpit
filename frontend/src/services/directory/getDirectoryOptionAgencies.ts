import {
  directoryOptionsAgenciesResponseSchema,
  type DirectoryOptionsAgenciesResponse
} from 'shared/schemas/api-responses';
import type { DirectoryOptionsAgenciesInput } from 'shared/schemas/directory.schema';

import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

const parseDirectoryOptionAgenciesResponse = (payload: unknown): DirectoryOptionsAgenciesResponse => {
  const parsed = directoryOptionsAgenciesResponseSchema.safeParse(payload);
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

export const getDirectoryOptionAgencies = (
  input: DirectoryOptionsAgenciesInput
): Promise<DirectoryOptionsAgenciesResponse> =>
  invokeTrpc(
    (api, options) => api.directory.options.agencies.query(input, options),
    parseDirectoryOptionAgenciesResponse,
    "Impossible de charger les agences de l'annuaire."
  );
