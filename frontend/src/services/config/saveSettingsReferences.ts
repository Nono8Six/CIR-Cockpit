import { ResultAsync } from 'neverthrow';
import type { DataConfigPayload } from '../../../../shared/schemas/system/data.schema';

import { type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

const parseVoidResponse = (): void => undefined;

export const saveSettingsReferences = (config: DataConfigPayload): ResultAsync<void, AppError> =>
  safeTrpc(
    async (api, options) => {
      return api.data.config.mutate(config, options);
    },
    parseVoidResponse,
    'Impossible de mettre a jour les referentiels.'
  );
