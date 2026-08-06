import { ResultAsync } from 'neverthrow';
import { dataConfigResponseSchema } from 'shared/schemas/system/api-responses';
import type { DataConfigPayload } from '../../../../shared/schemas/system/data.schema';

import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

const parseConfigResponse = createTrpcResponseParser(
  dataConfigResponseSchema,
  (): void => undefined
);

export const saveSettingsReferences = (config: DataConfigPayload): ResultAsync<void, AppError> =>
  safeTrpc(
    async (api, options) => {
      return api.data.config.mutate(config, options);
    },
    parseConfigResponse,
    'Impossible de mettre à jour les référentiels.'
  );
