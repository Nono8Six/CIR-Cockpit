import {
  configIntegrityInteractionsResponseSchema,
  type ConfigIntegrityInteractionsResponse
} from '../../../../shared/schemas/system/api-responses';
import type { ConfigIntegrityInteractionsInput } from '../../../../shared/schemas/system/config.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';
import { createAppError } from '@/services/errors/AppError';

const parseResponse = (payload: unknown): ConfigIntegrityInteractionsResponse => {
  const parsed = configIntegrityInteractionsResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({ code: 'REQUEST_FAILED', message: 'Reponse serveur invalide.', source: 'edge', details: parsed.error.message });
  }
  return parsed.data;
};

export const getConfigIntegrityInteractions = (
  input: ConfigIntegrityInteractionsInput
): Promise<ConfigIntegrityInteractionsResponse> =>
  invokeTrpc(
    (api, options) => api.config['integrity-interactions'].query(input, options),
    parseResponse,
    'Impossible de charger les interactions concernees.'
  );
