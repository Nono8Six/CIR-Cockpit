import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { dataInteractionsListResponseSchema } from '../../../../shared/schemas/system/api-responses';

import type { Interaction } from '@/types';
import { invokeTrpc } from '@/services/api/invokeTrpc';
import { hydrateTimeline } from './hydrateTimeline';

export type EntityInteractionsPage = {
  interactions: Interaction[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type EntityInteractionsScope = 'open' | 'closed' | 'all';

const parseListResponse = createTrpcResponseParser(
  dataInteractionsListResponseSchema,
  (response): EntityInteractionsPage => {
  const interactions = response.interactions.map(hydrateTimeline);
  const page = response.page;
  const pageSize = response.page_size;
  const total = response.total;
  return {
      interactions,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
},
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

export const getInteractionsByEntity = async (
  entityId: string,
  page = 1,
  pageSize = 20,
  scope: EntityInteractionsScope = 'all'
): Promise<EntityInteractionsPage> => {
  return invokeTrpc(
    (api, options) => api.data.interactions.mutate({
      action: 'list_by_entity',
      entity_id: entityId,
      scope,
      page,
      page_size: pageSize
    }, options),
    parseListResponse,
    'Impossible de charger les interactions.'
  );
};
