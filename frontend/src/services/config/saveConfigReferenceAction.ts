import { ResultAsync } from 'neverthrow';
import type {
  ConfigReferenceActionInput
} from '../../../../shared/schemas/system/config.schema';
import {
  configReferenceActionResponseSchema,
  type ConfigReferenceActionResponse
} from '../../../../shared/schemas/system/api-responses';

import { type AppError, createAppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

const parseConfigReferenceActionResponse = (payload: unknown): ConfigReferenceActionResponse => {
  const parsed = configReferenceActionResponseSchema.safeParse(payload);
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

export const saveConfigReferenceAction = (
  input: ConfigReferenceActionInput
): ResultAsync<ConfigReferenceActionResponse, AppError> =>
  safeTrpc(
    async (api, options) => api.config.reference.mutate(input, options),
    parseConfigReferenceActionResponse,
    'Impossible de mettre a jour le referentiel.'
  );
