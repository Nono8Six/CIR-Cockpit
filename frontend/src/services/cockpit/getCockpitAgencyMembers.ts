import {
  cockpitAgencyMembersResponseSchema,
  type CockpitAgencyMembersInput,
  type CockpitAgencyMembersResponse
} from 'shared/schemas/cockpit.schema';

import { createAppError } from '@/services/errors/AppError';
import { invokeTrpc } from '@/services/api/safeTrpc';

const parseCockpitAgencyMembersResponse = (payload: unknown): CockpitAgencyMembersResponse => {
  const parsed = cockpitAgencyMembersResponseSchema.safeParse(payload);
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

export const getCockpitAgencyMembers = (
  input: CockpitAgencyMembersInput
): Promise<CockpitAgencyMembersResponse> =>
  invokeTrpc(
    (api, options) => api.cockpit['agency-members'].query(input, options),
    parseCockpitAgencyMembersResponse,
    "Impossible de charger les membres de l'agence."
  );
