import {
  directoryOptionsCommercialsResponseSchema,
  type DirectoryOptionsCommercialsResponse
} from 'shared/schemas/api-responses';
import type { DirectoryOptionsFacetInput } from 'shared/schemas/directory.schema';

import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

const parseDirectoryOptionCommercialsResponse = (payload: unknown): DirectoryOptionsCommercialsResponse => {
  const parsed = directoryOptionsCommercialsResponseSchema.safeParse(payload);
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

export const getDirectoryOptionCommercials = (
  input: DirectoryOptionsFacetInput
): Promise<DirectoryOptionsCommercialsResponse> =>
  invokeTrpc(
    (api, options) => api.directory.options.commercials.query(input, options),
    parseDirectoryOptionCommercialsResponse,
    "Impossible de charger les commerciaux de l'annuaire."
  );
