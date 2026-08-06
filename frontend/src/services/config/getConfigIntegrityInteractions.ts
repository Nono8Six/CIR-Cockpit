import {
  configIntegrityInteractionsResponseSchema,
  type ConfigIntegrityInteractionsResponse
} from '../../../../shared/schemas/system/api-responses';
import type { ConfigIntegrityInteractionsInput } from '../../../../shared/schemas/system/config.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';;

export const getConfigIntegrityInteractions = (
  input: ConfigIntegrityInteractionsInput
): Promise<ConfigIntegrityInteractionsResponse> =>
  invokeTrpc(
    (api, options) => api.config['integrity-interactions'].query(input, options),
    configIntegrityInteractionsResponseSchema,
    'Impossible de charger les interactions concernées.'
  );
