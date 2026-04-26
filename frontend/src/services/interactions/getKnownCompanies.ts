import { dataInteractionsKnownCompaniesResponseSchema } from 'shared/schemas/api-responses';

import { getActiveAgencyId } from '@/services/agency/getActiveAgencyId';
import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

const parseKnownCompaniesResponse = (payload: unknown): string[] => {
  const parsed = dataInteractionsKnownCompaniesResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  return parsed.data.companies;
};

export const getKnownCompanies = async (): Promise<string[]> => {
  const agencyId = await getActiveAgencyId();
  if (!agencyId) {
    return [];
  }

  return invokeTrpc(
    (api, options) => api.data.interactions.mutate({
      action: 'known_companies',
      agency_id: agencyId
    }, options),
    parseKnownCompaniesResponse,
    'Impossible de charger les entreprises connues.'
  );
};
