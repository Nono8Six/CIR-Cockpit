import {
  cockpitPhoneLookupResponseSchema,
  type CockpitPhoneLookupInput,
  type CockpitPhoneLookupResponse
} from '../../../../shared/schemas/interaction/cockpit.schema';


import { createAppError } from '@/services/errors/AppError';
import { invokeTrpc } from '@/services/api/invokeTrpc';

const parseCockpitPhoneLookupResponse = (payload: unknown): CockpitPhoneLookupResponse => {
  const parsed = cockpitPhoneLookupResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  return parsed.data;
};

export const getCockpitPhoneLookup = (
  input: CockpitPhoneLookupInput
): Promise<CockpitPhoneLookupResponse> =>
  invokeTrpc(
    (api, options) => api.cockpit['phone-lookup'].query(input, options),
    parseCockpitPhoneLookupResponse,
    "Impossible de rechercher l'historique du numero."
  );
