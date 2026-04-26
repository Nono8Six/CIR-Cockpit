import type { ResultAsync } from 'neverthrow';

import { dataProfileResponseSchema } from 'shared/schemas/api-responses';

import { safeAsync } from '@/lib/result';
import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { normalizeError } from '@/services/errors/normalizeError';

const parseProfileResponse = (payload: unknown): void => {
  const parsed = dataProfileResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }
};

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
