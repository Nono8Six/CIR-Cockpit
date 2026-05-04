import {
  directoryOptionsDepartmentsResponseSchema,
  type DirectoryOptionsDepartmentsResponse
} from 'shared/schemas/api-responses';
import type { DirectoryOptionsFacetInput } from 'shared/schemas/directory.schema';

import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

const parseDirectoryOptionDepartmentsResponse = (payload: unknown): DirectoryOptionsDepartmentsResponse => {
  const parsed = directoryOptionsDepartmentsResponseSchema.safeParse(payload);
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

export const getDirectoryOptionDepartments = (
  input: DirectoryOptionsFacetInput
): Promise<DirectoryOptionsDepartmentsResponse> =>
  invokeTrpc(
    (api, options) => api.directory.options.departments.query(input, options),
    parseDirectoryOptionDepartmentsResponse,
    "Impossible de charger les departements de l'annuaire."
  );
