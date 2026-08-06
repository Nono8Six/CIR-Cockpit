import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { dataInteractionsKnownCompaniesResponseSchema } from '../../../../shared/schemas/system/api-responses';

import { getActiveAgencyId } from '@/services/agency/getActiveAgencyId';
import { invokeTrpc } from '@/services/api/invokeTrpc';

const parseKnownCompaniesResponse = createTrpcResponseParser(
  dataInteractionsKnownCompaniesResponseSchema,
  (response): string[] => {
  return response.companies;
},
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

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
