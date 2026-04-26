import { dataInteractionsListResponseSchema } from 'shared/schemas/api-responses';

import type { Interaction } from '@/types';
import { getActiveAgencyId } from '@/services/agency/getActiveAgencyId';
import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';
import { hydrateTimeline } from './hydrateTimeline';

const parseInteractionsResponse = (payload: unknown): Interaction[] => {
  const parsed = dataInteractionsListResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  return parsed.data.interactions.map(hydrateTimeline);
};

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
