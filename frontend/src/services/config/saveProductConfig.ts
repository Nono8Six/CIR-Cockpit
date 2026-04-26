import { ResultAsync } from 'neverthrow';
import type { ConfigSaveProductInput } from 'shared/schemas/config.schema';

import type { AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

const parseVoidResponse = (): void => undefined;

export const saveProductConfig = (
  config: ConfigSaveProductInput
): ResultAsync<void, AppError> =>
  safeTrpc(
    async (api, options) => api.config['save-product'].mutate(config, options),
    parseVoidResponse,
    'Impossible de mettre a jour les parametres produit.'
  );
