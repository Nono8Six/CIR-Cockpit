import { safeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';
import { isRecord } from '@/utils/recordNarrowing';

export type AdminAgencyResponse = {
  ok: true;
  agency: {
    id: string;
    name: string;
    archived_at: string | null;
  };
};

const parseAdminAgencyResponse = (payload: unknown): AdminAgencyResponse => {
  if (!isRecord(payload)) {
    throw createAppError({ code: 'EDGE_INVALID_RESPONSE', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return payload as AdminAgencyResponse;
};

export const adminAgenciesArchive = (agencyId: string) =>
  safeRpc(
    (api, init) => api.admin.agencies.$post({
      json: {
      action: 'archive',
      agency_id: agencyId
      }
    }, init),
    parseAdminAgencyResponse,
    "Impossible d'archiver l'agence."
  );
