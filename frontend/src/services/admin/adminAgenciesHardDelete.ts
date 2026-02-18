import { safeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';
import { isRecord } from '@/utils/recordNarrowing';

export type AdminAgencyDeleteResponse = {
  ok: true;
  agency_id: string;
};

const parseAdminAgencyDeleteResponse = (payload: unknown): AdminAgencyDeleteResponse => {
  if (!isRecord(payload)) {
    throw createAppError({ code: 'EDGE_INVALID_RESPONSE', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return payload as AdminAgencyDeleteResponse;
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
