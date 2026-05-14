import {
  tierV1SearchResponseSchema,
  type TierV1SearchResponse
} from 'shared/schemas/api-responses';
import type { TierV1SearchInput } from 'shared/schemas/tier-v1.schema';

import { safeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

const parseUnifiedSearchResponse = (payload: unknown): TierV1SearchResponse => {
  const parsed = tierV1SearchResponseSchema.safeParse(payload);
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

export const searchEntitiesUnified = async (
  input: TierV1SearchInput
): Promise<TierV1SearchResponse> =>
  safeTrpc(
    (api, options) => api.data.searchEntitiesUnified.query(input, options),
    parseUnifiedSearchResponse,
    'Impossible de rechercher les tiers.'
  ).match(
    (response) => response,
    (error) => {
      throw error;
    }
  );
