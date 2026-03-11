import {
  directoryListResponseSchema,
  type DirectoryListResponse
} from 'shared/schemas/api-responses';
import { type DirectoryListInput } from 'shared/schemas/directory.schema';
import { createAppError } from '@/services/errors/AppError';
import { callTrpcQuery } from '@/services/api/trpcClient';
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
    () => callTrpcQuery('directory.list', input),
    parseDirectoryListResponse,
    "Impossible de charger l'annuaire."
  );
