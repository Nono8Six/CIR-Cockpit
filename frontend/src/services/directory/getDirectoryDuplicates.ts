import {
  directoryDuplicatesResponseSchema,
  type DirectoryDuplicatesResponse
} from 'shared/schemas/api-responses';
import { type DirectoryDuplicatesInput } from 'shared/schemas/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';
import { callTrpcQuery } from '@/services/api/trpcClient';
import { createAppError } from '@/services/errors/AppError';

const parseDirectoryDuplicatesResponse = (payload: unknown): DirectoryDuplicatesResponse => {
  const parsed = directoryDuplicatesResponseSchema.safeParse(payload);
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

export const getDirectoryDuplicates = async (
  input: DirectoryDuplicatesInput
): Promise<DirectoryDuplicatesResponse> =>
  invokeTrpc(
    () => callTrpcQuery('directory.duplicates', input),
    parseDirectoryDuplicatesResponse,
    'Impossible de verifier les doublons.'
  );
