import {
  directoryOptionsResponseSchema,
  type DirectoryOptionsResponse
} from 'shared/schemas/api-responses';
import { type DirectoryOptionsInput } from 'shared/schemas/directory.schema';
import { createAppError } from '@/services/errors/AppError';
import { invokeTrpc } from '@/services/api/safeTrpc';

const parseDirectoryOptionsResponse = (payload: unknown): DirectoryOptionsResponse => {
  const parsed = directoryOptionsResponseSchema.safeParse(payload);
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

export const getDirectoryOptions = (input: DirectoryOptionsInput): Promise<DirectoryOptionsResponse> =>
  invokeTrpc(
    (api, options) => api.directory.options.query(input, options),
    parseDirectoryOptionsResponse,
    "Impossible de charger les filtres de l'annuaire."
  );
