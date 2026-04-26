import {
  adminAgenciesAgencyResponseSchema,
  type AdminAgenciesAgencyResponse
} from 'shared/schemas/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

export type AdminAgencyResponse = AdminAgenciesAgencyResponse;

const parseAdminAgencyResponse = (payload: unknown): AdminAgencyResponse => {
  const parsed = adminAgenciesAgencyResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'EDGE_INVALID_RESPONSE',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }
  return parsed.data;
};

export const adminAgenciesRename = (agencyId: string, name: string) =>
  safeTrpc(
    (api, options) => api.admin.agencies.mutate({
      action: 'rename',
      agency_id: agencyId,
      name
      }, options),
    parseAdminAgencyResponse,
    "Impossible de renommer l'agence."
  );
