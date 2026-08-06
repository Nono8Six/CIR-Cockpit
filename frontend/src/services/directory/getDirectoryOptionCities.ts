import {
  directoryOptionsCitiesResponseSchema,
  type DirectoryOptionsCitiesResponse
} from '../../../../shared/schemas/system/api-responses';
import type { DirectoryOptionsCitiesInput } from '../../../../shared/schemas/system/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';;

export const getDirectoryOptionCities = (
  input: DirectoryOptionsCitiesInput
): Promise<DirectoryOptionsCitiesResponse> =>
  invokeTrpc(
    (api, options) => api.directory.options.cities.query(input, options),
    directoryOptionsCitiesResponseSchema,
    "Impossible de charger les villes de l'annuaire."
  );
