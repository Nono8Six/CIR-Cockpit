import {
  directoryOptionsDepartmentsResponseSchema,
  type DirectoryOptionsDepartmentsResponse
} from '../../../../shared/schemas/system/api-responses';
import type { DirectoryOptionsFacetInput } from '../../../../shared/schemas/system/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';;

export const getDirectoryOptionDepartments = (
  input: DirectoryOptionsFacetInput
): Promise<DirectoryOptionsDepartmentsResponse> =>
  invokeTrpc(
    (api, options) => api.directory.options.departments.query(input, options),
    directoryOptionsDepartmentsResponseSchema,
    "Impossible de charger les départements de l'annuaire."
  );
