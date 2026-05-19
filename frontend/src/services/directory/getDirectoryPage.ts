import {
  directoryListResponseSchema,
  type DirectoryListResponse
} from '../../../../shared/schemas/system/api-responses';
import { type DirectoryListInput } from '../../../../shared/schemas/system/directory.schema';
import { createAppError } from '@/services/errors/AppError';

import { invokeTrpc } from '@/services/api/invokeTrpc';

const parseDirectoryListResponse = (payload: unknown): DirectoryListResponse => {
  const parsed = directoryListResponseSchema.safeParse(payload);
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

export const getDirectoryPage = (input: DirectoryListInput): Promise<DirectoryListResponse> =>
  invokeTrpc(
    (api, options) => api.directory.list.query(input, options),
    parseDirectoryListResponse,
    "Impossible de charger l'annuaire."
  );
