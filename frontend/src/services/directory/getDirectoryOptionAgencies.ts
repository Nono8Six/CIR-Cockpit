import {
  directoryOptionsAgenciesResponseSchema,
  type DirectoryOptionsAgenciesResponse
} from '../../../../shared/schemas/system/api-responses';
import type { DirectoryOptionsAgenciesInput } from '../../../../shared/schemas/system/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';;

export const getDirectoryOptionAgencies = (
  input: DirectoryOptionsAgenciesInput
): Promise<DirectoryOptionsAgenciesResponse> =>
  invokeTrpc(
    (api, options) => api.directory.options.agencies.query(input, options),
    directoryOptionsAgenciesResponseSchema,
    "Impossible de charger les agences de l'annuaire."
  );
