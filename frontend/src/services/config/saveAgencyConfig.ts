import { ResultAsync } from 'neverthrow';
import type { ConfigSaveAgencyInput } from 'shared/schemas/config.schema';

import { type AppError } from '@/services/errors/AppError';
import { safeRpc } from '@/services/api/safeRpc';

const parseVoidResponse = (): void => undefined;

export const saveAgencyConfig = (config: ConfigSaveAgencyInput): ResultAsync<void, AppError> =>
  safeRpc(
    async (api, init) => {
      return api.config['save-agency'].$post({ json: config }, init);
    },
    parseVoidResponse,
    'Impossible de mettre a jour la configuration.'
  );
