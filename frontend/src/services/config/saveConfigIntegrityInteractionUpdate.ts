import { ResultAsync } from 'neverthrow';

import {
  configIntegrityInteractionUpdateResponseSchema,
  type ConfigIntegrityInteractionUpdateResponse
} from '../../../../shared/schemas/system/api-responses';
import type { ConfigIntegrityInteractionUpdateInput } from '../../../../shared/schemas/system/config.schema';
import { safeTrpc } from '@/services/api/safeTrpc';
import { type AppError } from '@/services/errors/AppError';;

export const saveConfigIntegrityInteractionUpdate = (
  input: ConfigIntegrityInteractionUpdateInput
): ResultAsync<ConfigIntegrityInteractionUpdateResponse, AppError> =>
  safeTrpc(
    (api, options) => api.config['integrity-interaction-update'].mutate(input, options),
    configIntegrityInteractionUpdateResponseSchema,
    "Impossible de corriger l'interaction."
  );
