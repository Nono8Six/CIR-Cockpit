import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import type { ResultAsync } from 'neverthrow';

import { dataProfileResponseSchema } from '../../../../shared/schemas/system/api-responses';

import { safeAsync } from '@/lib/result';
import { invokeTrpc } from '@/services/api/invokeTrpc';
import { type AppError } from '@/services/errors/AppError';
import { normalizeError } from '@/services/errors/normalizeError';

const parseProfileResponse = createTrpcResponseParser(
  dataProfileResponseSchema,
  (): void => undefined,
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

export const setProfileActiveAgencyId = (agencyId: string | null): ResultAsync<void, AppError> =>
  safeAsync(
    invokeTrpc(
      (api, options) => api.data.profile.mutate({
        action: 'set_active_agency',
        agency_id: agencyId
      }, options),
      parseProfileResponse,
      "Impossible de changer d'agence."
    ),
    (error) => normalizeError(error, "Impossible de changer d'agence.")
  );
