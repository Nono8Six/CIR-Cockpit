import {
  adminAgenciesAgencyResponseSchema,
  type AdminAgenciesAgencyResponse
} from '../../../../shared/schemas/api-responses';
import { safeRpc } from '@/services/api/safeRpc';
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

export const adminAgenciesUnarchive = (agencyId: string) =>
  safeRpc(
    (api, init) => api.admin.agencies.$post({
      json: {
      action: 'unarchive',
      agency_id: agencyId
      }
    }, init),
    parseAdminAgencyResponse,
    "Impossible de reactiver l'agence."
  );
