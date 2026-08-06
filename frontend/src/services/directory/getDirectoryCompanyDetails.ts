import {
  directoryCompanyDetailsResponseSchema,
  type DirectoryCompanyDetailsResponse
} from '../../../../shared/schemas/system/api-responses';
import { type DirectoryCompanyDetailsInput } from '../../../../shared/schemas/system/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';;

export const getDirectoryCompanyDetails = async (
  input: DirectoryCompanyDetailsInput
): Promise<DirectoryCompanyDetailsResponse> =>
  invokeTrpc(
    (api, options) => api.directory['company-details'].query(input, options),
    directoryCompanyDetailsResponseSchema,
    "Impossible de charger les informations société."
  );
