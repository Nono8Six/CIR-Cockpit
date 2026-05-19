import {
  directoryCompanyDetailsResponseSchema,
  type DirectoryCompanyDetailsResponse
} from '../../../../shared/schemas/system/api-responses';
import { type DirectoryCompanyDetailsInput } from '../../../../shared/schemas/system/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';

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
    (api, options) => api.directory['company-details'].query(input, options),
    parseDirectoryCompanyDetailsResponse,
    "Impossible de charger les informations société."
  );
