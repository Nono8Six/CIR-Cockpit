import {
  configGetResponseSchema,
  type ConfigGetResponse
} from 'shared/schemas/api-responses';
import type { ConfigGetInput, ResolvedConfigSnapshot } from 'shared/schemas/config.schema';

import { createAppError } from '@/services/errors/AppError';
import { invokeTrpc } from '@/services/api/safeTrpc';
import { getActiveAgencyId } from '@/services/agency/getActiveAgencyId';

const parseConfigGetResponse = (payload: unknown): ConfigGetResponse => {
  const parsed = configGetResponseSchema.safeParse(payload);
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

const resolveConfigGetInput = async (
  agencyIdOverride?: string
): Promise<ConfigGetInput> => ({
  agency_id: agencyIdOverride ?? (await getActiveAgencyId())
});

export const getConfigSnapshot = async (
  agencyIdOverride?: string
): Promise<ResolvedConfigSnapshot> => {
  const input = await resolveConfigGetInput(agencyIdOverride);
  const response = await invokeTrpc(
    (api, options) => api.config.get.query(input, options),
    parseConfigGetResponse,
    'Impossible de charger la configuration.'
  );

  return response.snapshot;
};
