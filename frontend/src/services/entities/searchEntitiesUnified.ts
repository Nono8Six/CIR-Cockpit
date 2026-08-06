import {
  tierV1SearchResponseSchema,
  type TierV1SearchResponse
} from '../../../../shared/schemas/system/api-responses';
import type { TierV1SearchInput } from '../../../../shared/schemas/interaction/tier-v1.schema';

import { safeTrpc } from '@/services/api/safeTrpc';

export const searchEntitiesUnified = async (
  input: TierV1SearchInput
): Promise<TierV1SearchResponse> =>
  safeTrpc(
    (api, options) => api.data.searchEntitiesUnified.query(input, options),
    tierV1SearchResponseSchema,
    'Impossible de rechercher les tiers.'
  ).match(
    (response) => response,
    (error) => {
      throw error;
    }
  );
