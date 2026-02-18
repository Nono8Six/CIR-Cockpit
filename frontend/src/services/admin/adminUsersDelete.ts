import { safeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';
import { isRecord } from '@/utils/recordNarrowing';

export type DeleteUserResponse = {
  ok: true;
  user_id: string;
  deleted: boolean;
  anonymized_interactions?: number;
  anonymized_agency_ids?: string[];
  anonymized_orphan_interactions?: number;
};

const parseDeleteUserResponse = (payload: unknown): DeleteUserResponse => {
  if (!isRecord(payload)) {
    throw createAppError({ code: 'EDGE_INVALID_RESPONSE', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return payload as DeleteUserResponse;
};

export const adminUsersDelete = (userId: string) =>
  safeRpc(
    (api, init) => api.admin.users.$post({
      json: {
      action: 'delete',
      user_id: userId
      }
    }, init),
    parseDeleteUserResponse,
    "Impossible de supprimer l'utilisateur."
  );
