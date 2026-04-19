import {
  directoryCompanyDetailsResponseSchema,
  type DirectoryCompanyDetailsResponse
} from 'shared/schemas/api-responses';
import { type DirectoryCompanyDetailsInput } from 'shared/schemas/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';
import { callTrpcQuery } from '@/services/api/trpcClient';
import { createAppError } from '@/services/errors/AppError';

const parseDirectoryCompanyDetailsResponse = (
  payload: unknown
): DirectoryCompanyDetailsResponse => {
  const parsed = directoryCompanyDetailsResponseSchema.safeParse(payload);
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

export const getDirectoryCompanyDetails = async (
  input: DirectoryCompanyDetailsInput
): Promise<DirectoryCompanyDetailsResponse> =>
  invokeTrpc(
    () => callTrpcQuery('directory.company-details', input),
    parseDirectoryCompanyDetailsResponse,
    "Impossible de charger les informations société."
  );
