import {
  directoryCompanySearchResponseSchema,
  type DirectoryCompanySearchResponse
} from 'shared/schemas/api-responses';
import { type DirectoryCompanySearchInput } from 'shared/schemas/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';
import { callTrpcQuery } from '@/services/api/trpcClient';
import { createAppError } from '@/services/errors/AppError';

const parseDirectoryCompanySearchResponse = (payload: unknown): DirectoryCompanySearchResponse => {
  const parsed = directoryCompanySearchResponseSchema.safeParse(payload);
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

export const getDirectoryCompanySearch = async (
  input: DirectoryCompanySearchInput
): Promise<DirectoryCompanySearchResponse> =>
  invokeTrpc(
    () => callTrpcQuery('directory.company-search', input),
    parseDirectoryCompanySearchResponse,
    "Impossible de rechercher l'entreprise."
  );
