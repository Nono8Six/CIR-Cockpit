import {
  directoryRecordResponseSchema,
  type DirectoryRecordResponse
} from 'shared/schemas/api-responses';
import { type DirectoryRouteRef } from 'shared/schemas/directory.schema';
import { createAppError } from '@/services/errors/AppError';
import { invokeTrpc } from '@/services/api/safeTrpc';

const parseDirectoryRecordResponse = (payload: unknown): DirectoryRecordResponse => {
  const parsed = directoryRecordResponseSchema.safeParse(payload);
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

export const getDirectoryRecord = (input: DirectoryRouteRef): Promise<DirectoryRecordResponse> =>
  invokeTrpc(
    (api, options) => api.directory.record.query(input, options),
    parseDirectoryRecordResponse,
    "Impossible de charger la fiche annuaire."
  );
