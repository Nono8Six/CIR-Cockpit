import {
  directoryOptionsCommercialsResponseSchema,
  type DirectoryOptionsCommercialsResponse
} from '../../../../shared/schemas/system/api-responses';
import type { DirectoryOptionsFacetInput } from '../../../../shared/schemas/system/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';;

export const getDirectoryOptionCommercials = (
  input: DirectoryOptionsFacetInput
): Promise<DirectoryOptionsCommercialsResponse> =>
  invokeTrpc(
    (api, options) => api.directory.options.commercials.query(input, options),
    directoryOptionsCommercialsResponseSchema,
    "Impossible de charger les commerciaux de l'annuaire."
  );
