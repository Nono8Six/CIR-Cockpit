import { ResultAsync } from 'neverthrow';
import type { ConfigSaveProductInput } from 'shared/schemas/config.schema';

import type { AppError } from '@/services/errors/AppError';
import { safeRpc } from '@/services/api/safeRpc';

const parseVoidResponse = (): void => undefined;

export const saveProductConfig = (
  config: ConfigSaveProductInput
): ResultAsync<void, AppError> =>
  safeRpc(
    async (api, init) => api.config['save-product'].$post({ json: config }, init),
    parseVoidResponse,
    'Impossible de mettre a jour les parametres produit.'
  );
