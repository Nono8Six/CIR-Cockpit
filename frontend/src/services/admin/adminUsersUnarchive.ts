import { safeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';
import { isRecord } from '@/utils/recordNarrowing';

export type UnarchiveUserResponse = {
  ok: true;
  user_id: string;
  archived: boolean;
};

const parseUnarchiveUserResponse = (payload: unknown): UnarchiveUserResponse => {
  if (!isRecord(payload)) {
    throw createAppError({ code: 'EDGE_INVALID_RESPONSE', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return payload as UnarchiveUserResponse;
};

export const adminUsersUnarchive = (userId: string) =>
  safeRpc(
    (api, init) => api.admin.users.$post({
      json: {
      action: 'unarchive',
      user_id: userId
      }
    }, init),
    parseUnarchiveUserResponse,
    "Impossible de reactiver l'utilisateur."
  );
