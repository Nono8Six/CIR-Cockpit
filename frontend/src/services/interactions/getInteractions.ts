import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { dataInteractionsListResponseSchema } from '../../../../shared/schemas/system/api-responses';

import type { Interaction } from '@/types';
import { getActiveAgencyId } from '@/services/agency/getActiveAgencyId';
import { invokeTrpc } from '@/services/api/invokeTrpc';
import { hydrateTimeline } from './hydrateTimeline';

const parseInteractionsResponse = createTrpcResponseParser(
  dataInteractionsListResponseSchema,
  (response): Interaction[] => {
  return response.interactions.map(hydrateTimeline);
},
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

export const getInteractions = async (agencyIdOverride?: string): Promise<Interaction[]> => {
  const agencyId = agencyIdOverride ?? (await getActiveAgencyId());
  if (!agencyId) {
    return [];
  }

  return invokeTrpc(
    (api, options) => api.data.interactions.mutate({
      action: 'list_by_agency',
      agency_id: agencyId
    }, options),
    parseInteractionsResponse,
    'Impossible de charger les interactions.'
  );
};
