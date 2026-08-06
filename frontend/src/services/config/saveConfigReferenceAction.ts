import { ResultAsync } from 'neverthrow';
import type {
  ConfigReferenceActionInput
} from '../../../../shared/schemas/system/config.schema';
import {
  configReferenceActionResponseSchema,
  type ConfigReferenceActionResponse
} from '../../../../shared/schemas/system/api-responses';

import { type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';;

export const saveConfigReferenceAction = (
  input: ConfigReferenceActionInput
): ResultAsync<ConfigReferenceActionResponse, AppError> =>
  safeTrpc(
    async (api, options) => api.config.reference.mutate(input, options),
    configReferenceActionResponseSchema,
    'Impossible de mettre à jour le référentiel.'
  );
