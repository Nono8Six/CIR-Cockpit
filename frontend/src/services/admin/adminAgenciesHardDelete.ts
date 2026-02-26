import {
  adminAgenciesDeleteResponseSchema,
  type AdminAgenciesDeleteResponse
} from '../../../../shared/schemas/api-responses';
import { safeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';

export type AdminAgencyDeleteResponse = AdminAgenciesDeleteResponse;

const parseAdminAgencyDeleteResponse = (payload: unknown): AdminAgencyDeleteResponse => {
  const parsed = adminAgenciesDeleteResponseSchema.safeParse(payload);
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

export const adminAgenciesHardDelete = (agencyId: string) =>
  safeRpc(
    (api, init) => api.admin.agencies.$post({
      json: {
      action: 'hard_delete',
      agency_id: agencyId
      }
    }, init),
    parseAdminAgencyDeleteResponse,
    "Impossible de supprimer l'agence."
  );
