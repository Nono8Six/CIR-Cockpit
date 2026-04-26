import { dataInteractionsListResponseSchema } from 'shared/schemas/api-responses';

import type { Interaction } from '@/types';
import { createAppError } from '@/services/errors/AppError';
import { invokeTrpc } from '@/services/api/safeTrpc';
import { hydrateTimeline } from './hydrateTimeline';

export type EntityInteractionsPage = {
  interactions: Interaction[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const parseListResponse = (payload: unknown): EntityInteractionsPage => {
  const parsed = dataInteractionsListResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  const interactions = parsed.data.interactions.map(hydrateTimeline);
  const page = parsed.data.page;
  const pageSize = parsed.data.page_size;
  const total = parsed.data.total;

  return {
    interactions,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
};

export const getInteractionsByEntity = async (
  entityId: string,
  page = 1,
  pageSize = 20
): Promise<EntityInteractionsPage> => {
  return invokeTrpc(
    (api, options) => api.data.interactions.mutate({
      action: 'list_by_entity',
      entity_id: entityId,
      page,
      page_size: pageSize
    }, options),
    parseListResponse,
    'Impossible de charger les interactions.'
  );
};
