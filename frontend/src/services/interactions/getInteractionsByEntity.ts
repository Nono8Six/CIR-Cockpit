import { dataInteractionsListResponseSchema } from 'shared/schemas/api-responses';

import type { Interaction } from '@/types';
import { createAppError, isAppError } from '@/services/errors/AppError';
import { invokeRpc } from '@/services/api/safeRpc';
import { toTimestamp } from '@/utils/date/toTimestamp';
import { getInteractions } from './getInteractions';
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

const sortByLatestActivityDesc = (left: Interaction, right: Interaction): number => {
  const leftTimestamp = toTimestamp(left.last_action_at ?? left.created_at);
  const rightTimestamp = toTimestamp(right.last_action_at ?? right.created_at);

  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }

  return toTimestamp(right.created_at) - toTimestamp(left.created_at);
};

const isUnsupportedListByEntityActionError = (error: unknown): boolean => {
  if (!isAppError(error) || error.code !== 'INVALID_PAYLOAD') {
    return false;
  }

  const details =
    typeof error.details === 'string'
      ? error.details
      : '';
  const errorText = `${error.message} ${details}`.toLowerCase();

  return errorText.includes('no matching discriminator') && errorText.includes('action');
};

const buildFallbackEntityPage = (
  interactions: Interaction[],
  entityId: string,
  page: number,
  pageSize: number
): EntityInteractionsPage => {
  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.min(50, Math.max(1, Math.trunc(pageSize)));

  const sorted = interactions
    .filter((interaction) => interaction.entity_id === entityId)
    .slice()
    .sort(sortByLatestActivityDesc);
  const total = sorted.length;
  const offset = (safePage - 1) * safePageSize;

  return {
    interactions: sorted.slice(offset, offset + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / safePageSize))
  };
};

export const getInteractionsByEntity = async (
  entityId: string,
  page = 1,
  pageSize = 20
): Promise<EntityInteractionsPage> => {
  try {
    return await invokeRpc(
      (api, init) => api.data.interactions.$post({
        json: {
          action: 'list_by_entity',
          entity_id: entityId,
          page,
          page_size: pageSize
        }
      }, init),
      parseListResponse
    );
  } catch (error) {
    if (!isUnsupportedListByEntityActionError(error)) {
      throw error;
    }

    const interactions = await getInteractions();
    return buildFallbackEntityPage(interactions, entityId, page, pageSize);
  }
};
