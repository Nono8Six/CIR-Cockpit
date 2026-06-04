import { ResultAsync } from 'neverthrow';

import {
  configIntegrityInteractionUpdateResponseSchema,
  type ConfigIntegrityInteractionUpdateResponse
} from '../../../../shared/schemas/system/api-responses';
import type { ConfigIntegrityInteractionUpdateInput } from '../../../../shared/schemas/system/config.schema';
import { safeTrpc } from '@/services/api/safeTrpc';
import { type AppError, createAppError } from '@/services/errors/AppError';

const parseResponse = (payload: unknown): ConfigIntegrityInteractionUpdateResponse => {
  const parsed = configIntegrityInteractionUpdateResponseSchema.safeParse(payload);
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

export const saveConfigIntegrityInteractionUpdate = (
  input: ConfigIntegrityInteractionUpdateInput
): ResultAsync<ConfigIntegrityInteractionUpdateResponse, AppError> =>
  safeTrpc(
    (api, options) => api.config['integrity-interaction-update'].mutate(input, options),
    parseResponse,
    "Impossible de corriger l'interaction."
  );
