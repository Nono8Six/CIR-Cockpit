import { ResultAsync } from 'neverthrow';
import type { ConfigSaveAgencyInput } from 'shared/schemas/config.schema';

import { type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

const parseVoidResponse = (): void => undefined;

export const saveAgencyConfig = (config: ConfigSaveAgencyInput): ResultAsync<void, AppError> =>
  safeTrpc(
    async (api, options) => {
      return api.config['save-agency'].mutate(config, options);
    },
    parseVoidResponse,
    'Impossible de mettre a jour la configuration.'
  );
