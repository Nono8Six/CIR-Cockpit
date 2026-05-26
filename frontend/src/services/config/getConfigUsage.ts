import {
  configUsageResponseSchema,
  type ConfigUsageResponse
} from '../../../../shared/schemas/system/api-responses';
import type {
  ConfigUsageInput,
  ConfigUsageSnapshot
} from '../../../../shared/schemas/system/config.schema';

import { createAppError } from '@/services/errors/AppError';
import { invokeTrpc } from '@/services/api/invokeTrpc';

const parseConfigUsageResponse = (payload: unknown): ConfigUsageResponse => {
  const parsed = configUsageResponseSchema.safeParse(payload);
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

export const getConfigUsage = async (
  agencyId: string
): Promise<ConfigUsageSnapshot> => {
  const input: ConfigUsageInput = { agency_id: agencyId };
  const response = await invokeTrpc(
    (api, options) => api.config.usage.query(input, options),
    parseConfigUsageResponse,
    "Impossible de charger l'impact des parametres."
  );

  return response.usage;
};
